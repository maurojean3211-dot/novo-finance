import test from "node:test";
import assert from "node:assert/strict";
import { buildPersonalFinanceReportData, dateKeyInTimeZone, generatePersonalFinanceReport } from "./services/reportPdf.service.js";

const empresaId = "empresa-a";
const userId = "user-a";
const serverNow = "2026-08-24T02:59:59Z";
const filters = { month: "2026-08", start: "", end: "" };
const incomes = [{ id: "r1", empresa_id: empresaId, proprietario_id: userId, tipo: "receita", descricao: "Salário", valor: 1000, data_lancamento: "2026-08-05" }];
const expenses = [
  { id: "d1", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", descricao: "Mercado", valor: 200, data_lancamento: "2026-08-06" },
  { id: "d2", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", descricao: "Antecipação da moto", valor: 1299.14, data_lancamento: "2026-08-03", pagamento_evento_id: "e3", origem_tipo: "Antecipacao", ativo: true },
];
const fixedExpenses = [{ id: "f1", empresa_id: empresaId, proprietario_id: userId, descricao: "Internet", valor: 100, dia_vencimento: 10, frequencia: "Mensal", data_base: "2026-01-10", ativo: true }];
const payables = [
  { id: "p1", empresa_id: empresaId, proprietario_id: userId, descricao: "Parcela 1", valor: 300, valor_total_compra: 900, vencimento: "2026-08-10", status: "Pendente", grupo_parcelamento_id: "g1", parcela_numero: 1, parcelas_total: 3 },
  { id: "p2", empresa_id: empresaId, proprietario_id: userId, descricao: "Parcela 2", valor: 300, valor_total_compra: 900, vencimento: "2026-08-23", status: "Pendente", grupo_parcelamento_id: "g1", parcela_numero: 2, parcelas_total: 3 },
  { id: "p3", empresa_id: empresaId, proprietario_id: userId, descricao: "Cancelada", valor: 50, vencimento: "2026-08-01", status: "Cancelada" },
  { id: "p4", empresa_id: empresaId, proprietario_id: userId, descricao: "Paga", valor: 80, vencimento: "2026-08-02", status: "Pago" },
];
const paymentEvents = [
  { id: "e1", empresa_id: empresaId, proprietario_id: userId, tipo: "Entrada", valor_pago: 100, pago_em: "2026-08-01" },
  { id: "e2", empresa_id: empresaId, proprietario_id: userId, tipo: "Pagamento", valor_pago: 80, pago_em: "2026-08-02" },
  { id: "e3", empresa_id: empresaId, proprietario_id: userId, tipo: "Antecipacao", valor_pago: 1299.14, desconto_obtido: 8.86, pago_em: "2026-08-03", observacoes: "Prestação da moto" },
  { id: "e4", empresa_id: empresaId, proprietario_id: userId, tipo: "Estorno", valor_pago: 80, pago_em: "2026-08-04", estorno_de_evento_id: "e2" },
];

function build(overrides = {}) {
  return buildPersonalFinanceReportData({ incomes, expenses, fixedExpenses, payables, paymentEvents, empresaId, userId, filters, serverNow, ...overrides });
}

test("consolida receitas e despesas e mantém saldo contábil separado", () => { const report = build(); assert.equal(report.totals.incomeTotal, 1000); assert.equal(report.totals.expenseTotal, 200); assert.equal(report.totals.accountingBalance, 800); });
test("soma parcelas sem repetir valor_total_compra", () => { const report = build(); assert.equal(report.totals.installmentTotal, 600); assert.equal(report.filteredPayables.filter((item) => item.grupo_parcelamento_id).length, 2); });
test("separa canceladas das obrigações ativas", () => { const report = build(); assert.equal(report.totals.cancelledTotal, 50); assert.equal(report.totals.activePayablesTotal, 600); });
test("classifica vencidas e preserva título vencendo hoje como pendente", () => { const report = build(); assert.deepEqual(report.overdue.map((item) => item.id), ["p1"]); assert.deepEqual(report.pending.map((item) => item.id), ["p2"]); });
test("inclui entradas no desembolso", () => assert.equal(build().totals.downPaymentTotal, 100));
test("pagamento estornado não permanece no subtotal líquido", () => assert.equal(build().totals.paymentTotal, 0));
test("identifica a antecipação da moto de R$ 1.299,14 sem misturá-la aos lançamentos do relatório simplificado", () => { const report = build(); assert.equal(report.totals.anticipationTotal, 1299.14); assert.equal(report.totals.savings, 8.86); assert.equal(report.pdf.rows.find((row) => row.type === "Antecipação"), undefined); });
test("subtrai estornos do desembolso efetivo", () => { const totals = build().totals; assert.equal(totals.reversedOutflow, 80); assert.equal(totals.effectiveOutflow, 1399.14); });
test("aplica período inicial e final", () => { const report = build({ filters: { month: "", start: "2026-08-03", end: "2026-08-05" } }); assert.equal(report.filteredIncomes.length, 1); assert.equal(report.filteredExpenses.length, 0); assert.equal(report.filteredPaymentEvents.length, 2); });
test("calcula saldo inicial, movimentos, resultado e saldo final em período livre", () => {
  const report = build({
    filters: { month: "", start: "2026-08-31", end: "2026-09-30" },
    incomes: [
      ...incomes,
      { id: "r2", empresa_id: empresaId, proprietario_id: userId, tipo: "receita", valor: 500, data_lancamento: "2026-09-10" },
    ],
    expenses: [
      ...expenses,
      { id: "d3", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", valor: 300, data_lancamento: "2026-09-20", ativo: true },
    ],
  });
  assert.deepEqual(
    { initial: report.totals.initialBalance, inflow: report.totals.inflowTotal, outflow: report.totals.outflowTotal, result: report.totals.periodResult, final: report.totals.finalBalance },
    { initial: 800, inflow: 500, outflow: 300, result: 200, final: 1000 },
  );
});
test("separa investimentos das despesas e os considera na variação de caixa", () => {
  const report = build({
    filters: { month: "", start: "2026-08-01", end: "2026-08-31" },
    expenses: [
      ...expenses,
      { id: "i1", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", categoria: "Investimentos / Aplicações financeiras", valor: 300, data_lancamento: "2026-08-07", ativo: true },
    ],
  });
  assert.deepEqual(
    { expenses: report.totals.expenseTotal, investments: report.totals.investmentTotal, result: report.totals.periodResult, cashVariation: report.totals.cashVariation, accumulated: report.totals.finalBalance },
    { expenses: 200, investments: 300, result: 800, cashVariation: 500, accumulated: 500 },
  );
  assert.deepEqual(report.filteredInvestments.map((item) => item.id), ["i1"]);
});
test("investimento anterior reduz o saldo acumulado anterior", () => {
  const report = build({
    filters: { month: "", start: "2026-08-08", end: "2026-08-31" },
    expenses: [
      ...expenses,
      { id: "i1", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", categoria: "Aplicação financeira", valor: 300, data_lancamento: "2026-08-07", ativo: true },
    ],
  });
  assert.equal(report.totals.initialBalance, 500);
});
test("todo o período não elimina registros", () => { const report = build({ filters: { month: "", start: "", end: "" } }); assert.equal(report.filteredIncomes.length, 1); assert.equal(report.filteredPayables.length, 4); });
test("resultado vazio não gera PDF", () => assert.equal(generatePersonalFinanceReport({ incomes: [], expenses: [], fixedExpenses: [], payables: [], paymentEvents: [], empresaId, userId, filters, serverNow }), false));
test("não soma a despesa integrada do pagamento novamente e evita duplicidade", () => { const report = build(); assert.equal(report.totals.expenseTotal, 200); assert.equal(report.totals.accountingBalance, 800); assert.equal(report.totals.effectiveOutflow, 1399.14); assert.deepEqual(report.integratedPaymentExpenses.map((item) => item.id), ["d2"]); });
test("PDF apresenta somente entradas, despesas, investimentos e saldo do mês", () => {
  const summary = Object.fromEntries(build({ filters: { month: "", start: "2026-08-06", end: "2026-08-31" } }).pdf.summary.map((item) => [item.label, item.value]));
  assert.equal(summary["Entradas do mês"], "R$ 0,00");
  assert.equal(summary["Despesas do mês"], "R$ 200,00");
  assert.equal(summary["Investimentos do mês"], "R$ 0,00");
  assert.equal(summary["Saldo do mês"], "R$ -200,00");
  assert.equal(summary["Variação de caixa"], undefined);
  assert.equal(summary["Saldo acumulado anterior"], undefined);
  assert.equal(summary["Saldo acumulado calculado"], undefined);
  assert.equal(build().pdf.title, "Relatório Financeiro Pessoal do Período");
});
test("pagamento de fatura reduz caixa sem entrar novamente nas despesas ou no saldo do mês", () => {
  const report = build({ expenses: [...expenses, { id: "fatura", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", descricao: "Pagamento de fatura de cartão", categoria: "Cartão de crédito", valor: 450, data_lancamento: "2026-08-08", ativo: true }] });
  assert.equal(report.totals.expenseTotal, 200);
  assert.equal(report.totals.periodResult, 800);
  assert.deepEqual(report.filteredCardBillPayments.map((item) => item.id), ["fatura"]);
  assert.equal(report.pdf.rows.find((item) => item.type === "Pagamento de fatura de cartão")?.status, "Fora das despesas");
});
test("compra no cartão permanece despesa normal na categoria real", () => {
  const report = build({ expenses: [...expenses, { id: "cartao", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", descricao: "Restaurante · Cartão de crédito", categoria: "Alimentação", valor: 90, data_lancamento: "2026-08-09", ativo: true }] });
  assert.equal(report.totals.expenseTotal, 290);
  assert.equal(report.pdf.rows.find((item) => item.description.includes("Restaurante"))?.detail, "Alimentação");
});
test("usa a data civil de America/Sao_Paulo na virada", () => { assert.equal(dateKeyInTimeZone("2026-08-24T02:59:59Z"), "2026-08-23"); assert.equal(dateKeyInTimeZone("2026-08-24T03:00:00Z"), "2026-08-24"); });
