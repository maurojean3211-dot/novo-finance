import { formatMoney } from "../utils/money-calculations";

export default function PricingSummary({ simulation }) {
  const { inputs, update, pricing } = simulation;
  const alerts = [];
  if (pricing.custoItens === 0) alerts.push("Os itens não possuem custo cadastrado no catálogo.");
  if (pricing.precoFinal <= pricing.custoTotal) alerts.push("O preço final não cobre o custo total.");
  const metrics = [
    ["Custo dos itens", formatMoney(pricing.custoItens)], ["Custo/kg", formatMoney(pricing.custoKg)],
    ["Frete", formatMoney(pricing.frete)], ["Impostos", formatMoney(pricing.impostos)],
    ["Despesas", formatMoney(pricing.despesas)], ["Subtotal", formatMoney(pricing.subtotal)],
    ["Desconto", formatMoney(pricing.descontoValor)], ["Custo total", formatMoney(pricing.custoTotal)],
    ["Lucro bruto", formatMoney(pricing.lucroBruto)], ["Margem", `${pricing.margemBruta.toFixed(1)}%`],
    ["Markup", `${pricing.markup.toFixed(2)}×`], ["Preço final", formatMoney(pricing.precoFinal)],
  ];
  return <div className="pricing-layout">
    <section className="ops-panel pricing-simulator"><div className="ops-panel__header"><h2>Formação de preço</h2><span>Valores calculados com os itens do orçamento</span></div><div className="quote-form__grid">
      {["desconto", "frete", "impostos", "despesas"].map((field) => <label className="ops-field" key={field}><span>{field === "desconto" ? "Desconto (%)" : field[0].toUpperCase() + field.slice(1)}</span><input type="number" value={inputs[field]} onChange={(event) => update(field, event.target.value)} /></label>)}
    </div></section>
    <section className="pricing-grid">{metrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
    <section className="pricing-scenarios">{pricing.cenarios.map((item) => <article key={item.nome}><small>{item.nome}</small><strong>{formatMoney(item.valor)}</strong><span>Preço calculado sobre o custo total</span></article>)}</section>
    {alerts.length > 0 && <section className="quote-alerts">{alerts.map((alert) => <p key={alert}>! {alert}</p>)}</section>}
  </div>;
}
