import { indicadoresMercadoDemo } from "./marketData";

export default function MarketIndicators({ onAction }) {
  return (
    <article className="dashboard-panel market-panel">
      <div className="market-header">
        <div><span>Indicadores de mercado</span><h2>Dólar e LME do alumínio</h2></div>
        <span className="market-demo-badge">Dados demonstrativos</span>
      </div>
      <div className="market-content">
        <div className="market-quotes">
          {indicadoresMercadoDemo.cotacoes.map((cotacao) => (
            <div className="market-quote" key={cotacao.id}>
              <div className="market-quote__title"><span>{cotacao.id === "usd" ? "$" : "Al"}</span><div><strong>{cotacao.nome}</strong><small>{cotacao.codigo}</small></div></div>
              <div className="market-quote__value"><strong>{cotacao.valor}</strong><span className={`market-variation market-variation--${cotacao.tendencia}`}>{cotacao.variacaoDia} hoje</span></div>
              <dl><div><dt>Semana</dt><dd>{cotacao.variacaoSemana}</dd></div><div><dt>Mês</dt><dd>{cotacao.variacaoMes}</dd></div></dl>
            </div>
          ))}
        </div>
        <div className="market-meta">
          <div><span>Última atualização</span><strong>{indicadoresMercadoDemo.ultimaAtualizacao}</strong><small>{indicadoresMercadoDemo.fonte}</small></div>
          <div className="market-actions"><button onClick={() => onAction("A atualização manual de cotações")}>↻ Atualizar cotações</button><button onClick={() => onAction("O histórico de cotações")}>Ver histórico →</button></div>
        </div>
      </div>
    </article>
  );
}
