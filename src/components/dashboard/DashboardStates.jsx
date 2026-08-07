export function EmptyData() {
  return <p className="dashboard-empty">Aguardando movimentação.</p>;
}

export function DashboardPanel({ eyebrow, title, children, className = "" }) {
  return <article className={`dashboard-panel ${className}`.trim()}><header className="dashboard-panel__header"><span>{eyebrow}</span><h2>{title}</h2></header>{children}</article>;
}
