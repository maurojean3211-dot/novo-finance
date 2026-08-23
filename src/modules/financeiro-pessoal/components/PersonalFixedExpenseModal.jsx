import { OperationModal } from "../../../components/operations/OperationsUI";

export default function PersonalFixedExpenseModal({ editing, values, onChange, onClose, onSubmit, saving }) {
  const field = (key, value) => onChange({ ...values, [key]: value });
  return <OperationModal title={editing ? "Editar conta fixa" : "Nova conta fixa"} editing={editing} onClose={onClose} onSubmit={onSubmit} submitLabel={saving ? "Salvando…" : editing ? "Salvar alteração" : "Salvar conta fixa"} disabled={saving}>
    <label className="ops-field"><span>Descrição</span><input value={values.descricao} onChange={(event) => field("descricao", event.target.value)} /></label>
    <label className="ops-field"><span>Valor</span><input type="number" min="0.01" step="0.01" value={values.valor} onChange={(event) => field("valor", event.target.value)} /></label>
    <label className="ops-field"><span>Dia do vencimento</span><input type="number" min="1" max="31" value={values.dia_vencimento} onChange={(event) => field("dia_vencimento", event.target.value)} /></label>
    <label className="ops-field"><span>Periodicidade</span><select value={values.frequencia} onChange={(event) => field("frequencia", event.target.value)}><option>Mensal</option><option>Trimestral</option><option>Anual</option></select></label>
    <label className="ops-field"><span>Status</span><select value={values.ativo ? "Ativa" : "Inativa"} onChange={(event) => field("ativo", event.target.value === "Ativa")}><option>Ativa</option><option>Inativa</option></select></label>
  </OperationModal>;
}
