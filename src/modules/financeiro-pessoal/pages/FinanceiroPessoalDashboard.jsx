import useCompanyScope from "../../../app/providers/useCompanyScope";
import PersonalFinanceCharts from "../components/PersonalFinanceCharts";
import PersonalFinanceHeader from "../components/PersonalFinanceHeader";
import PersonalFinanceMetrics from "../components/PersonalFinanceMetrics";
import PersonalFinanceSummary from "../components/PersonalFinanceSummary";
import { usePersonalExpensesRead, usePersonalFixedExpensesRead, usePersonalIncomesRead, usePersonalPayablesRead } from "../hooks/usePersonalFinanceRead";
import { dateLabel, money } from "../utils/personalFinance";

const monthKey = (value) => String(value || "").slice(0, 7);
const sum = (records) => records.reduce((total, item) => total + Number(item.valor || 0), 0);

function recentMonths(total = 6) {
  const now = new Date();
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - total + index + 1, 1);
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "") };
  });
}

export default function FinanceiroPessoalDashboard() {
  const { empresaId, userId } = useCompanyScope();
  const incomes = usePersonalIncomesRead(empresaId);
  const expenses = usePersonalExpensesRead(empresaId);
  const fixed = usePersonalFixedExpensesRead(empresaId);
  const payables = usePersonalPayablesRead(empresaId, userId);
  const currentMonth = monthKey(new Date().toISOString());
  const currentIncomes = incomes.records.filter((item) => monthKey(item.data_lancamento) === currentMonth);
  const currentExpenses = expenses.records.filter((item) => monthKey(item.data_lancamento) === currentMonth);
  const pending = payables.records.filter((item) => item.status === "Pendente");
  const currentPending = pending.filter((item) => monthKey(item.vencimento) === currentMonth);
  const activeFixed = fixed.records.filter((item) => item.ativo !== false);
  const received = sum(currentIncomes);
  const paidExpense = sum(currentExpenses);
  const plannedExpense = sum(currentPending) + sum(activeFixed);
  const realizedBalance = received - paidExpense;
  const projectedBalance = realizedBalance - plannedExpense;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const inSevenDays = new Date(today); inSevenDays.setDate(today.getDate() + 7);
  const dueSoon = pending.filter((item) => { const due = new Date(`${item.vencimento}T00:00:00`); return due >= today && due <= inSevenDays; });
  const overdue = pending.filter((item) => new Date(`${item.vencimento}T00:00:00`) < today);
  const months = recentMonths().map((month) => ({ ...month, income: sum(incomes.records.filter((item) => monthKey(item.data_lancamento) === month.key)), expense: sum(expenses.records.filter((item) => monthKey(item.data_lancamento) === month.key)) }));
  const current = months.at(-1) || { income: 0, expense: 0 };
  const previous = months.at(-2) || { income: 0, expense: 0 };
  const largestExpenses = Object.entries(currentExpenses.reduce((totals, item) => ({ ...totals, [item.categoria || "Sem categoria"]: (totals[item.categoria || "Sem categoria"] || 0) + Number(item.valor || 0) }), {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const loading = incomes.loading || expenses.loading || fixed.loading || payables.loading;
  const errors = [incomes.error, expenses.error, fixed.error, payables.error].filter(Boolean);

  return <main className="ops-page pf-page"><PersonalFinanceHeader title="Visão Geral Pessoal" description="Receitas e gastos pessoais calculados a partir dos registros existentes." />
    <div className="pf-demo-badge">{loading ? "Carregando dados financeiros reais…" : errors.length ? "Algumas fontes não puderam ser carregadas." : "Dados reais do Financeiro Pessoal"}</div>
    <PersonalFinanceMetrics items={[{ label: "Receitas registradas", value: money(received), detail: "mês atual", icon: "↗", tone: "green" }, { label: "Gastos realizados", value: money(paidExpense), detail: "mês atual", icon: "✓" }, { label: "Gastos previstos", value: money(plannedExpense), detail: "pendentes e contas fixas", icon: "↘", tone: "amber" }, { label: "Saldo realizado", value: money(realizedBalance), detail: "mês atual", icon: "R$", tone: realizedBalance >= 0 ? "green" : "rose" }, { label: "Saldo projetado", value: money(projectedBalance), detail: "após compromissos", icon: "◎", tone: projectedBalance >= 0 ? "green" : "rose" }, { label: "Contas vencendo", value: String(dueSoon.length), detail: "próximos 7 dias", icon: "◷" }, { label: "Contas atrasadas", value: String(overdue.length), detail: "requer atenção", icon: "!", tone: overdue.length ? "rose" : undefined }, { label: "Renda comprometida", value: received ? `${Math.round(plannedExpense / received * 100)}%` : "0%", detail: "compromissos do mês", icon: "%", tone: "amber" }]} />
    <PersonalFinanceCharts months={months} />
    <section className="pf-summary-grid">
      <PersonalFinanceSummary title="Próximos vencimentos" subtitle="Contas reais"><ul>{dueSoon.slice(0, 5).map((item) => <li key={item.id}><span>{item.fornecedor || item.descricao || "Conta"}</span><b>{dateLabel(item.vencimento)} · {money(item.valor)}</b></li>)}{!dueSoon.length && <li><span>Nenhum vencimento nos próximos 7 dias.</span></li>}</ul></PersonalFinanceSummary>
      <PersonalFinanceSummary title="Receitas do mês" subtitle="Registros reais"><ul>{currentIncomes.slice(0, 5).map((item) => <li key={item.id}><span>{item.descricao || "Receita"}</span><b>{money(item.valor)}</b></li>)}{!currentIncomes.length && <li><span>Nenhuma receita registrada neste mês.</span></li>}</ul></PersonalFinanceSummary>
      <PersonalFinanceSummary title="Maiores gastos" subtitle="Mês atual"><ul>{largestExpenses.map(([category, value]) => <li key={category}><span>{category}</span><b>{money(value)}</b></li>)}{!largestExpenses.length && <li><span>Nenhuma despesa registrada neste mês.</span></li>}</ul></PersonalFinanceSummary>
      <PersonalFinanceSummary title="Resumo fixas" subtitle="Base ativa"><div className="pf-big-number"><strong>{money(sum(activeFixed))}</strong><small>{activeFixed.length} conta(s) ativa(s)</small></div></PersonalFinanceSummary>
    </section>
    <div className="pf-month-comparison">Saldo anterior: <strong>{money(previous.income - previous.expense)}</strong> · Saldo atual: <strong>{money(current.income - current.expense)}</strong></div>
  </main>;
}
