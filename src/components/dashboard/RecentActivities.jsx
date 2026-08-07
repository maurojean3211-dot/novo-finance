import ExecutivePanel from "./ExecutivePanel";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (value) => new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");

export default function RecentActivities({ activities }) {
  return <ExecutivePanel title="Atividades recentes" eyebrow="Movimentações do período" icon="◷" className="command-panel--recent">
    {activities.length ? <div className="recent-activity">{activities.map((item) => <div key={item.id}><span className="recent-activity__icon">{item.icon}</span><div><strong>{item.type} · {item.description}</strong><small>{formatDate(item.date)}</small></div><b>{item.value === null ? "—" : currency.format(item.value)}</b></div>)}</div> : <p className="command-empty">Sem atividades recentes</p>}
  </ExecutivePanel>;
}
