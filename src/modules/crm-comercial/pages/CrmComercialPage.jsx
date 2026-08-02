import { useState } from "react";
import { MetricGrid, ModuleHeader } from "../../../components/operations/OperationsUI";
import CrmFilters from "../components/CrmFilters";
import OpportunityBoard from "../components/OpportunityBoard";
import OpportunityDetails from "../components/OpportunityDetails";
import OpportunityModal from "../components/OpportunityModal";
import OpportunityTable from "../components/OpportunityTable";
import useCrm from "../hooks/useCrm";
import "../crm-comercial.css";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function CrmComercialPage() {
  const crm = useCrm();
  const [view, setView] = useState("board");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const selected = crm.opportunities.find((item) => item.id === selectedId) || null;
  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(item) { setEditing(item); setModalOpen(true); }
  function save(item) { crm.saveOpportunity(item); setModalOpen(false); setEditing(null); }

  return <main className="ops-page crm-page">
    <ModuleHeader eyebrow="Comercial" title="CRM e Prospecção" description="Oportunidades, relacionamentos e próximos passos em uma visão executiva." actionLabel="Nova Oportunidade" onAction={openCreate} />
    <div className="crm-demo-note"><span /> Ambiente demonstrativo · alterações mantidas somente em memória</div>
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
    {view === "board" ? <OpportunityBoard opportunities={crm.filtered} onSelect={(item) => setSelectedId(item.id)} onMove={crm.moveOpportunity} /> : <OpportunityTable opportunities={crm.filtered} onSelect={(item) => setSelectedId(item.id)} onMove={crm.moveOpportunity} />}
    {modalOpen && <OpportunityModal opportunity={editing} onClose={() => setModalOpen(false)} onSave={save} />}
    {selected && !modalOpen && <OpportunityDetails opportunity={selected} onClose={() => setSelectedId(null)} onEdit={openEdit} onAddActivity={crm.addActivity} />}
  </main>;
}
