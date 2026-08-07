import { EmptyData } from "./DashboardStates";

export default function ExecutiveMetrics({ items }) {
  if (!items.length) return <EmptyData />;
  return <section className="executive-metrics" aria-label="Indicadores executivos">{items.map((item) => <article className={`executive-metric${item.featured ? " executive-metric--featured" : ""}`} key={item.label}><span>{item.icon}</span><div><small>{item.label}</small><strong>{item.value}</strong><p>{item.detail}</p></div></article>)}</section>;
}
