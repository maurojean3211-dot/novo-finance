import { useEffect, useMemo, useState } from "react";
import PersonalFinanceHeader from "../components/PersonalFinanceHeader";
import PersonalFinanceMetrics from "../components/PersonalFinanceMetrics";
import { usePersonalExpensesRead, usePersonalIncomesRead } from "../hooks/usePersonalFinanceRead";
import { money } from "../utils/personalFinance";
import { loadPersonalFinanceServerTime } from "../services/personalFinance.service";
import { buildPersonalFinanceReportData, calculatePersonalPeriodBalances, generatePersonalFinanceReport } from "../../../services/reportPdf.service";

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const dateValue = (record) => String(record.data_lancamento || "").slice(0, 10);
const monthValue = (record) => dateValue(record).slice(0, 7);
const monthLabel = (month) => month ? new Date(`${month}-02T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(" de ", "/") : "—";

function TransactionsPanel({ records }) {
  return <section className="ops-panel pf-payables-report"><div className="ops-panel__header"><h2>Detalhamento dos lançamentos</h2><span>{records.length} lançamento(s)</span></div>{records.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria/origem</th><th>Valor</th></tr></thead><tbody>{records.map((item, index) => <tr key={`${item.type}-${item.date}-${index}`}><td>{item.date}</td><td>{item.type}</td><td>{item.description}</td><td>{item.detail}</td><td>{item.value}</td></tr>)}</tbody></table></div> : <div className="pf-report-empty">Nenhum lançamento no período selecionado.</div>}</section>;
}

function groupByCategory(records) {
  return Object.entries(records.reduce((groups, record) => {
    const category = record.categoria || "Sem categoria";
    groups[category] = (groups[category] || 0) + Number(record.valor || 0);
    return groups;
  }, {})).sort((a, b) => b[1] - a[1]);
}

function CategoryPanel({ title, records, emptyText }) {
  const groups = groupByCategory(records);
  const max = Math.max(1, ...groups.map(([, value]) => value));
  return <article className="ops-panel pf-real-report"><div className="ops-panel__header"><h2>{title}</h2><span>{groups.length} categoria(s)</span></div>{groups.length ? <div className="pf-category-report">{groups.map(([category, value]) => <div key={category}><header><span>{category}</span><strong>{money(value)}</strong></header><i><b style={{ width: `${value / max * 100}%` }} /></i></div>)}</div> : <div className="pf-report-empty">{emptyText}</div>}</article>;
}

export default function RelatoriosPessoaisPage({ empresaId, userId }) {
  const incomes = usePersonalIncomesRead(empresaId, userId);
  const expenses = usePersonalExpensesRead(empresaId, userId);
  const [filters, setFilters] = useState({ month: currentMonth, start: "", end: "" });
  const [serverNow, setServerNow] = useState(null);
  const [serverDateError, setServerDateError] = useState("");
  const [pdfFeedback, setPdfFeedback] = useState("");
  useEffect(() => { let active = true; void loadPersonalFinanceServerTime().then((value) => { if (active) { setServerNow(value); setServerDateError(""); } }).catch((cause) => { if (active) setServerDateError(cause.message || "Não foi possível obter a data do servidor."); }); return () => { active = false; }; }, []);
  const periodBalances = useMemo(() => calculatePersonalPeriodBalances({ incomes: incomes.records, expenses: expenses.records, empresaId, userId, filters }), [empresaId, expenses.records, filters, incomes.records, userId]);
  const { filteredIncomes, filteredExpenses, filteredInvestments, inflowTotal, outflowTotal, investmentTotal, periodResult } = periodBalances;
  const consolidated = useMemo(() => serverNow ? buildPersonalFinanceReportData({ incomes: incomes.records, expenses: expenses.records, empresaId, userId, filters, serverNow }) : null, [empresaId, expenses.records, filters, incomes.records, serverNow, userId]);
  const loading = incomes.loading || expenses.loading;
  const errors = [incomes.error, expenses.error].filter(Boolean);

  const monthly = useMemo(() => {
    const groups = new Map();
    [...filteredIncomes, ...filteredExpenses, ...filteredInvestments].forEach((record) => {
      const month = monthValue(record);
      if (!month) return;
      const current = groups.get(month) || { month, income: 0, expense: 0, investment: 0 };
      current[record.tipo === "receita" ? "income" : filteredInvestments.includes(record) ? "investment" : "expense"] += Number(record.valor || 0);
      groups.set(month, current);
    });
    return [...groups.values()].sort((a, b) => a.month.localeCompare(b.month)).map((item) => ({ ...item, balance: item.income - item.expense }));
  }, [filteredExpenses, filteredIncomes, filteredInvestments]);
  const chartMax = Math.max(1, ...monthly.flatMap((item) => [item.income, item.expense, Math.abs(item.balance)]));

  function setMonth(month) { setFilters({ month, start: "", end: "" }); }
  function setRange(key, value) { setFilters((current) => ({ ...current, month: "", [key]: value })); }
  function clearFilters() { setFilters({ month: "", start: "", end: "" }); }
  function generatePdf() {
    if (!serverNow) { setPdfFeedback(serverDateError || "Aguarde a referência de data do servidor."); return; }
    const generated = generatePersonalFinanceReport({ incomes: incomes.records, expenses: expenses.records, empresaId, userId, filters, serverNow });
    setPdfFeedback(generated ? "PDF gerado com os dados pessoais filtrados." : "Nenhum dado encontrado para gerar o PDF.");
  }

  return <main className="ops-page pf-page pf-reports-page"><PersonalFinanceHeader title="Relatório Financeiro Pessoal do Período" description="Receitas, despesas, investimentos e compromissos pessoais somente do intervalo selecionado." />
    <div className="pf-demo-badge">Dados reais do Financeiro Pessoal · visualização somente leitura</div>
    <section className="ops-panel pf-report-filters"><label>Mês<input type="month" value={filters.month} onChange={(event) => setMonth(event.target.value)} /></label><span>ou</span><label>De<input type="date" value={filters.start} onChange={(event) => setRange("start", event.target.value)} /></label><label>Até<input type="date" value={filters.end} onChange={(event) => setRange("end", event.target.value)} /></label><button type="button" onClick={clearFilters}>Todo o período</button><button type="button" className="primary" onClick={generatePdf} disabled={loading || !serverNow}>Gerar PDF</button></section>
    {(serverDateError || pdfFeedback) && <section className="ops-status-panel">{serverDateError || pdfFeedback}</section>}
    {errors.length > 0 && <section className="ops-status-panel">Não foi possível carregar parte dos dados pessoais: {errors.join(" · ")}</section>}
    {loading && <section className="ops-status-panel">Carregando dados pessoais existentes…</section>}
    <PersonalFinanceMetrics items={[{ label: "Entradas do mês", value: money(inflowTotal), detail: `${filteredIncomes.length} receita(s)`, icon: "↗", tone: "green" }, { label: "Despesas do mês", value: money(outflowTotal), detail: `${filteredExpenses.length} despesa(s)`, icon: "↘", tone: "amber" }, { label: "Investimentos do mês", value: money(investmentTotal), detail: `${filteredInvestments.length} investimento(s)`, icon: "◇", tone: "amber" }, { label: "Saldo do mês", value: money(periodResult), detail: "entradas menos despesas", icon: "=", tone: periodResult >= 0 ? "green" : "rose" }]} />
    {monthly.length > 1 && <section className="ops-panel pf-payables-report"><div className="ops-panel__header"><h2>Resumo por mês</h2><span>{monthly.length} meses</span></div><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Mês</th><th>Entradas</th><th>Despesas</th><th>Investimentos</th><th>Saldo do mês</th></tr></thead><tbody>{monthly.map((item) => <tr key={item.month}><td>{monthLabel(item.month)}</td><td>{money(item.income)}</td><td>{money(item.expense)}</td><td>{money(item.investment)}</td><td>{money(item.balance)}</td></tr>)}</tbody></table></div></section>}
    <section className="pf-report-chart-grid"><article className="ops-panel pf-real-report"><div className="ops-panel__header"><h2>Receitas x despesas</h2><span>Comparação mensal</span></div>{monthly.length ? <div className="pf-real-bars">{monthly.map((item) => <div key={item.month}><div><i style={{ height: `${item.income / chartMax * 100}%` }} title={`Receitas ${money(item.income)}`} /><b style={{ height: `${item.expense / chartMax * 100}%` }} title={`Despesas ${money(item.expense)}`} /></div><small>{monthLabel(item.month)}</small></div>)}</div> : <div className="pf-report-empty">Nenhuma receita ou despesa real no período selecionado.</div>}<footer><span className="income-dot" /> Receitas <span className="expense-dot" /> Despesas</footer></article>
      <CategoryPanel title="Despesas por categoria" records={filteredExpenses} emptyText="Nenhuma despesa categorizada no período." /></section>
    <section className="pf-report-chart-grid"><CategoryPanel title="Receitas por categoria/origem" records={filteredIncomes} emptyText="Nenhuma receita real categorizada no período." /></section>
    <TransactionsPanel records={(consolidated?.pdf.rows || []).filter((item) => item.type !== "Resumo mensal")} />
  </main>;
}
