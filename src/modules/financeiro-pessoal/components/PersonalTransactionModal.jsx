import { OperationModal } from "../../../components/operations/OperationsUI";

export default function PersonalTransactionModal({ kind, editing, values, onChange, onClose, onSubmit, saving }) {
  const label = kind === "receita" ? "receita" : "despesa";
  const field = (key, value) => onChange({ ...values, [key]: value });
  return <OperationModal title={`${editing ? "Editar" : "Nova"} ${label}`} editing={editing} onClose={onClose} onSubmit={onSubmit} submitLabel={saving ? "Salvando…" : editing ? "Salvar alteração" : `Salvar ${label}`} disabled={saving}>
    <label className="ops-field"><span>Descrição</span><input value={values.descricao} onChange={(event) => field("descricao", event.target.value)} /></label>
    <label className="ops-field"><span>Valor</span><input type="number" min="0.01" step="0.01" value={values.valor} onChange={(event) => field("valor", event.target.value)} /></label>
    <label className="ops-field"><span>Data</span><input type="date" value={values.data} onChange={(event) => field("data", event.target.value)} /></label>
    <label className="ops-field"><span>Categoria / origem</span><input value={values.categoria} onChange={(event) => field("categoria", event.target.value)} /></label>
    <div className="ops-preview">O tipo é protegido internamente como <strong>{label}</strong> e não pode ser alterado neste formulário.</div>
  </OperationModal>;
}
