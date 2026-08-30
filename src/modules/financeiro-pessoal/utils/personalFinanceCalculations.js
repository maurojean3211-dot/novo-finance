const numberValue = (value) => Number(value || 0);

export function isManualPersonalExpense(item) {
  return item?.tipo === "despesa" && !item.pagamento_evento_id && item.ativo !== false;
}

export function manualPersonalExpenses(records = []) {
  return records.filter(isManualPersonalExpense);
}

export function activePaymentEvents(events = []) {
  const reversed = new Set(events.filter((event) => event.tipo === "Estorno" && event.estorno_de_evento_id).map((event) => String(event.estorno_de_evento_id)));
  return events.filter((event) => ["Pagamento", "Antecipacao", "Entrada"].includes(event.tipo) && !reversed.has(String(event.id)));
}

export function personalPaymentTotals(events = []) {
  const active = activePaymentEvents(events);
  const sum = (items, field) => items.reduce((total, item) => total + numberValue(item[field]), 0);
  const payments = active.filter((event) => event.tipo === "Pagamento");
  const downPayments = active.filter((event) => event.tipo === "Entrada");
  const anticipations = active.filter((event) => event.tipo === "Antecipacao");
  return {
    active,
    payments,
    downPayments,
    anticipations,
    paymentTotal: sum(payments, "valor_pago"),
    downPaymentTotal: sum(downPayments, "valor_pago"),
    anticipationTotal: sum(anticipations, "valor_pago"),
    savings: sum(anticipations, "desconto_obtido"),
    effectiveOutflow: sum(active, "valor_pago"),
  };
}

function monthIndex(value) {
  const match = /^(\d{4})-(\d{2})/.exec(String(value || ""));
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
}

export function fixedExpenseOccursInMonth(item, month) {
  if (item?.ativo === false) return false;
  const base = monthIndex(item?.data_inicio || item?.data_base);
  const target = monthIndex(month);
  if (base == null || target == null || target < base) return false;
  const end = monthIndex(item?.data_fim);
  if (end != null && target > end) return false;
  const interval = item?.frequencia === "Anual" ? 12 : item?.frequencia === "Trimestral" ? 3 : 1;
  return (target - base) % interval === 0;
}

export function fixedExpensesForMonth(records = [], month) {
  return records.filter((item) => fixedExpenseOccursInMonth(item, month));
}

export function fixedExpenseOccurrences(records = [], filters = {}) {
  if (filters.month) return fixedExpensesForMonth(records, filters.month).map((item) => ({ ...item, competencia: filters.month }));
  if (!filters.start && !filters.end) return records.filter((item) => item.ativo !== false);
  const start = String(filters.start || filters.end).slice(0, 7);
  const end = String(filters.end || filters.start).slice(0, 7);
  const startIndex = monthIndex(start);
  const endIndex = monthIndex(end);
  if (startIndex == null || endIndex == null || startIndex > endIndex) return [];
  const occurrences = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const month = `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`;
    fixedExpensesForMonth(records, month).forEach((item) => occurrences.push({ ...item, competencia: month }));
  }
  return occurrences;
}

export function budgetByCategory({ budgets = [], expenses = [], categories = [], month }) {
  const categoryMap = new Map(categories.map((item) => [item.id, item]));
  const spent = new Map();
  expenses.filter((item) => item.ativo !== false && String(item.data_lancamento || "").slice(0, 7) === month)
    .forEach((item) => spent.set(item.categoria_id || item.categoria || "uncategorized", (spent.get(item.categoria_id || item.categoria || "uncategorized") || 0) + numberValue(item.valor)));
  return budgets.filter((item) => String(item.competencia || "").slice(0, 7) === month).map((budget) => {
    const category = categoryMap.get(budget.categoria_id);
    const planned = numberValue(budget.valor_previsto);
    const realized = spent.get(budget.categoria_id) || 0;
    const available = planned - realized;
    const percentage = planned > 0 ? Math.round(realized / planned * 10000) / 100 : realized > 0 ? 100 : 0;
    return { ...budget, categoria: category?.nome || "Sem categoria", classificacao: category?.classificacao || "Variável não essencial", planned, realized, available, percentage, exceeded: Math.max(0, realized - planned), status: percentage > 100 ? "exceeded" : percentage >= 80 ? "warning" : "normal" };
  });
}

export function totalsByClassification(records = [], valueField = "valor") {
  return records.reduce((totals, item) => {
    const key = item.classificacao_financeira || item.classificacao || "Variável não essencial";
    totals[key] = (totals[key] || 0) + numberValue(item[valueField]);
    return totals;
  }, {});
}
