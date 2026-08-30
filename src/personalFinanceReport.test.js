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
test("identifica a antecipação da moto de R$ 1.299,14", () => { const report = build(); assert.equal(report.totals.anticipationTotal, 1299.14); assert.equal(report.totals.savings, 8.86); assert.equal(report.pdf.rows.find((row) => row.value === "R$ 1.299,14")?.type, "Antecipação"); });
test("subtrai estornos do desembolso efetivo", () => { const totals = build().totals; assert.equal(totals.reversedOutflow, 80); assert.equal(totals.effectiveOutflow, 1399.14); });
test("aplica período inicial e final", () => { const report = build({ filters: { month: "", start: "2026-08-03", end: "2026-08-05" } }); assert.equal(report.filteredIncomes.length, 1); assert.equal(report.filteredExpenses.length, 0); assert.equal(report.filteredPaymentEvents.length, 2); });
test("todo o período não elimina registros", () => { const report = build({ filters: { month: "", start: "", end: "" } }); assert.equal(report.filteredIncomes.length, 1); assert.equal(report.filteredPayables.length, 4); });
test("resultado vazio não gera PDF", () => assert.equal(generatePersonalFinanceReport({ incomes: [], expenses: [], fixedExpenses: [], payables: [], paymentEvents: [], empresaId, userId, filters, serverNow }), false));
test("não soma a despesa integrada do pagamento novamente e evita duplicidade", () => { const report = build(); assert.equal(report.totals.expenseTotal, 200); assert.equal(report.totals.accountingBalance, 800); assert.equal(report.totals.effectiveOutflow, 1399.14); assert.deepEqual(report.integratedPaymentExpenses.map((item) => item.id), ["d2"]); });
test("mantém receitas, despesas, pagamentos e antecipações separados no PDF", () => { const summary = Object.fromEntries(build().pdf.summary.map((item) => [item.label, item.value])); assert.equal(summary.Receitas, "R$ 1.000,00"); assert.equal(summary["Despesas lançadas"], "R$ 200,00"); assert.equal(summary["Pagamentos realizados em Contas a Pagar"], "R$ 1.399,14"); assert.equal(summary.Antecipações, "R$ 1.299,14"); });
test("usa a data civil de America/Sao_Paulo na virada", () => { assert.equal(dateKeyInTimeZone("2026-08-24T02:59:59Z"), "2026-08-23"); assert.equal(dateKeyInTimeZone("2026-08-24T03:00:00Z"), "2026-08-24"); });
