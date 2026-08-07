export default function ExecutivePanel({ title, eyebrow, icon, children, className = "" }) {
  return (
    <section className={`command-panel ${className}`.trim()}>
      <header className="command-panel__header"><span className="command-panel__icon" aria-hidden="true">{icon}</span><div><small>{eyebrow}</small><h2>{title}</h2></div></header>
      {children}
    </section>
  );
}
