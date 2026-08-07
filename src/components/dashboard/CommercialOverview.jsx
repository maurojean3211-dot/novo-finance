import ExecutivePanel from "./ExecutivePanel";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CommercialOverview({ data, onNavigate }) {
  const available = data.sourceAvailable("vendas");
  const modules = [
    { label: "Vendas", value: available && data.vendas.length ? data.vendas.length : null, page: "vendas" },
    { label: "Faturamento", value: available && data.vendas.length ? currency.format(data.totalVendas) : null, page: "vendas" },
    { label: "Ticket médio", value: available && data.vendas.length ? currency.format(data.ticketMedio) : null, page: "vendas" },
    { label: "Comissão", value: available && data.vendas.length ? currency.format(data.comissaoVendas) : null, page: "vendas" },
    { label: "Clientes", value: data.sourceAvailable("clientes") ? data.clientes.length : null, page: "clientes" },
  ];
  return <ExecutivePanel title="Comercial" eyebrow="Vendas no período" icon="◎"><div className="command-module-list">{modules.map((item) => <button type="button" onClick={() => onNavigate(item.page)} key={item.label}><span>{item.label}</span><strong>{item.value ?? "Sem dados disponíveis"}</strong><b>→</b></button>)}</div></ExecutivePanel>;
}
