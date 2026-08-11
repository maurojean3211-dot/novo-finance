import "./operations.css";

export function ModuleHeader({ eyebrow, title, description, actionLabel, onAction }) {
  return <header className="ops-header"><div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>{actionLabel && <button onClick={onAction}>＋ {actionLabel}</button>}</header>;
}

export function MetricGrid({ items }) {
  return <section className="ops-metrics">{items.map((item) => <article key={item.label}><span className={`ops-metric-icon ${item.tone || ""}`}>{item.icon}</span><div><small>{item.label}</small><strong>{item.value}</strong><b>{item.detail}</b></div></article>)}</section>;
}

export function FilterBar({ children }) {
  return <section className="ops-filters">{children}</section>;
}

export function EmptyState({ title = "Nenhum registro encontrado", description = "Ajuste os filtros ou cadastre um novo registro." }) {
  return <div className="ops-empty"><span>◇</span><strong>{title}</strong><small>{description}</small></div>;
}

export function OperationModal({ title, editing, onClose, children, onSubmit, submitLabel, disabled }) {
  return <div className="ops-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="ops-modal" role="dialog" aria-modal="true" aria-label={title}><header><div><p>{editing ? "Edição de registro" : "Novo registro"}</p><h2>{title}</h2></div><button onClick={onClose} aria-label="Fechar">×</button></header><div className="ops-form">{children}</div><footer><button onClick={onClose}>Cancelar</button><button onClick={onSubmit} disabled={disabled}>{submitLabel}</button></footer></section></div>;
}

export function ActionButtons({ onView, onEdit, onDelete }) {
  return <div className="ops-actions">{onView && <button type="button" className="neutral" onClick={onView}>Consultar</button>}{onEdit && <button type="button" onClick={onEdit}>Editar</button>}{onDelete && <button type="button" className="danger" onClick={onDelete}>Excluir</button>}</div>;
}

export function StatusPanel({ children }) {
  return <div className="ops-status-panel">{children}</div>;
}

export function LoadingState({ children = "Carregando dados..." }) {
  return <div className="ops-loading" role="status">{children}</div>;
}

export function FeedbackBanner({ feedback, onClose }) {
  if (!feedback?.message) return null;
  return <div className={`ops-feedback ops-feedback--${feedback.type || "info"}`} role="status"><span>{feedback.message}</span><button onClick={onClose} aria-label="Fechar mensagem">×</button></div>;
}
