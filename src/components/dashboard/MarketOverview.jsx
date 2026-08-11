import ExecutivePanel from "./ExecutivePanel";

export default function MarketOverview() {
  return <ExecutivePanel title="Mercado" eyebrow="Cenário externo" icon="↗" className="command-panel--market"><div className="market-integrations"><article><span>USD/BRL</span><strong>Dólar</strong><small>Dados de mercado indisponíveis</small></article><article><span>Metais</span><strong>LME</strong><small>Dados de mercado indisponíveis</small></article></div></ExecutivePanel>;
}
