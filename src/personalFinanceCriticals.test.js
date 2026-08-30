import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPersonalFinanceReportData } from "./services/reportPdf.service.js";
import { fixedExpenseOccurrences, fixedExpensesForMonth, manualPersonalExpenses, personalPaymentTotals } from "./modules/financeiro-pessoal/utils/personalFinanceCalculations.js";

const empresaId = "empresa-a";
const userId = "user-a";
const base = { empresaId, userId, serverNow: "2026-08-24T12:00:00Z", filters: { month: "", start: "", end: "" } };
const reconciledMigrationSql = readFileSync(
  new URL("../supabase/migrations/20260824203202_reconciliar_financeiro_pessoal_baseline_real_producao_v2.sql", import.meta.url),
  "utf8",
);

test("builder isola usuário e empresa em receitas e despesas", () => {
  const report = buildPersonalFinanceReportData({ ...base,
    incomes: [
      { empresa_id: empresaId, proprietario_id: userId, tipo: "receita", valor: 10, data_lancamento: "2026-08-01" },
      { empresa_id: empresaId, proprietario_id: "user-b", tipo: "receita", valor: 20, data_lancamento: "2026-08-01" },
      { empresa_id: "empresa-b", proprietario_id: userId, tipo: "receita", valor: 30, data_lancamento: "2026-08-01" },
    ],
    expenses: [
      { empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", valor: 4, data_lancamento: "2026-08-01" },
      { empresa_id: empresaId, proprietario_id: "user-b", tipo: "despesa", valor: 5, data_lancamento: "2026-08-01" },
    ],
  });
  assert.equal(report.totals.incomeTotal, 10);
  assert.equal(report.totals.expenseTotal, 4);
});

test("dashboard, despesas, relatório e PDF usam somente despesa manual ativa", () => {
  const expenses = [
    { id: "manual", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", valor: 200, ativo: true, data_lancamento: "2026-08-01" },
    { id: "integrada", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", valor: 1299.14, ativo: true, pagamento_evento_id: "e1", data_lancamento: "2026-08-01" },
    { id: "estornada", empresa_id: empresaId, proprietario_id: userId, tipo: "despesa", valor: 80, ativo: false, data_lancamento: "2026-08-01" },
  ];
  assert.deepEqual(manualPersonalExpenses(expenses).map((item) => item.id), ["manual"]);
  const report = buildPersonalFinanceReportData({ ...base, expenses });
  assert.equal(report.totals.expenseTotal, 200);
  assert.equal(report.pdf.summary.find((item) => item.label === "Despesas lançadas").value, "R$ 200,00");
});

test("estorno neutraliza antecipação e economia preservando histórico", () => {
  const events = [
    { id: "a1", tipo: "Antecipacao", valor_pago: 1299.14, desconto_obtido: 8.86 },
    { id: "s1", tipo: "Estorno", estorno_de_evento_id: "a1", valor_pago: 1299.14, desconto_obtido: 8.86 },
  ];
  assert.deepEqual(personalPaymentTotals(events), { active: [], payments: [], downPayments: [], anticipations: [], paymentTotal: 0, downPaymentTotal: 0, anticipationTotal: 0, savings: 0, effectiveOutflow: 0 });
  assert.equal(events.length, 2);
});

test("nova antecipação legítima após estorno volta a compor o líquido", () => {
  const totals = personalPaymentTotals([
    { id: "a1", tipo: "Antecipacao", valor_pago: 1299.14, desconto_obtido: 8.86 },
    { id: "s1", tipo: "Estorno", estorno_de_evento_id: "a1", valor_pago: 1299.14, desconto_obtido: 8.86 },
    { id: "a2", tipo: "Antecipacao", valor_pago: 1299.14, desconto_obtido: 8.86 },
  ]);
  assert.equal(totals.anticipationTotal, 1299.14);
  assert.equal(totals.savings, 8.86);
});

test("periodicidade mensal, trimestral e anual respeita a data-base", () => {
  const records = [
    { id: "m", frequencia: "Mensal", data_base: "2026-01-10", ativo: true },
    { id: "t", frequencia: "Trimestral", data_base: "2026-01-10", ativo: true },
    { id: "a", frequencia: "Anual", data_base: "2026-01-10", ativo: true },
  ];
  assert.deepEqual(fixedExpensesForMonth(records, "2026-01").map((item) => item.id), ["m", "t", "a"]);
  assert.deepEqual(fixedExpensesForMonth(records, "2026-02").map((item) => item.id), ["m"]);
  assert.deepEqual(fixedExpensesForMonth(records, "2026-04").map((item) => item.id), ["m", "t"]);
  assert.deepEqual(fixedExpensesForMonth(records, "2027-01").map((item) => item.id), ["m", "t", "a"]);
  assert.deepEqual(fixedExpenseOccurrences(records, { start: "2026-02-01", end: "2026-04-30" }).map((item) => `${item.id}:${item.competencia}`), ["m:2026-02", "m:2026-03", "m:2026-04", "t:2026-04"]);
});

test("migration vigente protege ownership, RLS, imutabilidade e preserva as RPCs robustas", () => {
  const sql = reconciledMigrationSql;
  for (const expected of ["despesas_select_owner", "contas_fixas_select_owner", "proteger_financeiro_conta_pessoal_paga", "registrar_pagamento_conta_pessoal", "estornar_pagamento_conta_pessoal", "criar_parcelamento_conta_pessoal", "criar_parcelamento_conta_pessoal_com_entrada", "atualizar_metadados_grupo_conta_pessoal", "security invoker", "set search_path = ''"]) assert.match(sql.toLowerCase(), new RegExp(expected.toLowerCase().replaceAll("_", "[_]")));
  assert.match(sql, /Campos financeiros de obrigação liquidada são imutáveis/);
  assert.match(sql, /pessoal\(uuid,uuid,uuid,bigint,text,text,text,text,text\)/);
  assert.match(sql, /overload integer da RPC de metadados/);
  assert.match(sql, /constraint trigger cpp_pag_eventos_materializacao_diferida/);
  assert.doesNotMatch(sql, /create\s+or\s+replace\s+function\s+public\.(registrar_pagamento_conta_pessoal|estornar_pagamento_conta_pessoal|criar_parcelamento_conta_pessoal(?:_com_entrada)?|atualizar_metadados_grupo_conta_pessoal)/i);
});

test("migration vigente mantém constraint manual e integrada em ramos separados", () => {
  const sql = reconciledMigrationSql;
  assert.match(sql, /pagamento_evento_id is null[\s\S]*tipo in \('despesa', 'receita'\)/);
  assert.match(sql, /pagamento_evento_id is not null[\s\S]*origem_tipo in \('Pagamento', 'Antecipacao', 'Entrada'\)/);
  assert.match(sql, /Proprietário da despesa\/receita não pertence à empresa/);
  assert.match(sql, /conta fixa com empresa inexistente exige saneamento manual/);
  assert.match(sql, /revoke all on table public\.despesas, public\.contas_fixas from public, anon, authenticated/);
});
