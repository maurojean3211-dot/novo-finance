import ExecutivePanel from "./ExecutivePanel";
import { formatMarketValue, marketQuoteDetail, useMarketData } from "../../marketData";

export default function MarketOverview() {
  const { quotes } = useMarketData();

  return (
    <ExecutivePanel
      title="Mercado"
      eyebrow="Cenário externo"
      icon="↗"
      className="command-panel--market"
    >
      <div className="market-integrations">
        {quotes.map((quote) => (
          <article key={quote.id} title={quote.source ?? quote.error ?? undefined}>
            <span>{quote.pair}</span>
            <strong>{formatMarketValue(quote) ?? quote.name}</strong>
            <small>{marketQuoteDetail(quote)}</small>
          </article>
        ))}
      </div>
    </ExecutivePanel>
  );
}
