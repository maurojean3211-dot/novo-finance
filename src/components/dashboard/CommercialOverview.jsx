import ExecutivePanel from "./ExecutivePanel";

export default function CommercialOverview({ data, agenda, onNavigate }) {
  const prospecting = agenda.activities.filter((item) => item.origin === "Prospecção").length;
  const modules = [
    { label: "CRM", value: null, page: "crm" },
    { label: "Agenda Comercial", value: agenda.activities.length || null, page: "agenda_comercial" },
    { label: "Prospecção", value: prospecting || null, page: "prospeccao" },
    { label: "Orçamentos", value: null, page: "orcamentos" },
    { label: "Clientes", value: data.clientes.length || null, page: "clientes" },
  ];
  return <ExecutivePanel title="Comercial" eyebrow="Relacionamento e vendas" icon="◎"><div className="command-module-list">{modules.map((item) => <button type="button" onClick={() => onNavigate(item.page)} key={item.label}><span>{item.label}</span><strong>{item.value ?? "Sem dados disponíveis"}</strong><b>→</b></button>)}</div></ExecutivePanel>;
}
