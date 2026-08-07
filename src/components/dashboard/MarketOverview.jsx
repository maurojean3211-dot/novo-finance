import ExecutivePanel from "./ExecutivePanel";

export default function MarketOverview() {
  return <ExecutivePanel title="Mercado" eyebrow="Cenário externo" icon="↗" className="command-panel--market"><div className="market-command-placeholder"><div><span>USD/BRL</span><span>LME</span><span>Atualização</span><span>Histórico</span></div><p>Indicadores de mercado serão disponibilizados em breve.</p></div></ExecutivePanel>;
}
