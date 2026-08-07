import ExecutivePanel from "./ExecutivePanel";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function OperationalOverview({ data, onNavigate }) {
  const available = data.sourceAvailable("compras");
  const modules = [
    ["Total comprado", available && data.compras.length ? currency.format(data.totalCompras) : null],
    ["Quantidade", available && data.compras.length ? data.compras.length : null],
    ["Peso total", available && data.compras.length ? `${data.pesoCompras.toLocaleString("pt-BR")} kg` : null],
    ["Comissão", available && data.compras.length ? currency.format(data.comissaoCompras) : null],
  ];
  return <ExecutivePanel title="Compras" eyebrow="Aquisições no período" icon="▧"><div className="operation-highlight"><span>Indicadores reais do módulo</span><button type="button" onClick={() => onNavigate("compras")}>Abrir compras →</button></div><div className="command-kpis command-kpis--four">{modules.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value ?? "Sem dados disponíveis"}</strong></article>)}</div></ExecutivePanel>;
}
