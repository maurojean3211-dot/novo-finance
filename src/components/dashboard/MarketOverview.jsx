import ExecutivePanel from "./ExecutivePanel";

export default function MarketOverview() {
  return <ExecutivePanel title="Mercado" eyebrow="Cenário externo" icon="↗" className="command-panel--market"><div className="market-integrations"><article><span>USD/BRL</span><strong>Dólar</strong><small>Aguardando integração</small></article><article><span>Metais</span><strong>LME</strong><small>Aguardando integração</small></article></div></ExecutivePanel>;
}
