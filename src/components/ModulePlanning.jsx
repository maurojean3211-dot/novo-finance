export default function ModulePlanning({ title }) {
  return (
    <main className="planning-page">
      <section className="planning-card">
        <span className="planning-card__icon">◇</span>
        <p className="planning-card__eyebrow">Cunha Finance · Fase 1</p>
        <h1>{title}</h1>
        <p>Este módulo está previsto na arquitetura oficial e será implementado nas próximas etapas da reconstrução.</p>
        <div className="planning-card__status"><span /> Módulo em planejamento</div>
      </section>
    </main>
  );
}
