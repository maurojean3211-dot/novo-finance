import ExecutivePanel from "./ExecutivePanel";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const total = (items, field = "valor") => items.reduce((sum, item) => sum + Number(item[field] || 0), 0);

export default function CompanyOverview({ data }) {
  const pendingAccounts = data.recebimentos.filter((item) => !["pago", "recebido"].includes(String(item.status || "").toLowerCase()));
  const items = [
    { label: "Faturamento", value: data.vendas.length ? currency.format(total(data.vendas)) : null, detail: `${data.vendas.length} venda(s)` },
    { label: "Margem", value: null, detail: "Sem dados disponíveis" },
    { label: "Contas", value: pendingAccounts.length ? currency.format(total(pendingAccounts)) : null, detail: `${pendingAccounts.length} pendente(s)` },
    { label: "Vendas", value: data.vendas.length || null, detail: "registros existentes" },
    { label: "Compras", value: data.compras.length || null, detail: "registros existentes" },
  ];
  return <ExecutivePanel title="Empresa" eyebrow="Visão consolidada" icon="◆" className="command-panel--company"><div className="command-kpis">{items.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value ?? "Sem dados disponíveis"}</strong><small>{item.detail}</small></article>)}</div></ExecutivePanel>;
}
