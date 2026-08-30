import { OperationModal } from "../../../components/operations/OperationsUI";

export default function PersonalFixedExpenseModal({ editing, values, onChange, onClose, onSubmit, saving }) {
  const field = (key, value) => onChange({ ...values, [key]: value });
  return <OperationModal title={editing ? "Editar conta fixa" : "Nova conta fixa"} editing={editing} onClose={onClose} onSubmit={onSubmit} submitLabel={saving ? "Salvando…" : editing ? "Salvar alteração" : "Salvar conta fixa"} disabled={saving}>
    <label className="ops-field"><span>Descrição</span><input value={values.descricao} onChange={(event) => field("descricao", event.target.value)} /></label>
    <label className="ops-field"><span>Fornecedor (opcional)</span><input value={values.contraparte} onChange={(event) => field("contraparte", event.target.value)} /></label>
    <label className="ops-field"><span>Valor</span><input type="number" min="0.01" step="0.01" value={values.valor} onChange={(event) => field("valor", event.target.value)} /></label>
    <label className="ops-field"><span>Dia do vencimento</span><input type="number" min="1" max="31" value={values.dia_vencimento} onChange={(event) => field("dia_vencimento", event.target.value)} /></label>
    <label className="ops-field"><span>Periodicidade</span><select value={values.frequencia} onChange={(event) => field("frequencia", event.target.value)}><option>Mensal</option><option>Semanal</option><option>Quinzenal</option><option>Anual</option></select></label>
    <label className="ops-field"><span>Data-base da primeira ocorrência</span><input type="date" value={values.data_base} onChange={(event) => field("data_base", event.target.value)} /></label>
    <label className="ops-field"><span>Data final (opcional)</span><input type="date" value={values.data_fim} onChange={(event) => field("data_fim", event.target.value)} /></label>
    <label className="ops-field"><span>Classificação</span><select value={values.classificacao} onChange={(event) => field("classificacao", event.target.value)}><option>Fixa</option><option>Variável essencial</option><option>Variável não essencial</option></select></label>
    <label className="ops-field"><span>Forma de pagamento</span><input value={values.forma_pagamento} onChange={(event) => field("forma_pagamento", event.target.value)} /></label>
    <label className="ops-field"><span>Conta financeira</span><input value={values.conta_financeira} onChange={(event) => field("conta_financeira", event.target.value)} /></label>
    <label className="ops-field ops-field--wide"><span>Observações</span><textarea value={values.observacoes} onChange={(event) => field("observacoes", event.target.value)} /></label>
    <label className="ops-field"><span>Geração</span><select value={values.gerar_automaticamente ? "Automática" : "Manual"} onChange={(event) => field("gerar_automaticamente", event.target.value === "Automática")}><option>Automática</option><option>Manual</option></select></label>
    <label className="ops-field"><span>Status</span><select value={values.ativo ? "Ativa" : "Inativa"} onChange={(event) => field("ativo", event.target.value === "Ativa")}><option>Ativa</option><option>Inativa</option></select></label>
  </OperationModal>;
}
