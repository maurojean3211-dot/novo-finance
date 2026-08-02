import { OperationModal } from "../../../components/operations/OperationsUI";
import { EXPENSE_CATEGORIES } from "../types/personalFinance";
export default function ExpenseModal({ editing, values, onChange, onClose, onSubmit }) {
  const field = (key, value) => onChange({ ...values, [key]: value });
  return <OperationModal title={editing ? "Editar gasto" : "Novo gasto"} editing={editing} onClose={onClose} onSubmit={onSubmit} submitLabel={editing ? "Salvar alteração" : "Salvar gasto"}>
    <label className="ops-field"><span>Fornecedor</span><input value={values.fornecedor} onChange={(e) => field("fornecedor", e.target.value)} /></label>
    <label className="ops-field"><span>Descrição</span><input value={values.descricao} onChange={(e) => field("descricao", e.target.value)} /></label>
    <label className="ops-field"><span>Valor</span><input value={values.valor} onChange={(e) => field("valor", e.target.value)} /></label>
    <label className="ops-field"><span>Vencimento</span><input type="date" value={values.vencimento} onChange={(e) => field("vencimento", e.target.value)} /></label>
    <label className="ops-field"><span>Status</span><select value={values.status} onChange={(e) => field("status", e.target.value)}><option>Pendente</option><option>Pago</option></select></label>
    <label className="ops-field"><span>Categoria visual</span><select value={values.categoria} onChange={(e) => field("categoria", e.target.value)}>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="ops-field"><span>Origem visual</span><select value={values.origem} onChange={(e) => field("origem", e.target.value)}><option>Pessoal</option><option>Cartão</option><option>Recorrente</option></select></label>
    <label className="ops-field"><span>Forma de pagamento visual</span><select value={values.pagamento} onChange={(e) => field("pagamento", e.target.value)}><option>Não informada</option><option>PIX</option><option>Cartão</option><option>Débito</option><option>Dinheiro</option></select></label>
    <div className="ops-preview">Categoria, origem e forma de pagamento são somente visuais nesta etapa e não integram o payload atual.</div>
  </OperationModal>;
}
