import { DEMO_MONTHS } from "../services/personalFinance.demo";
import { money } from "../utils/personalFinance";
export default function PersonalFinanceCharts() {
  const max = Math.max(...DEMO_MONTHS.flatMap((item) => [item.income, item.expense]));
  return <section className="pf-charts"><article className="ops-panel"><div className="ops-panel__header"><h2>Evolução mensal</h2><span>Dados demonstrativos</span></div><div className="pf-bars">{DEMO_MONTHS.map((item) => <div key={item.month}><div><i style={{ height: `${item.income / max * 100}%` }} /><b style={{ height: `${item.expense / max * 100}%` }} /></div><small>{item.month}</small></div>)}</div><footer><span className="income-dot" /> Receitas <span className="expense-dot" /> Gastos</footer></article><article className="ops-panel"><div className="ops-panel__header"><h2>Saldo acumulado</h2><span>Últimos meses</span></div><div className="pf-balance-list">{DEMO_MONTHS.slice(-4).map((item) => <div key={item.month}><span>{item.month}</span><strong>{money(item.income - item.expense)}</strong><i style={{ width: `${(item.income - item.expense) / 45}%` }} /></div>)}</div></article></section>;
}
