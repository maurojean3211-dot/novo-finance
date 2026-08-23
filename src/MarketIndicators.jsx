import { formatMarketValue, marketQuoteDetail, useMarketData } from "./marketData";

export default function MarketIndicators({ onAction }) {
  const { quotes, reload } = useMarketData();

  return (
    <article className="dashboard-panel market-panel">
      <div className="market-header">
        <div><span>Indicadores de mercado</span><h2>Dólar, Euro e LME do alumínio</h2></div>
        <span className="market-demo-badge">Referência oficial PTAX</span>
      </div>
      <div className="market-content">
        <div className="market-quotes">
          {quotes.map((cotacao) => (
            <div className="market-quote" key={cotacao.id}>
              <div className="market-quote__title"><span>{cotacao.icon}</span><div><strong>{cotacao.name}</strong><small>{cotacao.pair}</small></div></div>
              <div className="market-quote__value"><strong>{formatMarketValue(cotacao) ?? marketQuoteDetail(cotacao)}</strong></div>
              <small>{cotacao.status === "available" ? `${cotacao.source} · referência ${cotacao.reference}` : marketQuoteDetail(cotacao)}</small>
            </div>
          ))}
        </div>
        <div className="market-meta">
          <div><span>Fonte</span><strong>Banco Central do Brasil</strong><small>Fechamento PTAX oficial; não é cotação comercial intraday.</small></div>
          <div className="market-actions"><button onClick={reload}>↻ Atualizar cotações</button><button onClick={() => onAction("O histórico de cotações")}>Ver histórico →</button></div>
        </div>
      </div>
    </article>
  );
}
