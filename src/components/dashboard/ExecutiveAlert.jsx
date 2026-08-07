export default function ExecutiveAlert({ alert }) {
  return (
    <article className={`intelligence-alert intelligence-alert--${alert.tone}`}>
      <span className="intelligence-alert__icon" aria-hidden="true">{alert.icon}</span>
      <div>
        <span className="intelligence-alert__category">{alert.category}</span>
        <h3>{alert.title}</h3>
        <p>{alert.description}</p>
      </div>
    </article>
  );
}
