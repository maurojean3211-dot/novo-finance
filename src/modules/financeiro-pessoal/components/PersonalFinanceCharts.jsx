import { money } from "../utils/personalFinance";

export default function PersonalFinanceCharts({ months = [] }) {
  const max = Math.max(0, ...months.flatMap((item) => [item.income, item.expense]));
  const balances = months.map((item) => item.income - item.expense);
  const maxBalance = Math.max(0, ...balances.map(Math.abs));
  const hasData = months.some((item) => item.income || item.expense);

  return <section className="pf-charts"><article className="ops-panel"><div className="ops-panel__header"><h2>Evolução mensal</h2><span>Dados reais</span></div>{hasData ? <div className="pf-bars">{months.map((item) => <div key={item.key}><div><i style={{ height: `${max ? item.income / max * 100 : 0}%` }} /><b style={{ height: `${max ? item.expense / max * 100 : 0}%` }} /></div><small>{item.month}</small></div>)}</div> : <div className="pf-safe-empty">Nenhum lançamento disponível para o período.</div>}<footer><span className="income-dot" /> Receitas <span className="expense-dot" /> Gastos</footer></article><article className="ops-panel"><div className="ops-panel__header"><h2>Saldo mensal</h2><span>Últimos meses</span></div>{hasData ? <div className="pf-balance-list">{months.slice(-4).map((item) => { const balance = item.income - item.expense; return <div key={item.key}><span>{item.month}</span><strong>{money(balance)}</strong><i style={{ width: `${maxBalance ? Math.abs(balance) / maxBalance * 100 : 0}%` }} /></div>; })}</div> : <div className="pf-safe-empty">Sem dados suficientes para o gráfico.</div>}</article></section>;
}
