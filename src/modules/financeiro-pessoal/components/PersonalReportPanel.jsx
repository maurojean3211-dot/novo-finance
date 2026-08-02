export default function PersonalReportPanel({ icon, title, description, metrics }) {
  return <article className="pf-report-card"><span>{icon}</span><div><strong>{title}</strong><small>{description}</small></div><footer>{metrics.map((item) => <b key={item}>{item}</b>)}</footer></article>;
}
