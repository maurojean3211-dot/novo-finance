const features = ["Leitura Inteligente de PDF", "Correspondências encontradas", "Materiais equivalentes", "Preço sugerido", "Margem calculada"];

export default function FutureIntelligence() {
  return (
    <section className="future-intelligence">
      <div className="future-intelligence__header"><span>✦</span><div><p>Preparação para IA</p><h2>Recursos inteligentes</h2></div></div>
      <div className="future-intelligence__grid">{features.map((feature) => <article key={feature}><span>◇</span><strong>{feature}</strong><small>Módulo em desenvolvimento</small></article>)}</div>
    </section>
  );
}
