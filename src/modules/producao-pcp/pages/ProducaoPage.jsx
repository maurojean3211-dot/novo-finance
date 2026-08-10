import { useMemo, useState } from "react";
import { EmptyState, FeedbackBanner, MetricGrid, ModuleHeader, OperationModal } from "../../../components/operations/OperationsUI";
import useProducao from "../hooks/useProducao";
import {
  PRODUCTION_STATUSES, addMaterial, budgetDraft, changeOrderStatus, consumeMaterial,
  createOrder, finishProduct, materialAvailability, preparePurchaseNeed, queuePurchaseNeed,
  recordProduction, releaseMaterial, reserveMaterial, reverseConsumption, saleDraft, saveAdditionalCost,
} from "../services/producao.service";
import "../producao.css";
import "../fase22.css";
import "../fase23.css";

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const number = (value) => Number(value || 0);
const money = (value) => value === null || value === undefined ? "Dados insuficientes" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const emptyOrder = () => ({ client: "", product: "", description: "", alloy: "", temper: "", dimension: "", quantity: "", unit: "kg", weight: "", start: today(), end: "", priority: "Média", responsible: "", notes: "" });
const emptyFilters = { status: "", priority: "", client: "", start: "", end: "" };

export default function ProducaoPage({ empresaId, userId, onNavigate }) {
  const manager = useProducao(empresaId);
  const [tab, setTab] = useState("orders");
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const current = selected ? manager.orders.find((item) => item.id === selected.id) || selected : null;
  const stockById = useMemo(() => new Map(manager.stock.map((item) => [item.id, item])), [manager.stock]);
  const filtered = useMemo(() => manager.orders.filter((item) =>
    (!filters.status || item.status === filters.status) &&
    (!filters.priority || item.prioridade === filters.priority) &&
    (!filters.client || String(item.cliente_nome || "").toLocaleLowerCase("pt-BR").includes(filters.client.toLocaleLowerCase("pt-BR"))) &&
    (!filters.start || !item.data_prevista_fim || item.data_prevista_fim >= filters.start) &&
    (!filters.end || !item.data_prevista_inicio || item.data_prevista_inicio <= filters.end)
  ), [filters, manager.orders]);

  async function run(work, message) {
    setBusy(true); setFeedback(null);
    try { await work(); setFeedback({ type: "success", message }); await manager.refresh(); return true; }
    catch (error) { setFeedback({ type: "error", message: error.message || "Operação não concluída." }); return false; }
    finally { setBusy(false); }
  }
  async function save() {
    if (!form.product || number(form.quantity) <= 0) return setFeedback({ type: "error", message: "Produto e quantidade planejada são obrigatórios." });
    if (!window.confirm("Confirmar criação desta Ordem de Produção?")) return;
    if (await run(() => createOrder({ empresaId, userId, order: form }), "Ordem de Produção criada após confirmação humana.")) setForm(null);
  }

  const metrics = [
    { label: "OPs abertas", value: manager.open.length, detail: "planejamento e execução", icon: "▤" },
    { label: "Em produção", value: manager.inProduction.length, detail: "execução atual", icon: "▶", tone: "green" },
    { label: "Aguardando material", value: manager.waitingMaterial.length, detail: "bloqueio confirmado", icon: "▧", tone: "amber" },
    { label: "Atrasadas", value: manager.delayed.length, detail: "condição derivada", icon: "!", tone: "rose" },
    { label: "Concluídas", value: manager.completed.length, detail: "histórico real", icon: "✓", tone: "green" },
    { label: "Qtd. planejada", value: manager.planned.toLocaleString("pt-BR"), detail: "todas as OPs", icon: "#" },
    { label: "Qtd. produzida", value: manager.produced.toLocaleString("pt-BR"), detail: "apontamentos", icon: "↗" },
    { label: "Peso planejado", value: `${manager.plannedWeight.toLocaleString("pt-BR")} kg`, detail: "carga prevista", icon: "⚖" },
    { label: "Peso produzido", value: `${manager.producedWeight.toLocaleString("pt-BR")} kg`, detail: "produção real", icon: "◎" },
    { label: "Perdas", value: manager.losses.toLocaleString("pt-BR"), detail: "refugo apontado", icon: "×", tone: "amber" },
    { label: "Materiais faltantes", value: manager.missing.length, detail: "necessidade de compra", icon: "▧", tone: "rose" },
    { label: "Custo previsto aberto", value: money(manager.plannedOpenCost), detail: manager.plannedOpenPartial ? `Dados parciais · ${manager.knownPlannedCount}/${manager.open.length} OPs` : "todas as OPs abertas", icon: "R$", tone: manager.plannedOpenPartial ? "amber" : undefined },
    { label: "Custo realizado aberto", value: money(manager.actualOpenCost), detail: manager.actualOpenPartial ? `Dados parciais · ${manager.knownActualCount}/${manager.open.length} OPs` : "materiais e custos manuais", icon: "◇", tone: manager.actualOpenPartial ? "amber" : undefined },
    { label: "Variação de custo", value: money(manager.openCostVariation), detail: manager.variationOpenPartial ? `Dados parciais · ${manager.knownDifferenceCount}/${manager.open.length} OPs` : "realizado menos previsto", icon: "↕", tone: manager.openCostVariation > 0 ? "rose" : undefined },
    { label: "Acima do previsto", value: manager.overBudget, detail: manager.variationOpenPartial ? "contagem parcial das OPs abertas" : "OPs abertas com variação positiva", icon: "!", tone: manager.overBudget ? "rose" : undefined },
  ];
  return <main className="ops-page production-page">
    <ModuleHeader eyebrow="Operação industrial" title="Produção e PCP" description="Ordens, materiais, apontamentos e planejamento conectados ao estoque real." actionLabel="Nova OP" onAction={() => setForm(emptyOrder())} />
    <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
    {manager.error && <div className="ops-status-panel">{manager.error} Dados insuficientes: as migrations locais de Produção/PCP precisam estar disponíveis no ambiente.</div>}
    {manager.loading && <div className="ops-status-panel">Carregando Produção e PCP...</div>}
    <MetricGrid items={metrics} />
    <nav className="production-tabs">{[["orders", "Ordens de Produção"], ["pcp", "PCP"], ["origins", "Origens comerciais"]].map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>
    {tab === "orders" && <Orders orders={filtered} total={manager.orders.length} delayed={manager.delayed} filters={filters} setFilters={setFilters} onSelect={setSelected} />}
    {tab === "pcp" && <Pcp manager={manager} stockById={stockById} onSelect={setSelected} onNavigate={onNavigate} />}
    {tab === "origins" && <Origins manager={manager} onCreate={(draft) => setForm({ ...emptyOrder(), ...draft })} />}
    {form && <OrderModal form={form} setForm={setForm} onClose={() => setForm(null)} onSave={save} busy={busy} />}
    {current && <OrderDetails order={current} manager={manager} empresaId={empresaId} userId={userId} stockById={stockById} busy={busy} run={run} onClose={() => setSelected(null)} onNavigate={onNavigate} />}
  </main>;
}

function Orders({ orders, total, delayed, filters, setFilters, onSelect }) {
  const delayedIds = new Set(delayed.map((item) => item.id));
  const update = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  return <section className="ops-panel">
    <div className="production-filters">
      <select value={filters.status} onChange={update("status")}><option value="">Todos os status</option>{PRODUCTION_STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
      <select value={filters.priority} onChange={update("priority")}><option value="">Todas as prioridades</option>{["Baixa", "Média", "Alta", "Urgente"].map((item) => <option key={item}>{item}</option>)}</select>
      <input value={filters.client} onChange={update("client")} placeholder="Cliente" />
      <label><span>De</span><input type="date" value={filters.start} onChange={update("start")} /></label>
      <label><span>Até</span><input type="date" value={filters.end} onChange={update("end")} /></label>
      <button onClick={() => setFilters(emptyFilters)}>Limpar filtros</button>
    </div>
    <div className="ops-panel__header"><h2>Ordens de Produção</h2><span>{orders.length} de {total} registro(s)</span></div>
    {!orders.length ? <EmptyState title="Nenhuma OP encontrada" description={total ? "Revise os filtros informados." : "Crie manualmente ou revise uma origem comercial."} /> : <div className="ops-table-wrap"><table className="ops-table production-table"><thead><tr><th>OP</th><th>Produto</th><th>Cliente / origem</th><th>Prioridade</th><th>Previsão</th><th>Progresso</th><th>Status</th><th /></tr></thead><tbody>{orders.map((item) => { const progress = number(item.quantidade_planejada) ? Math.min(100, number(item.quantidade_produzida) / number(item.quantidade_planejada) * 100) : 0; return <tr key={item.id} className={delayedIds.has(item.id) ? "is-delayed" : ""}><td><strong>{item.numero_op}</strong>{delayedIds.has(item.id) && <small>Atrasada</small>}</td><td><strong>{item.produto}</strong><small>{[item.liga, item.tempera, item.dimensao].filter(Boolean).join(" · ")}</small></td><td>{item.cliente_nome || "—"}<small>{item.venda_id ? `Venda ${item.venda_id}` : item.orcamento_id ? "Orçamento aprovado" : "Manual"}</small></td><td>{item.prioridade}</td><td>{item.data_prevista_inicio || "—"} → {item.data_prevista_fim || "—"}</td><td><progress value={progress} max="100" /><small>{progress.toFixed(1)}% · {item.quantidade_produzida}/{item.quantidade_planejada} {item.unidade}</small></td><td>{item.status}</td><td><button onClick={() => onSelect(item)}>Gerenciar</button></td></tr>; })}</tbody></table></div>}
  </section>;
}

function Pcp({ manager, stockById, onSelect, onNavigate }) {
  return <section className="pcp-grid"><article><h2>Programação</h2>{manager.open.length ? [...manager.open].sort((a, b) => String(a.data_prevista_inicio || "9999").localeCompare(String(b.data_prevista_inicio || "9999"))).map((item) => <button key={item.id} onClick={() => onSelect(item)}><span>{item.numero_op} · {item.prioridade}</span><strong>{item.produto}</strong><small>{item.data_prevista_inicio || "Sem início"} → {item.data_prevista_fim || "Sem término"}</small></button>) : <p>Aguardando planejamento.</p>}</article><article><h2>Materiais faltantes</h2>{manager.missing.length ? manager.missing.map(({ order, material }) => { const availability = materialAvailability(material, stockById.get(material.estoque_id)); return <div key={material.id}><span>{order.numero_op} · {order.prioridade}</span><strong>{material.material}</strong><small>Faltante {availability.shortage} {material.unidade} · {availability.situation}</small><button onClick={() => onSelect(order)}>Revisar OP</button></div>; }) : <p>Nenhum bloqueio material identificado.</p>}<button className="pcp-purchase" onClick={() => onNavigate("compras")}>Abrir Compras Inteligentes →</button></article></section>;
}

function Origins({ manager, onCreate }) {
  return <section className="production-origins"><header><h2>Criação confirmada a partir de origem</h2><span>Nenhuma OP é criada automaticamente.</span></header>{manager.sales.map((sale) => <article key={`s-${sale.id}`}><div><small>Venda</small><strong>{sale.cliente_nome} · {sale.produto}</strong><span>{sale.kilos || 0} kg · {sale.data_venda}</span></div><button onClick={() => window.confirm("Preparar OP a partir desta venda? Você ainda revisará os dados antes de salvar.") && onCreate(saleDraft(sale))}>Preparar OP</button></article>)}{manager.budgets.map((budget) => <article key={`b-${budget.id}`}><div><small>Orçamento aprovado</small><strong>{budget.numero} · {budget.cliente_snapshot?.nome || "Cliente"}</strong><span>{budget.orcamento_itens?.length || 0} item(ns)</span></div><button onClick={() => window.confirm("Preparar OP a partir deste orçamento aprovado?") && onCreate(budgetDraft(budget))}>Preparar OP</button></article>)}{!manager.sales.length && !manager.budgets.length && <EmptyState title="Dados insuficientes" description="Nenhuma venda ou orçamento aprovado está disponível." />}</section>;
}

function OrderModal({ form, setForm, onClose, onSave, busy }) {
  const field = (key, label, type = "text") => <label className="ops-field" key={key}><span>{label}</span><input type={type} value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>;
  return <OperationModal title="Ordem de Produção" onClose={onClose} onSubmit={onSave} submitLabel="Confirmar OP" disabled={busy}>{field("client", "Cliente")}{field("product", "Produto")}{field("description", "Descrição")}{field("alloy", "Liga")}{field("temper", "Têmpera")}{field("dimension", "Dimensão")}{field("quantity", "Quantidade planejada", "number")}{field("unit", "Unidade")}{field("weight", "Peso planejado", "number")}{field("start", "Início previsto", "date")}{field("end", "Fim previsto", "date")}<label className="ops-field"><span>Prioridade</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{["Baixa", "Média", "Alta", "Urgente"].map((item) => <option key={item}>{item}</option>)}</select></label>{field("responsible", "Responsável")}<div className="ops-preview">Origem: {form.saleId ? `Venda ${form.saleId}` : form.budgetId ? "Orçamento aprovado" : "Manual"}. A origem não será alterada e a gravação depende de confirmação humana.</div></OperationModal>;
}

function ProductionEntryModal({ loss, onClose, onSubmit, busy }) {
  const [entry, setEntry] = useState({ quantity: "", weight: "", date: today(), time: nowTime(), reason: "Processo", notes: "" });
  const update = (key) => (event) => setEntry((current) => ({ ...current, [key]: event.target.value }));
  return <OperationModal title={loss ? "Registrar perda / refugo" : "Apontar produção"} onClose={onClose} onSubmit={() => onSubmit({ ...entry, type: loss ? "Perda" : "Produção", occurredAt: `${entry.date}T${entry.time}` })} submitLabel="Confirmar apontamento" disabled={busy}>
    <label className="ops-field"><span>{loss ? "Quantidade perdida" : "Quantidade produzida"}</span><input required min="0.0001" step="any" type="number" value={entry.quantity} onChange={update("quantity")} /></label>
    <label className="ops-field"><span>{loss ? "Peso perdido (kg)" : "Peso produzido (kg)"}</span><input min="0" step="any" type="number" value={entry.weight} onChange={update("weight")} /></label>
    <label className="ops-field"><span>Data</span><input required type="date" value={entry.date} onChange={update("date")} /></label>
    <label className="ops-field"><span>Hora</span><input required type="time" value={entry.time} onChange={update("time")} /></label>
    {loss && <label className="ops-field"><span>Motivo</span><select value={entry.reason} onChange={update("reason")}>{["Qualidade", "Processo", "Matéria-prima", "Equipamento", "Medida", "Outro"].map((item) => <option key={item}>{item}</option>)}</select></label>}
    <label className="ops-field ops-field--wide"><span>Observação</span><textarea value={entry.notes} onChange={update("notes")} /></label>
    <div className="ops-preview">O apontamento atualiza somente o progresso da OP. Nenhuma entrada de produto acabado será lançada automaticamente.</div>
  </OperationModal>;
}

function OrderDetails({ order, manager, empresaId, userId, stockById, busy, run, onClose, onNavigate }) {
  const [entryType, setEntryType] = useState(null);
  const [costForm, setCostForm] = useState(null);
  const costs = manager.costsByOrder.get(order.id);
  async function status(value) { if (window.confirm(`Confirmar mudança da ${order.numero_op} para ${value}?`)) await run(() => changeOrderStatus({ empresaId, userId, order, status: value }), `OP atualizada para ${value}.`); }
  async function add() { const id = window.prompt("ID do item de estoque (copie da lista exibida):", manager.stock[0]?.id || ""); const stock = manager.stock.find((item) => item.id === id); if (!stock) return; const quantity = window.prompt(`Quantidade prevista de ${stock.codigo}:`, "1"); if (quantity && window.confirm("Adicionar este material ao planejamento da OP?")) await run(() => addMaterial({ empresaId, userId, orderId: order.id, stock, quantity }), "Material adicionado ao planejamento."); }
  async function point(entry) { if (number(entry.quantity) <= 0) return; if (!window.confirm("Confirmar este apontamento imutável?")) return; if (await run(() => recordProduction({ empresaId, userId, order, entry }), entry.type === "Perda" ? "Perda registrada." : "Produção apontada.")) setEntryType(null); }
  return <div className="production-overlay"><aside className="production-details"><header><div><small>{order.status}</small><h2>{order.numero_op}</h2><p>{order.produto} · {order.cliente_nome || "produção interna"}</p></div><button onClick={onClose}>×</button></header>
    <section className="production-status"><select value={order.status} onChange={(event) => status(event.target.value)} disabled={busy}>{PRODUCTION_STATUSES.map((item) => <option key={item}>{item}</option>)}</select><button disabled={!['Em produção', 'Pausada'].includes(order.status) || busy} onClick={() => setEntryType("production")}>Apontar produção</button><button disabled={!['Em produção', 'Pausada'].includes(order.status) || busy} onClick={() => setEntryType("loss")}>Registrar perda</button></section>
    <section><div className="production-section-title"><h3>Materiais</h3><button onClick={add}>Adicionar do estoque</button></div><div className="production-stock-reference">{manager.stock.slice(0, 8).map((item) => <small key={item.id}>{item.id} · {item.codigo} · disponível {item.estoque_disponivel}</small>)}</div>{!(order.ordem_producao_materiais || []).length && <p>Dados insuficientes: nenhum material foi planejado para esta OP.</p>}{(order.ordem_producao_materiais || []).map((item) => <MaterialRow key={item.id} item={item} order={order} manager={manager} empresaId={empresaId} userId={userId} stock={stockById.get(item.estoque_id)} run={run} onNavigate={onNavigate} />)}</section>
    <ProductionCosts order={order} costs={costs} onAdd={() => setCostForm({ type: "Mão de obra", description: "", value: "", date: today(), notes: "" })} onEdit={(cost) => setCostForm({ id: cost.id, type: cost.tipo, description: cost.descricao, value: cost.valor, date: cost.data, notes: cost.observacoes || "" })} />
    <section><h3>Produto acabado</h3><button disabled={order.status !== "Concluída" || order.entrada_produto_acabado_em || busy} onClick={async () => { const stockId = window.prompt("ID do item de estoque do produto acabado:", manager.stock.find((item) => String(item.produto_id) === String(order.produto_id))?.id || ""); const quantity = window.prompt("Quantidade de entrada:", String(order.quantidade_produzida)); if (stockId && quantity && window.confirm("Confirmar entrada única do produto acabado?")) await run(() => finishProduct({ empresaId, orderId: order.id, stockId, quantity }), "Produto acabado recebido no estoque."); }}>{order.entrada_produto_acabado_em ? "Entrada já realizada" : "Confirmar entrada no estoque"}</button></section>
    <section><h3>Apontamentos e histórico</h3><div className="production-history">{[...(order.ordem_producao_apontamentos || []), ...(order.ordem_producao_historico || [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map((item) => <p key={item.id}><strong>{item.tipo}</strong> · {item.descricao || item.observacoes || "Evento registrado"}<small>{new Date(item.created_at).toLocaleString("pt-BR")}</small></p>)}</div></section>
    {entryType && <ProductionEntryModal loss={entryType === "loss"} onClose={() => setEntryType(null)} onSubmit={point} busy={busy} />}
    {costForm && <AdditionalCostModal cost={costForm} setCost={setCostForm} busy={busy} onClose={() => setCostForm(null)} onSave={async () => { if (!window.confirm("Confirmar este custo adicional manual? Nenhum lançamento financeiro será criado.")) return; if (await run(() => saveAdditionalCost({ empresaId, userId, orderId: order.id, cost: costForm }), costForm.id ? "Custo adicional atualizado." : "Custo adicional registrado.")) setCostForm(null); }} />}
  </aside></div>;
}

function DataValue({ label, value, tone }) { return <article className={tone || ""}><span>{label}</span><strong>{value}</strong></article>; }

function ProductionCosts({ order, costs, onAdd, onEdit }) {
  if (!costs) return <section><h3>Custos da Produção</h3><p>Dados insuficientes.</p></section>;
  const lossAlert = costs.lossRate !== null && costs.lossRate > 5;
  const end = order.data_prevista_fim ? new Date(`${order.data_prevista_fim}T12:00:00`) : null;
  const schedule = end ? Math.ceil((end - new Date()) / 86400000) : null;
  const losses = (order.ordem_producao_apontamentos || []).filter((item) => item.tipo === "Perda");
  return <section className="production-costs"><div className="production-section-title"><div><h3>Custos da Produção</h3><small>Valores reais disponíveis no estoque e custos informados manualmente.</small></div><button onClick={onAdd}>Adicionar custo manual</button></div>
    <div className="production-cost-metrics">
      <DataValue label="Custo previsto" value={money(costs.plannedMaterials)} />
      <DataValue label="Custo realizado" value={money(costs.totalActual)} />
      <DataValue label="Diferença" value={money(costs.difference)} tone={costs.difference > 0 ? "alert" : ""} />
      <DataValue label="Custo real/unidade" value={money(costs.actualUnit)} />
      <DataValue label="Progresso físico" value={costs.progress === null ? "Dados insuficientes" : `${costs.progress.toFixed(1)}%`} />
      <DataValue label="Perda/refugo" value={costs.lossRate === null ? "Dados insuficientes" : `${costs.lossRate.toFixed(1)}%`} tone={lossAlert ? "alert" : ""} />
    </div>
    <div className="production-efficiency"><span>Planejado x produzido: {costs.plannedQuantity} x {costs.producedQuantity} {order.unidade}</span><span>{schedule === null ? "Prazo: Dados insuficientes" : schedule < 0 ? `${Math.abs(schedule)} dia(s) em atraso` : `${schedule} dia(s) até a conclusão prevista`}</span><span>Variação: {costs.differencePercent === null ? "Dados insuficientes" : `${costs.differencePercent.toFixed(1)}%`}</span></div>
    <h4>Materiais</h4><div className="production-cost-list">{costs.materials.length ? costs.materials.map((item) => <article key={item.id}><div><strong>{item.material}</strong><small>Previsto {item.plannedQuantity} · consumido {item.consumedQuantity} {item.unidade}</small></div><span>{item.unitCost === null ? "Custo não informado" : `${money(item.unitCost)}/${item.unidade}`}</span><b>{money(item.actualCost)}</b></article>) : <p>Dados insuficientes: nenhum material planejado.</p>}</div>
    <h4>Custos adicionais manuais</h4><div className="production-cost-list">{(order.ordem_producao_custos || []).length ? order.ordem_producao_custos.map((item) => <article key={item.id}><div><strong>{item.tipo} · {item.descricao}</strong><small>{item.data} · {item.observacoes || "Sem observação"}</small></div><b>{money(item.valor)}</b><button onClick={() => onEdit(item)}>Editar</button></article>) : <p>Nenhum custo adicional informado.</p>}</div>
    <div className="production-cost-totals"><DataValue label="Materiais realizados" value={money(costs.actualMaterials)} /><DataValue label="Custos adicionais" value={money(costs.additional)} /><DataValue label="Custo total da OP" value={money(costs.totalActual)} /><DataValue label="Custo previsto/unidade" value={money(costs.plannedUnit)} /><DataValue label="Diferença unitária" value={money(costs.unitDifference)} /></div>
    <h4>Origem comercial — somente leitura</h4><div className="production-cost-totals"><DataValue label="Valor comercial" value={money(costs.commercialValue)} /><DataValue label="Margem estimada" value={money(costs.estimatedMargin)} /><DataValue label="Margem operacional" value={money(costs.operationalMargin)} /></div>
    <h4>Perdas e refugos</h4>{losses.length ? <div className="production-losses">{losses.map((item) => <p key={item.id}><strong>{item.motivo_perda || "Motivo não informado"}</strong><span>{item.quantidade} · {new Date(item.ocorrido_em || item.created_at).toLocaleString("pt-BR")}</span><small>{item.observacoes || "Sem observação"}</small></p>)}</div> : <p>Nenhuma perda ou refugo apontado.</p>}
  </section>;
}

function AdditionalCostModal({ cost, setCost, busy, onClose, onSave }) {
  const update = (key) => (event) => setCost((current) => ({ ...current, [key]: event.target.value }));
  return <OperationModal title="Custo adicional manual" editing={Boolean(cost.id)} onClose={onClose} onSubmit={onSave} submitLabel="Confirmar custo" disabled={busy}>
    <label className="ops-field"><span>Tipo</span><select value={cost.type} onChange={update("type")}>{["Mão de obra", "Energia", "Máquina/equipamento", "Terceiros", "Transporte interno", "Outros custos operacionais"].map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="ops-field"><span>Descrição</span><input value={cost.description} onChange={update("description")} /></label>
    <label className="ops-field"><span>Valor</span><input type="number" min="0.01" step="0.01" value={cost.value} onChange={update("value")} /></label>
    <label className="ops-field"><span>Data</span><input type="date" value={cost.date} onChange={update("date")} /></label>
    <label className="ops-field ops-field--wide"><span>Observação</span><textarea value={cost.notes} onChange={update("notes")} /></label>
    <div className="ops-preview">Registro operacional manual. Não cria contas a pagar nem altera o Financeiro.</div>
  </OperationModal>;
}

function MaterialRow({ item, order, manager, empresaId, userId, stock, run, onNavigate }) {
  const availability = materialAvailability(item, stock);
  const consumption = manager.movements.find((move) => move.tipo === "Saída" && String(move.origem_id || "").includes(item.id) && !manager.movements.some((other) => other.reversao_de === move.id));
  async function purchase() {
    if (!window.confirm(`Encaminhar ${availability.shortage} ${item.unidade} de ${item.material} para revisão em Compras Inteligentes?`)) return;
    const ok = await run(() => preparePurchaseNeed({ empresaId, userId, orderId: order.id, materialId: item.id }), "Necessidade de compra preparada.");
    if (ok) { queuePurchaseNeed({ empresaId, order, material: item, stock }); onNavigate("compras"); }
  }
  return <article className="production-material"><div><strong>{item.material}</strong><div className={`production-material-state state-${availability.situation.toLowerCase()}`}>{availability.situation}</div><small>Necessária {availability.required} {item.unidade} · reservada {availability.reserved} · disponível {availability.available} · faltante {availability.shortage}</small></div><div>
    <button disabled={availability.required - availability.reserved <= 0} onClick={async () => { const q = window.prompt("Quantidade a reservar:", String(Math.min(availability.available, availability.required - availability.reserved))); if (q && window.confirm("Confirmar reserva no estoque?")) await run(() => reserveMaterial({ empresaId, materialId: item.id, quantity: q }), "Material reservado."); }}>Reservar</button>
    <button disabled={!['Em produção', 'Pausada'].includes(order.status)} onClick={async () => { const q = window.prompt("Quantidade consumida:", String(item.quantidade_reservada || 1)); if (q && window.confirm("Confirmar consumo e saída do estoque?")) await run(() => consumeMaterial({ empresaId, materialId: item.id, quantity: q }), "Consumo registrado no estoque."); }}>Consumir</button>
    <button disabled={!availability.reserved} onClick={async () => { const q = window.prompt("Quantidade a liberar:", String(availability.reserved)); if (q && window.confirm("Liberar esta reserva?")) await run(() => releaseMaterial({ empresaId, materialId: item.id, quantity: q }), "Reserva liberada."); }}>Liberar</button>
    {consumption && <button onClick={() => window.confirm("Reverter este consumo sem apagar a movimentação original?") && run(() => reverseConsumption({ empresaId, materialId: item.id, movementId: consumption.id }), "Consumo revertido com histórico.")}>Reverter consumo</button>}
    {availability.shortage > 0 && <button className="need" onClick={purchase}>Encaminhar para compras</button>}
  </div></article>;
}
