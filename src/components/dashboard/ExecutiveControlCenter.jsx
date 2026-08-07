import CommercialOverview from "./CommercialOverview";
import ExecutivePanel from "./ExecutivePanel";
import MarketOverview from "./MarketOverview";
import MonthlyCashFlow from "./MonthlyCashFlow";
import OperationalOverview from "./OperationalOverview";
import QuickActions from "./QuickActions";
import RecentActivities from "./RecentActivities";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function FinancialOverview({ data }) {
  const items = [
    ["Receitas", data.totalReceitas, "lancamentos"], ["Despesas", data.totalDespesas, "lancamentos"],
    ["Resultado", data.resultado, "lancamentos"], ["Saldo atual", data.saldoAtual, "lancamentos"],
    ["Contas a receber", data.contasReceber, "recebimentos"], ["Contas a pagar", null, null],
  ];
  return <ExecutivePanel title="Financeiro" eyebrow="Fluxo consolidado" icon="$"><div className="financial-overview-grid">{items.map(([label, value, source]) => <article key={label}><span>{label}</span><strong>{source && data.sourceAvailable(source) ? currency.format(value) : "Sem dados disponíveis"}</strong></article>)}</div></ExecutivePanel>;
}

export default function ExecutiveControlCenter({ data, onNavigate }) {
  return <section className="control-center" aria-labelledby="control-center-title"><header className="control-center__heading"><span>Visão integrada</span><h2 id="control-center-title">Centro de Comando</h2></header><div className="control-center__grid">
    <FinancialOverview data={data} />
    <CommercialOverview data={data} onNavigate={onNavigate} />
    <OperationalOverview data={data} onNavigate={onNavigate} />
    <MonthlyCashFlow data={data} />
    <RecentActivities activities={data.recent} />
    <MarketOverview />
    <ExecutivePanel title="Atalhos rápidos" eyebrow="Acesso direto" icon="→" className="command-panel--quick"><QuickActions onNavigate={onNavigate} /></ExecutivePanel>
  </div></section>;
}
