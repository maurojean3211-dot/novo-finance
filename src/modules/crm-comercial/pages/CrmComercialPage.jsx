import { useState } from "react";
import { MetricGrid, ModuleHeader } from "../../../components/operations/OperationsUI";
import CrmFilters from "../components/CrmFilters";
import CrmCustomerBase from "../components/CrmCustomerBase";
import CrmLinkedQuotes from "../components/CrmLinkedQuotes";
import OpportunityBoard from "../components/OpportunityBoard";
import OpportunityDetails from "../components/OpportunityDetails";
import OpportunityModal from "../components/OpportunityModal";
import OpportunityTable from "../components/OpportunityTable";
import useCrm from "../hooks/useCrm";
import "../crm-comercial.css";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function CrmComercialPage({ empresaId, userId, onNavigate }) {
  const crm = useCrm({ empresaId, userId });
  const [view, setView] = useState("board");
  const [workspace, setWorkspace] = useState("opportunities");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const selected = crm.opportunities.find((item) => item.id === selectedId) || null;
  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(item) { setEditing(item); setModalOpen(true); }
  async function save(item) { if (!window.confirm("Confirmar gravação desta oportunidade no CRM?")) return; await crm.saveOpportunity(item); setModalOpen(false); setEditing(null); }

  return <main className="ops-page crm-page">
    <ModuleHeader eyebrow="Comercial" title="CRM e Prospecção" description="Oportunidades, relacionamentos e próximos passos em uma visão executiva." actionLabel="Nova Oportunidade" onAction={openCreate} />
    <div className="crm-demo-note"><span /> Oportunidades persistentes isoladas por empresa · nenhuma criação automática</div>
    {crm.error && <div className="ops-status-panel">{crm.error} A migration local da Fase 16 precisa ser aplicada ao Supabase.</div>}
    <nav className="crm-workspace-tabs"><button className={workspace === "opportunities" ? "active" : ""} onClick={() => setWorkspace("opportunities")}>Oportunidades</button><button className={workspace === "customers" ? "active" : ""} onClick={() => setWorkspace("customers")}>Empresas e contatos</button><button className={workspace === "quotes" ? "active" : ""} onClick={() => setWorkspace("quotes")}>Orçamentos vinculados</button></nav>
    {workspace === "customers" && <CrmCustomerBase />}
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
    {modalOpen && <OpportunityModal opportunity={editing} onClose={() => setModalOpen(false)} onSave={save} />}
    {selected && !modalOpen && <OpportunityDetails opportunity={selected} onClose={() => setSelectedId(null)} onEdit={openEdit} onCreateQuote={(opportunity)=>{if(!window.confirm("Preparar um orçamento vinculado a esta oportunidade? A gravação ocorrerá somente após sua revisão e confirmação."))return;sessionStorage.setItem("cunha-finance:quote-draft",JSON.stringify({clienteId:opportunity.clienteId,cliente:opportunity.empresa,contato:opportunity.contatoPrincipal,oportunidadeId:opportunity.id,oportunidade:opportunity.produtoInteresse,clienteSnapshot:{clienteId:opportunity.clienteId,nome:opportunity.empresa,contatoResponsavel:opportunity.contatoPrincipal,telefone:opportunity.telefone,whatsapp:opportunity.whatsapp,email:opportunity.email,cidade:opportunity.cidade,estado:opportunity.estado},observacoesCliente:opportunity.observacoes||"",items:[]}));onNavigate?.("orcamentos")}} onAddActivity={crm.addActivity} onDelete={async () => { await crm.removeOpportunity(selected.id); setSelectedId(null); }} />}
    </>}
  </main>;
}
