import { OperationModal } from "../../../components/operations/OperationsUI";
import { INCOME_STATUSES, INCOME_TYPES } from "../types/personalFinance";
export default function IncomeModal({ editing, values, onChange, onClose, onSubmit }) {
  const field = (key, value) => onChange({ ...values, [key]: value });
  return <OperationModal title={editing ? "Editar receita" : "Nova receita"} editing={editing} onClose={onClose} onSubmit={onSubmit} submitLabel={editing ? "Salvar alteração" : "Salvar receita"}>
    <label className="ops-field"><span>Tipo</span><select value={values.tipo} onChange={(e) => field("tipo", e.target.value)}>{INCOME_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="ops-field"><span>Descrição</span><input value={values.descricao} onChange={(e) => field("descricao", e.target.value)} /></label>
    <label className="ops-field"><span>Fonte pagadora</span><input value={values.fontePagadora} onChange={(e) => field("fontePagadora", e.target.value)} /></label>
    <label className="ops-field"><span>Competência</span><input value={values.competencia} onChange={(e) => field("competencia", e.target.value)} placeholder="MM/AAAA" /></label>
    <label className="ops-field"><span>Data prevista</span><input type="date" value={values.dataPrevista} onChange={(e) => field("dataPrevista", e.target.value)} /></label>
    <label className="ops-field"><span>Data recebida</span><input type="date" value={values.dataRecebida} onChange={(e) => field("dataRecebida", e.target.value)} /></label>
    <label className="ops-field"><span>Valor bruto</span><input type="number" value={values.valorBruto} onChange={(e) => field("valorBruto", e.target.value)} /></label>
    <label className="ops-field"><span>Descontos</span><input type="number" value={values.descontos} onChange={(e) => field("descontos", e.target.value)} /></label>
    <label className="ops-field"><span>Status</span><select value={values.status} onChange={(e) => field("status", e.target.value)}>{INCOME_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="ops-field"><span>Categoria</span><input value={values.categoria} onChange={(e) => field("categoria", e.target.value)} /></label>
    <label className="ops-field ops-field--wide"><span>Observações</span><textarea value={values.observacoes} onChange={(e) => field("observacoes", e.target.value)} /></label>
    <div className="ops-preview">Dados demonstrativos mantidos somente em memória. Nenhuma tabela é consultada ou alterada.</div>
  </OperationModal>;
}
