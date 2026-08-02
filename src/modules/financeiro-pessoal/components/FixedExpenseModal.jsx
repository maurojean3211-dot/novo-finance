import { OperationModal } from "../../../components/operations/OperationsUI";
import { EXPENSE_CATEGORIES } from "../types/personalFinance";
export default function FixedExpenseModal({ editing, values, onChange, onClose, onSubmit }) {
  const field = (key, value) => onChange({ ...values, [key]: value });
  return <OperationModal title={editing ? "Editar conta fixa" : "Nova conta fixa"} editing={editing} onClose={onClose} onSubmit={onSubmit} submitLabel={editing ? "Salvar alteração" : "Salvar conta fixa"}>
    <label className="ops-field"><span>Descrição</span><input value={values.descricao} onChange={(e) => field("descricao", e.target.value)} /></label>
    <label className="ops-field"><span>Valor</span><input value={values.valor} onChange={(e) => field("valor", e.target.value)} /></label>
    <label className="ops-field"><span>Dia do vencimento</span><input type="number" min="1" max="31" value={values.dia} onChange={(e) => field("dia", e.target.value)} /></label>
    <label className="ops-field"><span>Categoria visual</span><select value={values.categoria} onChange={(e) => field("categoria", e.target.value)}>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="ops-field"><span>Periodicidade visual</span><select value={values.periodicidade} onChange={(e) => field("periodicidade", e.target.value)}><option>Mensal</option><option>Trimestral</option><option>Anual</option></select></label>
    <label className="ops-field"><span>Status visual</span><select value={values.statusVisual} onChange={(e) => field("statusVisual", e.target.value)}><option>Ativa</option><option>Inativa</option></select></label>
    <label className="ops-field"><span>Início visual</span><input type="date" value={values.inicio} onChange={(e) => field("inicio", e.target.value)} /></label>
    <label className="ops-field"><span>Término visual</span><input type="date" value={values.termino} onChange={(e) => field("termino", e.target.value)} /></label>
    <div className="ops-preview">Os campos de preparação visual não alteram o payload legado de Contas Fixas.</div>
  </OperationModal>;
}
