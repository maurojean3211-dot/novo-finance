import { useState } from "react";
import { OperationModal } from "../../../components/operations/OperationsUI";
import { EMPTY_OPPORTUNITY, FUNNEL_STAGES, PRIORITIES } from "../types/crm";

const companyFields = [
  ["empresa", "Empresa", "text"], ["contatoPrincipal", "Contato principal", "text"], ["telefone", "Telefone", "tel"], ["whatsapp", "WhatsApp", "tel"], ["email", "E-mail", "email"], ["cidade", "Cidade", "text"], ["estado", "Estado", "text"], ["segmento", "Segmento", "text"], ["origemLead", "Origem do lead", "text"], ["vendedorResponsavel", "Vendedor responsável", "text"], ["produtoInteresse", "Produto ou interesse", "text"], ["valorEstimado", "Valor estimado", "number"], ["pesoEstimado", "Peso estimado (kg)", "number"], ["probabilidade", "Probabilidade (%)", "number"], ["proximoContato", "Próximo contato", "date"], ["status", "Status", "text"],
];
const opportunityFields = companyFields.slice(11, 15);

export default function OpportunityModal({ opportunity, onClose, onSave, saveError, saving }) {
  const [form, setForm] = useState(() => opportunity ? { ...opportunity } : { ...EMPTY_OPPORTUNITY });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = () => {
    if (!form.empresa.trim()) return alert("Informe a empresa vinculada à oportunidade.");
    onSave({ ...form, valorEstimado: Number(form.valorEstimado || 0), pesoEstimado: Number(form.pesoEstimado || 0), probabilidade: Number(form.probabilidade || 0) });
  };
  return <OperationModal title={opportunity ? "Editar oportunidade" : "Nova oportunidade"} editing={Boolean(opportunity)} onClose={onClose} onSubmit={submit} submitLabel={saving ? "Gravando..." : opportunity ? "Salvar alterações" : "Criar oportunidade"} disabled={saving}>
    {saveError && <div className="ops-preview prospect-error ops-field--wide" role="alert"><strong>Não foi possível gravar a oportunidade.</strong><p>{saveError}</p></div>}
    {form.prospectId && <section className="ops-preview ops-field--wide"><strong>Empresa vinculada à Prospecção</strong><p>{form.empresa} · {form.cnpj || "CNPJ não informado"}</p><small>{[form.contatoPrincipal, form.whatsapp || form.telefone, form.email, form.site, form.cidade, form.estado, form.regiao, form.segmento, form.origemLead, form.produtoInteresse].filter(Boolean).join(" · ")}</small>{form.prospectNotes && <p>{form.prospectNotes}</p>}<p>Dados cadastrais são editados somente na Prospecção.</p></section>}
    {(form.prospectId ? opportunityFields : companyFields).map(([key, label, type]) => <label className="ops-field" key={key}><span>{label}</span><input type={type} value={form[key] ?? ""} onChange={(event) => update(key, event.target.value)} /></label>)}
    <label className="ops-field"><span>Etapa do funil</span><select value={form.etapa} onChange={(event) => update("etapa", event.target.value)}>{FUNNEL_STAGES.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="ops-field"><span>Prioridade</span><select value={form.prioridade} onChange={(event) => update("prioridade", event.target.value)}>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="ops-field ops-field--wide"><span>Observações</span><textarea value={form.observacoes} onChange={(event) => update("observacoes", event.target.value)} /></label>
    {form.etapa === "Fechado — perdido" && <label className="ops-field ops-field--wide"><span>Motivo da perda</span><textarea value={form.motivoPerda} onChange={(event) => update("motivoPerda", event.target.value)} /></label>}
  </OperationModal>;
}
