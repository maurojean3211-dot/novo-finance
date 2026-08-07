export default function IntelligenceCard({ title, eyebrow, children, className = "" }) {
  return (
    <section className={`intelligence-card ${className}`.trim()}>
      <header><span>{eyebrow}</span><h2>{title}</h2></header>
      {children}
    </section>
  );
}
