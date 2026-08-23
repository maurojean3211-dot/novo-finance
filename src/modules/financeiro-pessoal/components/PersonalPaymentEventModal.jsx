import { OperationModal } from "../../../components/operations/OperationsUI";
import { dateLabel, money } from "../utils/personalFinance";

export default function PersonalPaymentEventModal({ mode, payable, originalEvent, values, feedback, onChange, onClose, onSubmit, saving }) {
  const field = (key, value) => onChange({ ...values, [key]: value });
  const anticipation = mode === "Antecipacao";
  const reversal = mode === "Estorno";
  const effective = reversal ? Number(originalEvent?.valor_pago || 0) : Number(values.paidValue || 0);
  const discount = Math.max(0, Number(payable?.valor || 0) - effective);
  const title = reversal ? "Estornar pagamento" : anticipation ? "Antecipar com desconto" : "Pagar valor normal";
  return <OperationModal title={title} editing onClose={onClose} onSubmit={onSubmit} submitLabel={saving ? "Processando…" : reversal ? "Confirmar estorno" : "Confirmar pagamento"} disabled={saving}>
    {feedback && <div className={`pf-feedback pf-feedback--${feedback.type} ops-field--wide`}>{feedback.message}</div>}
    <section className="ops-preview pf-payment-context"><strong>{payable?.descricao || payable?.fornecedor || "Obrigação pessoal"}</strong><span>Valor nominal: {money(payable?.valor)}</span>{payable?.grupo_parcelamento_id && <span>Parcela {payable.parcela_numero}/{payable.parcelas_total} · vencimento {dateLabel(payable.vencimento)}</span>}</section>
    {reversal && <section className="ops-preview"><strong>Pagamento original</strong><span>{originalEvent?.tipo} · efetivo {money(originalEvent?.valor_pago)} · desconto {money(originalEvent?.desconto_obtido)} · {dateLabel(originalEvent?.pago_em)}</span></section>}
    {anticipation && <label className="ops-field"><span>Valor efetivamente pago</span><input type="number" min="0.01" max={payable?.valor} step="0.01" value={values.paidValue} onChange={(event) => field("paidValue", event.target.value)} /></label>}
    {!anticipation && !reversal && <label className="ops-field"><span>Valor efetivamente pago</span><input value={money(payable?.valor)} disabled /></label>}
    {anticipation && <label className="ops-field"><span>Economia calculada</span><input value={money(discount)} disabled /></label>}
    <label className="ops-field"><span>{reversal ? "Data do estorno" : "Data real do pagamento"}</span><input type="date" value={values.date} min={reversal ? originalEvent?.pago_em : undefined} onChange={(event) => field("date", event.target.value)} /></label>
    <label className="ops-field ops-field--wide"><span>{reversal ? "Motivo / observação" : "Observação opcional"}</span><textarea value={values.notes} onChange={(event) => field("notes", event.target.value)} /></label>
    <section className="ops-preview"><span>{reversal ? "O evento original será preservado e um evento compensatório será criado." : "O status e o evento serão gravados atomicamente pela RPC segura."}</span></section>
  </OperationModal>;
}
