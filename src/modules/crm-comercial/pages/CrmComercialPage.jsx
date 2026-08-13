import { useEffect, useState } from "react";
import { FeedbackBanner, MetricGrid, ModuleHeader } from "../../../components/operations/OperationsUI";
import CrmFilters from "../components/CrmFilters";
import CrmLinkedQuotes from "../components/CrmLinkedQuotes";
import OpportunityBoard from "../components/OpportunityBoard";
import OpportunityDetails from "../components/OpportunityDetails";
import OpportunityModal from "../components/OpportunityModal";
import OpportunityTable from "../components/OpportunityTable";
import useCrm from "../hooks/useCrm";
import { EMPTY_OPPORTUNITY } from "../types/crm";
import { consumeProspectOpportunityFlow, linkProspectOpportunity } from "../../../app/integrations/prospectCrmFlow";
import { consumeCustomerOpportunityFlow } from "../../../app/integrations/customerCrmFlow";
import "../crm-comercial.css";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function CrmComercialPage({ empresaId, userId, onNavigate }) {
  const crm = useCrm({ empresaId, userId });
  const [view, setView] = useState("board");
  const [workspace, setWorkspace] = useState("opportunities");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [incoming, setIncoming] = useState(() => consumeProspectOpportunityFlow({ empresaId, userId }));
  const [customerOpportunityId, setCustomerOpportunityId] = useState(() => consumeCustomerOpportunityFlow({ empresaId }));
  const selected = crm.opportunities.find((item) => item.id === selectedId) || null;
  function openEdit(item) { setEditing(item); setModalOpen(true); }
  useEffect(() => {
    if (!incoming || crm.loading) return;
    const timer = window.setTimeout(() => {
      const existing = incoming.opportunityId && crm.opportunities.find((item) => item.id === incoming.opportunityId);
      if (existing) {
        crm.clearFilters();
        setWorkspace("opportunities");
        setSelectedId(existing.id);
        setFeedback({ type: "info", message: "Esta empresa já possui uma oportunidade vinculada. Abrimos o registro existente." });
      } else {
        setEditing({ ...EMPTY_OPPORTUNITY, ...incoming.company });
        setModalOpen(true);
        setFeedback({ type: "info", message: incoming.opportunityId ? "O vínculo anterior não foi encontrado. Revise antes de criar uma nova oportunidade." : "Dados da empresa carregados da Prospecção. Complete somente os dados comerciais." });
      }
      setIncoming(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [incoming, crm]);
  useEffect(() => {
    if (!customerOpportunityId || crm.loading) return;
    const existing = crm.opportunities.find((item) => item.id === customerOpportunityId);
    if (existing) {
      crm.clearFilters();
      setWorkspace("opportunities");
      setView("table");
      setSelectedId(existing.id);
    } else {
      setFeedback({ type: "error", message: "A oportunidade vinculada não está disponível para esta empresa." });
    }
    setCustomerOpportunityId(null);
  }, [customerOpportunityId, crm]);
  async function save(item) {
    if (!window.confirm("Confirmar gravação desta oportunidade no CRM?")) return;
    setSaveError("");
    setSaving(true);
    try {
      const saved = await crm.saveOpportunity(item);
      if (item.prospectId) linkProspectOpportunity({ empresaId, userId, prospectId: item.prospectId, opportunityId: saved.id });
      crm.clearFilters();
      setWorkspace("opportunities");
      setView("table");
      setSelectedId(saved.id);
      setModalOpen(false);
      setEditing(null);
      setFeedback({ type: "success", message: saved.refreshWarning || (item.id ? "Oportunidade gravada com sucesso e aberta no CRM." : "Oportunidade gravada com sucesso e aberta no CRM.") });
    } catch (error) {
      console.error("[CRM] Erro técnico ao gravar oportunidade",{code:error.code,message:error.message,details:error.details,hint:error.hint},error);
      const message=error.message||"Não foi possível salvar a oportunidade.";
      setSaveError(message);
      setFeedback({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }

  return <main className="ops-page crm-page">
    <ModuleHeader eyebrow="Comercial" title="CRM Comercial" description="Funil, oportunidades e próximos passos de toda a empresa em uma visão executiva." actionLabel="Selecionar na Prospecção" onAction={() => onNavigate?.("prospeccao")} />
    <div className="crm-demo-note"><span /> Oportunidades persistentes isoladas por empresa · nenhuma criação automática</div>
    <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
    {crm.error && <div className="ops-status-panel">{crm.error} A migration local da Fase 16 precisa ser aplicada ao Supabase.</div>}
    <nav className="crm-workspace-tabs"><button className={workspace === "opportunities" ? "active" : ""} onClick={() => setWorkspace("opportunities")}>Oportunidades</button><button className={workspace === "quotes" ? "active" : ""} onClick={() => setWorkspace("quotes")}>Orçamentos vinculados</button></nav>
    {workspace === "quotes" && <CrmLinkedQuotes empresaId={empresaId} />}
    {workspace === "opportunities" && <>
    <MetricGrid items={[
      { label: "Oportunidades abertas", value: crm.metrics.abertas, detail: "em etapas ativas", icon: "◇" },
      { label: "Valor total do funil", value: money(crm.metrics.valorFunil), detail: "potencial em aberto", icon: "R$", tone: "green" },
      { label: "Propostas enviadas", value: crm.metrics.propostas, detail: "aguardando retorno", icon: "↗", tone: "amber" },
      { label: "Em negociação", value: crm.metrics.negociacoes, detail: "negociações ativas", icon: "◎" },
      { label: "Negócios ganhos", value: crm.metrics.ganhos, detail: `${crm.metrics.conversao.toFixed(0)}% de conversão`, icon: "✓", tone: "green" },
      { label: "Retornos vencidos", value: crm.metrics.vencidos, detail: "exigem atenção", icon: "!", tone: "rose" },
      { label: "Atividades hoje", value: crm.metrics.hoje, detail: "interações registradas", icon: "▤" },
    ]} />
    <CrmFilters filters={crm.filters} onChange={crm.setFilters} onClear={crm.clearFilters} opportunities={crm.opportunities} />
    <div className="crm-viewbar"><div><strong>Painel de oportunidades</strong><span>{crm.filtered.length} oportunidade(s)</span></div><div><button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>Funil</button><button className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Tabela</button></div></div>
    {crm.loading ? <div className="ops-status-panel">Carregando oportunidades persistentes...</div> : view === "board" ? <OpportunityBoard opportunities={crm.filtered} onSelect={(item) => setSelectedId(item.id)} onMove={crm.moveOpportunity} /> : <OpportunityTable opportunities={crm.filtered} onSelect={(item) => setSelectedId(item.id)} onMove={crm.moveOpportunity} />}
    {modalOpen && <OpportunityModal opportunity={editing} onClose={() => { if(!saving){setModalOpen(false);setSaveError("");} }} onSave={save} saveError={saveError} saving={saving} />}
    {selected && !modalOpen && <OpportunityDetails opportunity={selected} onClose={() => setSelectedId(null)} onEdit={openEdit} onCreateQuote={(opportunity)=>{if(!window.confirm("Preparar um orçamento vinculado a esta oportunidade? A gravação ocorrerá somente após sua revisão e confirmação."))return;sessionStorage.setItem("cunha-finance:quote-draft",JSON.stringify({clienteId:opportunity.clienteId,cliente:opportunity.empresa,contato:opportunity.contatoPrincipal,oportunidadeId:opportunity.id,oportunidade:opportunity.produtoInteresse,clienteSnapshot:{clienteId:opportunity.clienteId,nome:opportunity.empresa,contatoResponsavel:opportunity.contatoPrincipal,telefone:opportunity.telefone,whatsapp:opportunity.whatsapp,email:opportunity.email,cidade:opportunity.cidade,estado:opportunity.estado},observacoesCliente:opportunity.observacoes||"",items:[]}));onNavigate?.("orcamentos")}} onAddActivity={crm.addActivity} onDelete={async () => { await crm.removeOpportunity(selected.id); setSelectedId(null); }} />}
    </>}
  </main>;
}
