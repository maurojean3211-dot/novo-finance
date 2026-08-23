import { useMemo, useState } from "react";
import PersonalFinanceHeader from "../components/PersonalFinanceHeader";
import PersonalFinanceMetrics from "../components/PersonalFinanceMetrics";
import { usePersonalExpensesRead, usePersonalFixedExpensesRead, usePersonalIncomesRead, usePersonalPayablesRead, usePersonalPaymentEventsRead } from "../hooks/usePersonalFinanceRead";
import { dateLabel, money } from "../utils/personalFinance";

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const valueOf = (records) => records.reduce((sum, item) => sum + Number(item.valor || 0), 0);
const dateValue = (record) => String(record.data_lancamento || "").slice(0, 10);
const monthValue = (record) => dateValue(record).slice(0, 7);
const monthLabel = (month) => month ? new Date(`${month}-02T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(" de ", "/") : "—";

function filterByPeriod(records, filters, getDate = dateValue) {
  return records.filter((record) => {
    const date = getDate(record);
    if (!date) return !filters.month && !filters.start && !filters.end;
    if (filters.month && date.slice(0, 7) !== filters.month) return false;
    if (!filters.month && filters.start && date < filters.start) return false;
    if (!filters.month && filters.end && date > filters.end) return false;
    return true;
  });
}

function PayablesPanel({ records }) {
  const statuses = ["Pago", "Pendente", "Cancelada"].map((status) => {
    const matches = records.filter((item) => item.status === status);
    return { status, count: matches.length, total: valueOf(matches) };
  });
  return <section className="ops-panel pf-payables-report"><div className="ops-panel__header"><div><h2>Contas a Pagar Pessoais</h2><span>Valores somados por parcela; o total da compra é apenas metadado</span></div><span>{records.length} conta(s) no período</span></div><div className="pf-payables-report__summary">{statuses.map((item) => <article key={item.status}><span>{item.status}</span><strong>{money(item.total)}</strong><small>{item.count} conta(s)</small></article>)}</div>{records.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Vencimento</th><th>Fornecedor</th><th>Descrição</th><th>Parcela</th><th>Status</th><th>Valor</th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td>{dateLabel(item.vencimento)}</td><td>{item.fornecedor || "—"}</td><td>{item.descricao || "—"}</td><td>{item.grupo_parcelamento_id ? `${item.parcela_numero}/${item.parcelas_total}` : "—"}</td><td><span className={`pf-status ${item.status === "Pago" ? "paid" : item.status === "Cancelada" ? "late" : "pending"}`}>{item.status}</span></td><td>{money(item.valor)}</td></tr>)}</tbody></table></div> : <div className="pf-report-empty">Nenhuma conta a pagar pessoal com vencimento no período selecionado.</div>}</section>;
}

function PaymentEventsPanel({ events, payables }) {
  return <section className="ops-panel pf-payables-report"><div className="ops-panel__header"><div><h2>Eventos reais de pagamento</h2><span>Sem reconstrução dos pagamentos históricos anteriores</span></div><span>{events.length} evento(s)</span></div>{events.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Tipo</th><th>Obrigação</th><th>Nominal</th><th>Efetivo</th><th>Economia</th><th>Observação</th></tr></thead><tbody>{events.map((event) => { const payable = payables.find((item) => item.id === event.conta_pagar_pessoal_id); return <tr key={event.id}><td>{dateLabel(event.pago_em)}</td><td>{event.tipo}</td><td>{payable?.descricao || payable?.fornecedor || "—"}{payable?.grupo_parcelamento_id ? ` · ${payable.parcela_numero}/${payable.parcelas_total}` : ""}</td><td>{money(event.valor_nominal)}</td><td>{money(event.valor_pago)}</td><td>{money(event.desconto_obtido)}</td><td>{event.observacoes || "—"}</td></tr>; })}</tbody></table></div> : <div className="pf-report-empty">Nenhum evento novo no período. Pagamentos legados permanecem sem dados inventados.</div>}</section>;
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
  const incomes = usePersonalIncomesRead(empresaId);
  const expenses = usePersonalExpensesRead(empresaId);
  const fixedExpenses = usePersonalFixedExpensesRead(empresaId);
  const payables = usePersonalPayablesRead(empresaId, userId);
  const paymentEvents = usePersonalPaymentEventsRead(empresaId, userId);
  const [filters, setFilters] = useState({ month: currentMonth, start: "", end: "" });
  const filteredIncomes = useMemo(() => filterByPeriod(incomes.records, filters), [incomes.records, filters]);
  const filteredExpenses = useMemo(() => filterByPeriod(expenses.records, filters), [expenses.records, filters]);
  const filteredPayables = useMemo(() => filterByPeriod(payables.records, filters, (record) => String(record.vencimento || "").slice(0, 10)), [payables.records, filters]);
  const filteredPaymentEvents = useMemo(() => filterByPeriod(paymentEvents.records, filters, (record) => String(record.pago_em || "").slice(0, 10)), [paymentEvents.records, filters]);
  const reversedIds = useMemo(() => new Set(paymentEvents.records.filter((event) => event.tipo === "Estorno").map((event) => event.estorno_de_evento_id)), [paymentEvents.records]);
  const activePaymentEvents = filteredPaymentEvents.filter((event) => ["Pagamento", "Antecipacao"].includes(event.tipo) && !reversedIds.has(event.id));
  const effectiveOutflow = activePaymentEvents.reduce((sum, event) => sum + Number(event.valor_pago || 0), 0);
  const savings = activePaymentEvents.reduce((sum, event) => sum + Number(event.desconto_obtido || 0), 0);
  const incomeTotal = valueOf(filteredIncomes);
  const expenseTotal = valueOf(filteredExpenses);
  const balance = incomeTotal - expenseTotal;
  const fixedMonthly = valueOf(fixedExpenses.records.filter((item) => item.ativo !== false));
  const payablesTotal = valueOf(filteredPayables);
  const paidPayables = filteredPayables.filter((item) => item.status === "Pago");
  const pendingPayables = filteredPayables.filter((item) => item.status === "Pendente");
  const loading = incomes.loading || expenses.loading || fixedExpenses.loading || payables.loading || paymentEvents.loading;
  const errors = [incomes.error, expenses.error, fixedExpenses.error, payables.error, paymentEvents.error].filter(Boolean);

  const monthly = useMemo(() => {
    const groups = new Map();
    [...filteredIncomes, ...filteredExpenses].forEach((record) => {
      const month = monthValue(record);
      if (!month) return;
      const current = groups.get(month) || { month, income: 0, expense: 0 };
      current[record.tipo === "receita" ? "income" : "expense"] += Number(record.valor || 0);
      groups.set(month, current);
    });
    return [...groups.values()].sort((a, b) => a.month.localeCompare(b.month)).reduce((result, item) => {
      const balance = item.income - item.expense;
      const accumulated = (result.at(-1)?.accumulated || 0) + balance;
      return [...result, { ...item, balance, accumulated }];
    }, []);
  }, [filteredExpenses, filteredIncomes]);
  const chartMax = Math.max(1, ...monthly.flatMap((item) => [item.income, item.expense, Math.abs(item.accumulated)]));

  function setMonth(month) { setFilters({ month, start: "", end: "" }); }
  function setRange(key, value) { setFilters((current) => ({ ...current, month: "", [key]: value })); }
  function clearFilters() { setFilters({ month: "", start: "", end: "" }); }

  return <main className="ops-page pf-page"><PersonalFinanceHeader title="Relatórios Pessoais" description="Receitas, despesas e compromissos pessoais consolidados sem dados empresariais." />
    <div className="pf-demo-badge">Dados reais do Financeiro Pessoal · visualização somente leitura</div>
    <section className="ops-panel pf-report-filters"><label>Mês<input type="month" value={filters.month} onChange={(event) => setMonth(event.target.value)} /></label><span>ou</span><label>De<input type="date" value={filters.start} onChange={(event) => setRange("start", event.target.value)} /></label><label>Até<input type="date" value={filters.end} onChange={(event) => setRange("end", event.target.value)} /></label><button type="button" onClick={clearFilters}>Todo o período</button></section>
    {errors.length > 0 && <section className="ops-status-panel">Não foi possível carregar parte dos dados pessoais: {errors.join(" · ")}</section>}
    {loading && <section className="ops-status-panel">Carregando dados pessoais existentes…</section>}
    <PersonalFinanceMetrics items={[{ label: "Receitas no período", value: money(incomeTotal), detail: `${filteredIncomes.length} lançamento(s)`, icon: "↗", tone: "green" }, { label: "Despesas no período", value: money(expenseTotal), detail: `${filteredExpenses.length} lançamento(s)`, icon: "↘", tone: "amber" }, { label: "Saldo do período", value: money(balance), detail: balance >= 0 ? "resultado positivo" : "resultado negativo", icon: "R$", tone: balance >= 0 ? "green" : "rose" }, { label: "Contas fixas mensais", value: money(fixedMonthly), detail: `${fixedExpenses.records.length} conta(s) existente(s)`, icon: "🔁" }, { label: "Contas a pagar no período", value: money(payablesTotal), detail: `${filteredPayables.length} conta(s)`, icon: "◷" }]} />
    <section className="pf-payables-report__totals"><article><span>Pago</span><strong>{money(valueOf(paidPayables))}</strong><small>{paidPayables.length} conta(s)</small></article><article><span>Pendente</span><strong>{money(valueOf(pendingPayables))}</strong><small>{pendingPayables.length} conta(s)</small></article></section>
    <section className="pf-payables-report__totals"><article><span>Desembolso efetivo em eventos</span><strong>{money(effectiveOutflow)}</strong><small>Somente pagamentos novos não estornados</small></article><article><span>Economia por antecipação</span><strong>{money(savings)}</strong><small>Desconto real registrado</small></article></section>
    <section className="pf-report-chart-grid"><article className="ops-panel pf-real-report"><div className="ops-panel__header"><h2>Receitas x despesas</h2><span>Comparação mensal</span></div>{monthly.length ? <div className="pf-real-bars">{monthly.map((item) => <div key={item.month}><div><i style={{ height: `${item.income / chartMax * 100}%` }} title={`Receitas ${money(item.income)}`} /><b style={{ height: `${item.expense / chartMax * 100}%` }} title={`Despesas ${money(item.expense)}`} /></div><small>{monthLabel(item.month)}</small></div>)}</div> : <div className="pf-report-empty">Nenhuma receita ou despesa real no período selecionado.</div>}<footer><span className="income-dot" /> Receitas <span className="expense-dot" /> Despesas</footer></article>
      <article className="ops-panel pf-real-report"><div className="ops-panel__header"><h2>Evolução do saldo</h2><span>Acumulado no período</span></div>{monthly.length ? <div className="pf-balance-report">{monthly.map((item) => <div key={item.month}><span>{monthLabel(item.month)}</span><i><b className={item.accumulated < 0 ? "negative" : ""} style={{ width: `${Math.abs(item.accumulated) / chartMax * 100}%` }} /></i><strong>{money(item.accumulated)}</strong></div>)}</div> : <div className="pf-report-empty">Sem saldo mensal para apresentar.</div>}</article></section>
    <section className="pf-report-chart-grid"><CategoryPanel title="Despesas por categoria" records={filteredExpenses} emptyText="Nenhuma despesa real categorizada no período." /><CategoryPanel title="Receitas por categoria/origem" records={filteredIncomes} emptyText="Nenhuma receita real categorizada no período." /></section>
    <PayablesPanel records={filteredPayables} />
    <PaymentEventsPanel events={filteredPaymentEvents} payables={payables.records} />
  </main>;
}
