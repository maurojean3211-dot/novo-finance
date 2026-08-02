import { useState } from "react";
import { OperationModal } from "../../../components/operations/OperationsUI";
import { EMPTY_OPPORTUNITY, FUNNEL_STAGES, PRIORITIES } from "../types/crm";

const fields = [
  ["empresa", "Empresa", "text"], ["contatoPrincipal", "Contato principal", "text"], ["telefone", "Telefone", "tel"], ["whatsapp", "WhatsApp", "tel"], ["email", "E-mail", "email"], ["cidade", "Cidade", "text"], ["estado", "Estado", "text"], ["segmento", "Segmento", "text"], ["origemLead", "Origem do lead", "text"], ["vendedorResponsavel", "Vendedor responsável", "text"], ["produtoInteresse", "Produto ou interesse", "text"], ["valorEstimado", "Valor estimado", "number"], ["pesoEstimado", "Peso estimado (kg)", "number"], ["probabilidade", "Probabilidade (%)", "number"], ["proximoContato", "Próximo contato", "date"], ["status", "Status", "text"],
];

export default function OpportunityModal({ opportunity, onClose, onSave }) {
  const [form, setForm] = useState(() => opportunity ? { ...opportunity } : { ...EMPTY_OPPORTUNITY });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = () => {
    if (!form.empresa.trim() || !form.contatoPrincipal.trim()) return alert("Informe empresa e contato principal.");
    onSave({ ...form, valorEstimado: Number(form.valorEstimado || 0), pesoEstimado: Number(form.pesoEstimado || 0), probabilidade: Number(form.probabilidade || 0) });
  };
  return <OperationModal title={opportunity ? "Editar oportunidade" : "Nova oportunidade"} editing={Boolean(opportunity)} onClose={onClose} onSubmit={submit} submitLabel={opportunity ? "Salvar alterações" : "Criar oportunidade"}>
    {fields.map(([key, label, type]) => <label className="ops-field" key={key}><span>{label}</span><input type={type} value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
    <label className="ops-field"><span>Etapa do funil</span><select value={form.etapa} onChange={(event) => update("etapa", event.target.value)}>{FUNNEL_STAGES.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="ops-field"><span>Prioridade</span><select value={form.prioridade} onChange={(event) => update("prioridade", event.target.value)}>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="ops-field ops-field--wide"><span>Observações</span><textarea value={form.observacoes} onChange={(event) => update("observacoes", event.target.value)} /></label>
    {form.etapa === "Fechado — perdido" && <label className="ops-field ops-field--wide"><span>Motivo da perda</span><textarea value={form.motivoPerda} onChange={(event) => update("motivoPerda", event.target.value)} /></label>}
  </OperationModal>;
}
