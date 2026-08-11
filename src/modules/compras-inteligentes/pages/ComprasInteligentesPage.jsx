import { useMemo, useState } from "react";
import { MetricGrid, ModuleHeader, OperationModal } from "../../../components/operations/OperationsUI";
import { listImportDrafts } from "../../catalogo-inteligente/services/catalogoImportDraft.service";
import { listStock } from "../../estoque-inteligente/services/estoque.service";
import { resolveConsolidatedPurchaseNeed } from "../../producao-pcp/services/producao.service";
import useComprasInteligentes from "../hooks/useComprasInteligentes";
import { PURCHASE_STATUSES } from "../services/compras.service";
import "../compras-inteligentes.css";
import "../fase22.css";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const empty = () => ({ supplier: null, data: new Date().toISOString().slice(0, 10), previsao: "", condicaoPagamento: "28 dias", transportadora: "", frete: 0, desconto: 0, observacoes: "", status: "Rascunho", items: [] });
const needKey = (empresaId) => `cunha:pcp:purchase-needs:${String(empresaId)}`;
const readNeeds = (empresaId) => { try { return JSON.parse(sessionStorage.getItem(needKey(empresaId)) || "[]").filter((need) => String(need.empresaId) === String(empresaId)); } catch { return []; } };

export default function ComprasInteligentesPage({ empresaId, userId }) {
  return <ComprasWorkspace key={String(empresaId)} empresaId={empresaId} userId={userId} />;
}

function ComprasWorkspace({ empresaId, userId }) {
  const manager = useComprasInteligentes({ empresaId, userId });
  const [modal, setModal] = useState(false);
  const [order, setOrder] = useState(empty);
  const [selected, setSelected] = useState(null);
  const [selectedHistorical, setSelectedHistorical] = useState(null);
  const [editingHistorical, setEditingHistorical] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [needs, setNeeds] = useState(() => readNeeds(empresaId));
  const catalog = useMemo(() => listImportDrafts(empresaId, userId).flatMap((draft) => draft.products || []).filter((product) => product.selected), [empresaId, userId]);

  async function removeResolvedNeed(need) {
    await resolveConsolidatedPurchaseNeed({ empresaId, userId, need });
    const next = readNeeds(empresaId).filter((item) => (item.key || item.materialId) !== (need.key || need.materialId));
    sessionStorage.setItem(needKey(empresaId), JSON.stringify(next));
    setNeeds(next);
  }

  async function addProduct(product) {
    const stock = await listStock(empresaId);
    const stockItem = stock.find((item) => String(item.produtoId) === String(product.id) || item.codigo === (product.supplierCode || product.marketCode));
    setOrder((current) => ({ ...current, items: [...current.items, { id: crypto.randomUUID(), produtoId: product.id, estoqueId: stockItem?.id || null, codigo: product.supplierCode || product.marketCode || product.id, descricao: product.name || product.description, liga: product.technical?.alloy || "", tempera: product.technical?.temper || "", dimensao: product.technical?.dimensions?.originalText || "", peso: product.technical?.weightPerPiece || 0, quantidade: 1, unidade: product.commercial?.salesUnit || "kg", valorUnitario: product.commercial?.costPerKg || product.commercial?.pricePerPiece || 0, dadosCatalogo: product }] }));
  }
  function reviewNeed(need) {
    setOrder({ ...empty(), observacoes: need.context, pcpNeedId: need.key || need.materialId, items: [{ id: crypto.randomUUID(), produtoId: need.productId || need.materialId, estoqueId: need.stockId || null, codigo: need.code || need.materialId, descricao: need.description, liga: "", tempera: "", dimensao: "", peso: 0, quantidade: need.quantity, unidade: need.unit || "kg", valorUnitario: 0, dadosCatalogo: { mrpKey: need.key || null, pcpOrderIds: need.orderIds || [need.orderId], pcpOrderNumbers: need.orderNumbers || [need.orderNumber], clients: need.clients || [need.client].filter(Boolean), priority: need.priority, needDate: need.needDate || null } }] });
    setModal(true);
  }
  async function save() {
    if (!order.supplier || !order.items.length) return setFeedback("Selecione um fornecedor real e revise os itens.");
    if (!window.confirm("Confirmar gravação deste pedido de compra? Nenhum pedido é criado automaticamente pelo PCP.")) return;
    try {
      await manager.save(order);
      if (order.pcpNeedId) {
        const need = needs.find((item) => (item.key || item.materialId) === order.pcpNeedId);
        if (need) await removeResolvedNeed(need);
      }
      setModal(false); setOrder(empty()); setFeedback("Pedido salvo após confirmação humana.");
    } catch (error) { setFeedback(`Não foi possível concluir o tratamento da necessidade. Ela foi mantida na fila: ${error.message}`); }
  }
  async function removeHistorical(purchase) {
    const date = String(purchase.data_compra || purchase.created_at || "—").slice(0, 10);
    const quantity = Number(purchase.kilos || purchase.quantidade || 0).toLocaleString("pt-BR");
    const message = `Excluir a compra histórica?\n\nFornecedor: ${purchase.fornecedor || "—"}\nProduto: ${purchase.produto || purchase.material || "—"}\nData: ${date}\nQuantidade: ${quantity}\n\nEsta ação excluirá somente o registro histórico de compra.`;
    if (!window.confirm(message)) return;
    try { await manager.removeHistorical(purchase); setFeedback("Compra histórica excluída."); }
    catch (error) { setFeedback(`Não foi possível excluir a compra histórica: ${error.message}`); }
  }
  const metrics = [
    { label: "Compras do período", value: manager.metrics.count, detail: "pedidos persistentes", icon: "▥" },
    { label: "Necessidades do PCP", value: needs.length, detail: "aguardando revisão humana", icon: "⚙", tone: needs.length ? "amber" : undefined },
    { label: "Valor comprado", value: money(manager.metrics.value), detail: "total dos pedidos", icon: "R$", tone: "green" },
    { label: "Peso comprado", value: `${manager.metrics.weight.toLocaleString("pt-BR")} kg`, detail: "itens cadastrados", icon: "⚖" },
    { label: "Ticket médio", value: money(manager.metrics.ticket), detail: "por pedido", icon: "◇" },
    { label: "Fornecedor principal", value: manager.metrics.main, detail: "maior valor comprado", icon: "▦" },
    { label: "Pedidos em aberto", value: manager.metrics.open, detail: "não concluídos", icon: "◎", tone: "amber" },
    { label: "Recebimentos pendentes", value: manager.metrics.pending, detail: "comprados e parciais", icon: "!", tone: "rose" },
  ];
  return <main className="ops-page smart-purchases">
    <ModuleHeader eyebrow="Suprimentos" title="Compras Inteligentes" description="Pedidos, cotações, aprovações, recebimentos e financeiro em um fluxo persistente." actionLabel="Novo pedido" onAction={() => { setOrder(empty()); setModal(true); }} />
    {feedback && <div className="ops-status-panel">{feedback}<button onClick={() => setFeedback("")}>×</button></div>}
    {manager.errors.orders && <div className="ops-status-panel">Pedidos de compra indisponíveis: {manager.errors.orders}</div>}
    {manager.errors.history && <div className="ops-status-panel">Compras históricas indisponíveis: {manager.errors.history}</div>}
    {manager.errors.suppliers && <div className="ops-status-panel">Fornecedores indisponíveis: {manager.errors.suppliers}. Os pedidos permanecem visíveis.</div>}
    {manager.loading.orders && <div className="ops-status-panel">Carregando pedidos de compra...</div>}
    {manager.loading.history && <div className="ops-status-panel">Carregando compras históricas...</div>}
    <MetricGrid items={metrics} />
    <PurchaseNeeds needs={needs} onReview={reviewNeed} onDismiss={async (need) => { if (!window.confirm("Confirmar que esta necessidade foi tratada e removê-la da fila?")) return; try { await removeResolvedNeed(need); setFeedback("Necessidade tratada e sincronizada com a OP."); } catch (error) { setFeedback(`A necessidade não foi removida: ${error.message}`); } }} />
    <section className="ops-panel"><div className="ops-panel__header"><h2>Pedidos de compra</h2><span>{manager.orders.length} pedido(s)</span></div><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Número</th><th>Fornecedor</th><th>Status</th><th>Data</th><th>Previsão</th><th>Itens</th><th>Total</th><th>Ações</th></tr></thead><tbody>{manager.orders.map((row) => <tr key={row.id}><td><strong>{row.numero}</strong></td><td>{row.fornecedor.nome}</td><td><select value={row.status} onChange={(event) => { const status = event.target.value; if (window.confirm(`Confirmar mudança para ${status}?`)) manager.status(row, status); }}>{PURCHASE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></td><td>{row.data}</td><td>{row.previsao || "—"}</td><td>{row.items.length}</td><td>{money(row.valorTotal)}</td><td><button onClick={() => setSelected(row)}>Detalhes</button></td></tr>)}</tbody></table></div></section>
    <HistoricalPurchases rows={manager.historicalPurchases} onSelect={setSelectedHistorical} onEdit={setEditingHistorical} onDelete={removeHistorical} />
    {modal && <OrderModal order={order} setOrder={setOrder} suppliers={manager.suppliers} catalog={catalog} addProduct={addProduct} onClose={() => setModal(false)} onSave={save} />}
    {selected && <OrderDetails order={selected} manager={manager} suppliers={manager.suppliers} onClose={() => setSelected(null)} onFeedback={setFeedback} />}
    {selectedHistorical && <HistoricalPurchaseDetails purchase={selectedHistorical} onClose={() => setSelectedHistorical(null)} />}
    {editingHistorical && <HistoricalPurchaseEditor purchase={editingHistorical} manager={manager} onClose={() => setEditingHistorical(null)} onFeedback={setFeedback} />}
  </main>;
}

function HistoricalPurchases({ rows, onSelect, onEdit, onDelete }) {
  return <section className="ops-panel"><div className="ops-panel__header"><div><h2>Compras históricas</h2><small>Fonte legada. Correções exigem confirmação e não executam ações operacionais.</small></div><span>{rows.length} registro(s)</span></div>{!rows.length ? <p>Nenhuma compra histórica visível para esta empresa.</p> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Origem</th><th>Data</th><th>Fornecedor</th><th>Produto</th><th>Quantidade</th><th>Valor disponível</th><th>Ações</th></tr></thead><tbody>{rows.map((row) => <tr key={`legacy:${row.id}`}><td><strong>Compra histórica</strong></td><td>{String(row.data_compra || row.created_at || "—").slice(0, 10)}</td><td>{row.fornecedor || "—"}</td><td>{row.produto || row.material || "—"}</td><td>{Number(row.kilos || row.quantidade || 0).toLocaleString("pt-BR")}</td><td>{money(row.valor ?? row.valor_total ?? row.preco_compra ?? 0)}</td><td><div className="ops-actions"><button onClick={() => onSelect(row)}>Consultar</button><button onClick={() => onEdit(row)}>Editar</button><button className="danger" onClick={() => onDelete(row)}>Excluir</button></div></td></tr>)}</tbody></table></div>}</section>;
}

function HistoricalPurchaseDetails({ purchase, onClose }) {
  const fields = [["Origem", "Compra histórica · estrutura legada"], ["Data", String(purchase.data_compra || purchase.created_at || "—").slice(0, 10)], ["Fornecedor", purchase.fornecedor || "—"], ["Produto", purchase.produto || purchase.material || "—"], ["Quantidade", Number(purchase.kilos || purchase.quantidade || 0).toLocaleString("pt-BR")], ["Valor disponível", money(purchase.valor ?? purchase.valor_total ?? purchase.preco_compra ?? 0)]];
  return <OperationModal title="Consulta de compra histórica" onClose={onClose} onSubmit={onClose} submitLabel="Fechar"><div className="ops-preview ops-field--wide"><strong>Registro somente leitura.</strong> Não é permitido editar, receber, movimentar estoque ou gerar financeiro a partir desta visualização.</div>{fields.map(([label, value]) => <div className="ops-field" key={label}><span>{label}</span><strong>{value}</strong></div>)}</OperationModal>;
}

function HistoricalPurchaseEditor({ purchase, manager, onClose, onFeedback }) {
  const [draft, setDraft] = useState(() => ({ dataCompra: String(purchase.data_compra || "").slice(0, 10), fornecedor: purchase.fornecedor || "", produto: purchase.produto || "", kilos: purchase.kilos ?? "", valor: purchase.valor ?? "" }));
  const [saving, setSaving] = useState(false);
  const change = (field) => (event) => setDraft((current) => ({ ...current, [field]: event.target.value }));
  async function saveHistorical() {
    if (!draft.dataCompra) return onFeedback("Informe a data da compra histórica.");
    if (!draft.fornecedor.trim()) return onFeedback("Informe o fornecedor da compra histórica.");
    if (!draft.produto.trim()) return onFeedback("Informe o produto da compra histórica.");
    if (!Number.isFinite(Number(draft.kilos)) || Number(draft.kilos) <= 0) return onFeedback("Informe uma quantidade maior que zero.");
    if (!Number.isFinite(Number(draft.valor)) || Number(draft.valor) < 0) return onFeedback("Informe um valor válido, maior ou igual a zero.");
    if (!window.confirm("Confirmar correção desta compra histórica? Nenhuma movimentação operacional será executada.")) return;
    setSaving(true);
    try { await manager.editHistorical(purchase, draft); onFeedback("Compra histórica atualizada com segurança."); onClose(); }
    catch (error) { onFeedback(`Não foi possível atualizar a compra histórica: ${error.message}`); }
    finally { setSaving(false); }
  }
  return <OperationModal title="Editar compra histórica" editing onClose={onClose} onSubmit={saveHistorical} submitLabel="Salvar correção" disabled={saving}><div className="ops-preview ops-field--wide"><strong>Esta alteração corrige somente o registro histórico.</strong> Nenhuma movimentação operacional será executada.</div><label className="ops-field"><span>Data</span><input type="date" value={draft.dataCompra} onChange={change("dataCompra")} /></label><label className="ops-field"><span>Fornecedor</span><input value={draft.fornecedor} onChange={change("fornecedor")} /></label><label className="ops-field"><span>Produto</span><input value={draft.produto} onChange={change("produto")} /></label><label className="ops-field"><span>Quantidade/peso</span><input type="number" min="0.0001" step="any" value={draft.kilos} onChange={change("kilos")} /></label><label className="ops-field"><span>Valor</span><input type="number" min="0" step="0.01" value={draft.valor} onChange={change("valor")} /></label><div className="ops-preview ops-field--wide">Comissão, empresa, autoria e identificador permanecem inalterados.</div></OperationModal>;
}

function PurchaseNeeds({ needs, onReview, onDismiss }) {
  return <section className="ops-panel purchase-needs"><div className="ops-panel__header"><div><h2>Necessidades recebidas do PCP</h2><small>O encaminhamento não cria pedido automaticamente.</small></div><span>{needs.length} pendente(s)</span></div>{!needs.length ? <p>Integração sem pendências: nenhuma necessidade de material aguarda revisão.</p> : needs.map((need) => <article key={need.key || need.materialId}><div><small>{need.orderNumber} · prioridade {need.priority}</small><strong>{need.description}</strong><span>Faltante {need.quantity} {need.unit} · necessidade {need.needDate || "Data não definida"} · cliente {need.client || "não informado"}</span><p>{need.context}</p></div><div><button onClick={() => onReview(need)}>Revisar e preparar pedido</button><button className="secondary" onClick={() => onDismiss(need)}>Remover da fila</button></div></article>)}</section>;
}

function OrderModal({ order, setOrder, suppliers, catalog, addProduct, onClose, onSave }) {
  return <OperationModal title={order.pcpNeedId ? "Revisar necessidade do PCP" : "Pedido de compra"} onClose={onClose} onSubmit={onSave} submitLabel="Salvar pedido"><label className="ops-field ops-field--wide"><span>Fornecedor real</span><select value={order.supplier?.id || ""} onChange={(event) => setOrder((current) => ({ ...current, supplier: suppliers.find((supplier) => String(supplier.id) === event.target.value) || null }))}><option value="">Selecione</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.nome}</option>)}</select></label>{[["data", "Data", "date"], ["previsao", "Previsão", "date"], ["condicaoPagamento", "Condição de pagamento"], ["transportadora", "Transportadora"], ["frete", "Frete", "number"], ["desconto", "Desconto", "number"]].map(([key, label, type]) => <label className="ops-field" key={key}><span>{label}</span><input type={type || "text"} value={order[key]} onChange={(event) => setOrder((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label className="ops-field ops-field--wide"><span>Observações e contexto</span><textarea value={order.observacoes} onChange={(event) => setOrder((current) => ({ ...current, observacoes: event.target.value }))} /></label>{order.pcpNeedId && <div className="ops-preview">Item recebido do PCP. Revise fornecedor, quantidade, preço e condições antes de confirmar.</div>}<section className="purchase-catalog"><h3>Itens reais do Catálogo Inteligente</h3>{catalog.slice(0, 12).map((product) => <button type="button" key={product.id} onClick={() => addProduct(product)}>{product.supplierCode || product.name}</button>)}</section><section className="purchase-items">{order.items.map((item) => <article key={item.id}><div><strong>{item.codigo} · {item.descricao}</strong><small>{item.liga} {item.tempera} · {item.estoqueId ? "vinculado ao estoque" : "sem vínculo de estoque"}</small></div><input type="number" min="0.0001" step="any" value={item.quantidade} onChange={(event) => setOrder((current) => ({ ...current, items: current.items.map((candidate) => candidate.id === item.id ? { ...candidate, quantidade: event.target.value } : candidate) }))} /><input type="number" min="0" step="any" value={item.valorUnitario} onChange={(event) => setOrder((current) => ({ ...current, items: current.items.map((candidate) => candidate.id === item.id ? { ...candidate, valorUnitario: event.target.value } : candidate) }))} /></article>)}</section></OperationModal>;
}

function OrderDetails({ order, manager, suppliers, onClose, onFeedback }) {
  const [quote, setQuote] = useState({ supplier: null, value: "", days: "", costKg: "", notes: "" });
  const [count, setCount] = useState(1); const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  return <div className="purchase-details"><header><div><small>{order.status}</small><h2>{order.numero}</h2><p>{order.fornecedor.nome} · {money(order.valorTotal)}</p></div><button onClick={onClose}>×</button></header><section><h3>Recebimento e estoque</h3>{order.items.map((item) => <article key={item.id}><span>{item.codigo} · comprado {item.quantidade} · recebido {item.recebida}</span><button disabled={!item.estoqueId || !["Comprado", "Recebido parcialmente"].includes(order.status) || item.recebida >= item.quantidade} onClick={async () => { const quantity = window.prompt("Quantidade recebida", String(item.quantidade - item.recebida)); if (quantity && window.confirm("Confirmar recebimento e entrada no estoque?")) { try { await manager.receive(item.id, quantity); onFeedback("Recebimento e estoque registrados."); onClose(); } catch (error) { onFeedback(error.message); } } }}>Receber</button></article>)}</section><section><h3>Cotações comparativas</h3>{order.quotes.map((item) => <p key={item.id}>{item.fornecedor_snapshot.nome} · {money(item.valor_total)} · {item.prazo_dias} dias · {money(item.custo_kg)}/kg</p>)}<select value={quote.supplier?.id || ""} onChange={(event) => setQuote((current) => ({ ...current, supplier: suppliers.find((supplier) => String(supplier.id) === event.target.value) || null }))}><option value="">Fornecedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.nome}</option>)}</select>{[["value", "Valor"], ["days", "Prazo"], ["costKg", "Custo/kg"]].map(([key, label]) => <input key={key} type="number" placeholder={label} value={quote[key]} onChange={(event) => setQuote((current) => ({ ...current, [key]: event.target.value }))} />)}<button onClick={async () => { if (quote.supplier) { await manager.quote(order.id, quote); onClose(); } }}>Adicionar cotação</button></section><section><h3>Financeiro corporativo</h3><input type="number" min="1" value={count} onChange={(event) => setCount(event.target.value)} /><input type="date" value={due} onChange={(event) => setDue(event.target.value)} /><button disabled={!['Aprovado', 'Comprado'].includes(order.status)} onClick={async () => { if (window.confirm("Preparar parcelas para contas a pagar?")) { await manager.installments(order, count, due); onFeedback("Parcelas preparadas."); onClose(); } }}>Preparar parcelas</button></section><section><h3>Histórico</h3>{order.history.map((event) => <p key={event.id}><strong>{event.tipo}</strong> · {event.descricao}</p>)}</section></div>;
}
