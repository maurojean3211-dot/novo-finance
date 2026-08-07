import ExecutivePanel from "./ExecutivePanel";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CommercialOverview({ data, onNavigate }) {
  const available = data.sourceAvailable("vendas");
  const modules = [
    { label: "Vendas", value: available ? data.vendas.length : "—", page: "vendas" },
    { label: "Faturamento", value: available ? currency.format(data.totalVendas) : "—", page: "vendas" },
    { label: "Ticket médio", value: available ? currency.format(data.ticketMedio) : "—", page: "vendas" },
    { label: "Pipeline", value: data.sourceAvailable("crm_oportunidades") ? currency.format(data.crm_oportunidades.reduce((sum, item) => sum + Number(item.valor_estimado || 0), 0)) : "—", page: "crm" },
    { label: "Clientes", value: data.sourceAvailable("clientes") ? data.clientes.length : "—", page: "clientes" },
  ];
  return <ExecutivePanel title="Comercial" eyebrow="Desempenho do período" icon="◎"><div className="command-module-list">{modules.map((item) => <button type="button" onClick={() => onNavigate(item.page)} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><b>→</b></button>)}</div>{available && !data.vendas.length && <p className="command-state">Aguardando movimentação comercial.</p>}</ExecutivePanel>;
}
