import CommercialOverview from "./CommercialOverview";
import ExecutivePanel from "./ExecutivePanel";
import MarketOverview from "./MarketOverview";
import MonthlyCashFlow from "./MonthlyCashFlow";
import OperationalOverview from "./OperationalOverview";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function FinancialOverview({ data }) {
  const titles = data.financeiro_titulos.filter((item) => item.status !== "Cancelado");
  const payable = titles.filter((item) => item.tipo === "Pagar").reduce((sum, item) => sum + Number(item.saldo || 0), 0);
  const receivable = titles.filter((item) => item.tipo === "Receber").reduce((sum, item) => sum + Number(item.saldo || 0), 0);
  const items = [
    ["Receitas", data.totalReceitas, "lancamentos"], ["Despesas", data.totalDespesas, "lancamentos"],
    ["Resultado", data.resultado, "lancamentos"], ["Saldo atual", data.saldoAtual, "lancamentos"],
    ["Contas a receber", receivable, "financeiro_titulos"], ["Contas a pagar", payable, "financeiro_titulos"],
  ];
  return <ExecutivePanel title="Financeiro" eyebrow="Fluxo consolidado" icon="$"><div className="financial-overview-grid">{items.map(([label, value, source]) => <article key={label}><span>{label}</span><strong>{data.sourceAvailable(source) ? currency.format(value) : "—"}</strong><small>{data.sourceAvailable(source) ? "Dados persistidos" : "Aguardando integração"}</small></article>)}</div></ExecutivePanel>;
}

export default function ExecutiveControlCenter({ data, onNavigate }) {
  return <section className="control-center" aria-labelledby="control-center-title"><header className="control-center__heading"><span>Análise gerencial</span><h2 id="control-center-title">Desempenho por área</h2></header><div className="control-center__grid">
    <FinancialOverview data={data} />
    <CommercialOverview data={data} onNavigate={onNavigate} />
    <OperationalOverview data={data} onNavigate={onNavigate} />
    <MonthlyCashFlow data={data} />
    <MarketOverview />
  </div></section>;
}
