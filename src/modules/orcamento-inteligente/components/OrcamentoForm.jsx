import CustomerSelector from "./CustomerSelector";
import CatalogItemSelector from "./CatalogItemSelector";
import { calculateQuoteTotals, formatMoney } from "../utils/money-calculations";

const fields = [["contato", "Contato do orçamento"], ["oportunidade", "Oportunidade"], ["vendedor", "Vendedor"], ["moeda", "Moeda"], ["validade", "Validade", "date"], ["condicaoPagamento", "Condição de pagamento"], ["prazoEntrega", "Prazo de entrega"], ["modalidadeFrete", "Modalidade de frete"]];

export default function OrcamentoForm({ editor, onSave, onCancel }) {
  const { quote, update, selectCustomer, clearCustomer, addItem, removeItem } = editor;
  const totals = calculateQuoteTotals(quote.items, quote);
  return <div className="quote-form">
    <CustomerSelector selectedId={quote.clienteId} snapshot={quote.clienteSnapshot} onSelect={selectCustomer} onClear={clearCustomer} />
    <section className="ops-panel"><div className="ops-panel__header"><h2>Dados gerais</h2><span>Rascunho local com snapshot do cliente</span></div><div className="quote-form__grid">
      {fields.map(([key, label, type]) => <label className="ops-field" key={key}><span>{label}</span><input type={type || "text"} value={quote[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
      <label className="ops-field ops-field--wide"><span>Observações internas</span><textarea value={quote.observacoesInternas} onChange={(event) => update("observacoesInternas", event.target.value)} /></label>
      <label className="ops-field ops-field--wide"><span>Observações ao cliente</span><textarea value={quote.observacoesCliente} onChange={(event) => update("observacoesCliente", event.target.value)} /></label>
    </div></section>
    <CatalogItemSelector onAdd={addItem} />
    <section className="ops-panel"><div className="ops-panel__header"><h2>Itens incluídos</h2><span>{quote.items.length} item(ns)</span></div><div className="quote-items">{quote.items.map((item) => <article key={item.id}><div><strong>{item.codigo || "Sem código"} · {item.descricao}</strong><small>{item.liga} {item.tempera} · {item.quantidade} {item.unidade} · {item.pesoTotal || 0} kg</small></div><span>{formatMoney(Number(item.preco) * Number(item.quantidade))}</span><button onClick={() => removeItem(item.id)}>Remover</button></article>)}</div></section>
    <section className="ops-panel quote-totals"><label className="ops-field"><span>Desconto (%)</span><input type="number" min="0" value={quote.desconto} onChange={(event) => update("desconto", event.target.value)} /></label><label className="ops-field"><span>Impostos existentes</span><input type="number" min="0" value={quote.impostos} onChange={(event) => update("impostos", event.target.value)} /></label><label className="ops-field"><span>Comissão automática</span><input type="number" value={totals.comissao} readOnly /></label><div><span>Subtotal</span><strong>{formatMoney(totals.subtotal)}</strong></div><div><span>Valor final</span><strong>{formatMoney(totals.valorFinal)}</strong></div></section>
    <footer><button onClick={onCancel}>Cancelar</button><button onClick={() => onSave(quote)} disabled={!quote.clienteId || !quote.validade || !quote.items.length}>Salvar orçamento persistente</button></footer>
  </div>;
}
