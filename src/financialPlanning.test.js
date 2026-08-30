import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { budgetByCategory, fixedExpenseOccursInMonth, totalsByClassification } from "./modules/financeiro-pessoal/utils/personalFinanceCalculations.js";

test("orçamento calcula realizado, saldo, percentual e excedente sem bloquear", () => {
  const rows = budgetByCategory({ month: "2026-08", categories: [{ id: "c1", nome: "Supermercado", classificacao: "Variável essencial" }], budgets: [{ id: "b1", categoria_id: "c1", competencia: "2026-08-01", valor_previsto: 1000 }], expenses: [{ categoria_id: "c1", valor: 1120, ativo: true, data_lancamento: "2026-08-20" }] });
  assert.deepEqual(rows.map(({ planned, realized, available, percentage, exceeded, status }) => ({ planned, realized, available, percentage, exceeded, status })), [{ planned: 1000, realized: 1120, available: -120, percentage: 112, exceeded: 120, status: "exceeded" }]);
});

test("classificação configurável separa fixas e variáveis", () => {
  assert.deepEqual(totalsByClassification([{ classificacao_financeira: "Fixa", valor: 200 }, { classificacao_financeira: "Variável essencial", valor: 80 }, { classificacao_financeira: "Variável não essencial", valor: 20 }]), { Fixa: 200, "Variável essencial": 80, "Variável não essencial": 20 });
});

test("desativação e mudança futura da regra não reescrevem ocorrências", () => {
  assert.equal(fixedExpenseOccursInMonth({ ativo: false, data_inicio: "2026-01-01", frequencia: "Mensal" }, "2026-08"), false);
  assert.equal(fixedExpenseOccursInMonth({ ativo: true, data_inicio: "2026-09-01", frequencia: "Mensal" }, "2026-08"), false);
  assert.equal(fixedExpenseOccursInMonth({ ativo: true, data_inicio: "2026-01-01", data_fim: "2026-07-31", frequencia: "Mensal" }, "2026-08"), false);
});

test("migration garante RLS, isolamento e idempotência por competência", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260827144659_substituir_evolucao_orcamentos_recorrencias_financeiras.sql", import.meta.url), "utf8").toLowerCase();
  for (const expected of ["enable row level security", "proprietario_id = (select auth.uid())", "recorrencia_competencia_uidx", "on conflict (empresa_id, proprietario_id, recorrencia_id, competencia)", "on conflict (empresa_id, recorrencia_id, competencia)", "gerar_titulos_recorrentes", "revoke all on function", "set search_path = ''"]) assert.match(sql, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("geração cria somente títulos e mantém a baixa nos fluxos existentes", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260827144659_substituir_evolucao_orcamentos_recorrencias_financeiras.sql", import.meta.url), "utf8").toLowerCase();
  assert.match(sql, /insert into public\.contas_pagar_pessoais/);
  assert.match(sql, /insert into public\.financeiro_titulos/);
  assert.doesNotMatch(sql, /insert into public\.despesas/);
  assert.doesNotMatch(sql, /insert into public\.financeiro_baixas/);
});
