import { OperationModal } from "../../../components/operations/OperationsUI";

const shortcuts = [2, 3, 6, 10, 12, 15, 18, 24, 36];

function addMonthsClamped(value, offset) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function money(value) { return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function installmentPreview(values, hasDownPayment) {
  const totalCents = Math.round(Number(values.valor || 0) * 100);
  const downPaymentCents = hasDownPayment ? Math.round(Number(values.valorEntrada || 0) * 100) : 0;
  const financedCents = totalCents - downPaymentCents;
  const count = Number(values.quantidadeParcelas || 0);
  if (!(financedCents > 0) || !(count >= 2 && count <= 120)) return null;
  const firstCents = !hasDownPayment && values.valorPrimeiraParcela ? Math.round(Number(values.valorPrimeiraParcela) * 100) : Math.floor(financedCents / count);
  if (!(firstCents > 0) || firstCents >= financedCents) return null;
  const remaining = financedCents - firstCents;
  const base = Math.floor(remaining / (count - 1));
  const last = remaining - base * (count - 2);
  if (!(base > 0) || !(last > 0)) return null;
  return { count, financed: financedCents / 100, first: firstCents / 100, base: base / 100, last: last / 100, lastDue: addMonthsClamped(values.vencimento, count - 1) };
}

function isValidDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(`${value}T00:00:00`)); }

export default function PersonalPayableModal({ editing, values, onChange, onClose, onSubmit, saving }) {
  const field = (key, value) => onChange({ ...values, [key]: value });
  const parcelado = !editing && values.modo === "parcelado";
  const entradaParcelada = !editing && values.modo === "entrada_parcelada";
  const installmentMode = parcelado || entradaParcelada;
  const preview = installmentMode ? installmentPreview(values, entradaParcelada) : null;
  const total = Number(values.valor || 0);
  const downPayment = Number(values.valorEntrada || 0);
  const downPaymentError = entradaParcelada && (!(total > 0) || !(downPayment > 0) || downPayment >= total || !Number.isInteger(Number(values.quantidadeParcelas)) || Number(values.quantidadeParcelas) < 2 || Number(values.quantidadeParcelas) > 120 || !isValidDate(values.dataEntrada) || !isValidDate(values.vencimento));
  return <OperationModal title={editing ? "Editar conta a pagar" : "Nova conta a pagar"} editing={editing} onClose={onClose} onSubmit={onSubmit} submitLabel={saving ? "Salvando…" : editing ? "Salvar alteração" : "Salvar conta"} disabled={saving || downPaymentError}>
    {!editing && <div className="pf-payable-mode" role="group" aria-label="Tipo de pagamento"><button type="button" className={values.modo === "unico" ? "active" : ""} onClick={() => field("modo", "unico")}>Pagamento único</button><button type="button" className={parcelado ? "active" : ""} onClick={() => field("modo", "parcelado")}>Compra parcelada</button><button type="button" className={entradaParcelada ? "active" : ""} onClick={() => field("modo", "entrada_parcelada")}>Entrada + parcelamento</button></div>}
    <label className="ops-field"><span>Fornecedor</span><input value={values.fornecedor} onChange={(event) => field("fornecedor", event.target.value)} /></label>
    <label className="ops-field"><span>Descrição</span><input value={values.descricao} onChange={(event) => field("descricao", event.target.value)} /></label>
    <label className="ops-field"><span>{installmentMode ? "Valor total da compra" : "Valor"}</span><input type="number" min="0.01" step="0.01" value={values.valor} onChange={(event) => field("valor", event.target.value)} /></label>
    {entradaParcelada && <><label className="ops-field"><span>Valor da entrada</span><input type="number" min="0.01" step="0.01" value={values.valorEntrada} onChange={(event) => field("valorEntrada", event.target.value)} /></label><div className="pf-down-payment-equation"><span>Valor total − Entrada = Saldo financiado</span><strong>{money(total)} − {money(downPayment)} = {money(Math.max(0, total - downPayment))}</strong></div></>}
    {installmentMode && <><label className="ops-field"><span>Quantidade de parcelas</span><input type="number" min="2" max="120" step="1" value={values.quantidadeParcelas} onChange={(event) => field("quantidadeParcelas", event.target.value)} /></label><div className="pf-installment-shortcuts">{shortcuts.map((count) => <button key={count} type="button" className={Number(values.quantidadeParcelas) === count ? "active" : ""} onClick={() => field("quantidadeParcelas", String(count))}>{count}x</button>)}</div>{parcelado && <label className="ops-field"><span>Valor da primeira parcela (opcional)</span><input type="number" min="0.01" step="0.01" value={values.valorPrimeiraParcela} onChange={(event) => field("valorPrimeiraParcela", event.target.value)} /></label>}</>}
    {entradaParcelada && <label className="ops-field"><span>Data de pagamento da entrada</span><input type="date" value={values.dataEntrada} onChange={(event) => field("dataEntrada", event.target.value)} /></label>}
    <label className="ops-field"><span>{installmentMode ? "Primeiro vencimento" : "Vencimento"}</span><input type="date" value={values.vencimento} onChange={(event) => field("vencimento", event.target.value)} /></label>
    {installmentMode ? <label className="ops-field"><span>Periodicidade</span><input value="Mensal" disabled /></label> : <label className="ops-field"><span>Status</span><input value={editing ? values.status : "Pendente"} disabled /><small>Pagamentos, antecipações e estornos usam o fluxo seguro da conta.</small></label>}
    <label className="ops-field"><span>Categoria</span><input value={values.categoria} onChange={(event) => field("categoria", event.target.value)} /></label>
    <label className="ops-field"><span>Observações</span><textarea value={values.observacoes} onChange={(event) => field("observacoes", event.target.value)} /></label>
    {installmentMode && <section className="pf-installment-preview"><strong>Prévia informativa</strong>{preview ? <><span>{entradaParcelada ? `Saldo financiado ${money(preview.financed)} ÷ ${preview.count} parcelas` : `${preview.count} parcelas`} · primeira {money(preview.first)}{preview.base !== preview.first ? ` · intermediárias ${money(preview.base)}` : ""}</span><span>Última parcela {money(preview.last)}{preview.last !== preview.base ? " (ajuste de centavos)" : ""}</span><span>Primeiro vencimento {values.vencimento || "—"} · último {preview.lastDue || "—"}</span><b>{entradaParcelada ? `Entrada ${money(downPayment)} + parcelas ${money(preview.financed)} = ${money(total)}` : `Total ${money(values.valor)}`}</b></> : <span>Informe valores válidos, quantidade entre 2 e 120 e as datas obrigatórias.</span>}<small>A RPC transacional é a fonte definitiva dos valores e vencimentos; eventual centavo residual fica somente na última parcela.</small></section>}
  </OperationModal>;
}
