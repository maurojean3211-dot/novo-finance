import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clearReconciliationSession, loadReconciliationSession, saveReconciliationSession, statementPeriod } from "./modules/financeiro-pessoal/utils/reconciliationSession.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test("sair da rota e voltar restaura toda a conciliação durante a sessão", () => {
  const storage = memoryStorage();
  const state = { fileName: "extrato.pdf", period: { start: "2026-08-01", end: "2026-08-31" }, statement: { transactions: [{ date: "2026-08-01" }] }, items: [{ id: "n1", selected: true, suggestedType: "Despesa", suggestedCategory: "Alimentação", situation: "Faltando lançar" }], feedback: "" };
  saveReconciliationSession(storage, "empresa-a", "user-a", state);
  assert.deepEqual(loadReconciliationSession(storage, "empresa-a", "user-a"), state);
  assert.equal(loadReconciliationSession(storage, "empresa-a", "user-b"), null);
  clearReconciliationSession(storage, "empresa-a", "user-a");
  assert.equal(loadReconciliationSession(storage, "empresa-a", "user-a"), null);
});

test("período detectado usa a primeira e a última movimentação", () => {
  assert.deepEqual(statementPeriod({ transactions: [{ date: "2026-09-03" }, { date: "2026-08-15" }] }), { start: "2026-08-15", end: "2026-09-03" });
});

test("cancelar modal não chama importação e confirmar usa a função protegida", () => {
  const source = readFileSync(new URL("./modules/financeiro-pessoal/components/BankReconciliationPanel.jsx", import.meta.url), "utf8");
  assert.match(source, /onClick=\{\(\) => setConfirmOpen\(false\)\}>Cancelar/);
  assert.match(source, /onClick=\{confirmImport\}[^>]*>Confirmar importação/);
  assert.doesNotMatch(source, /window\.confirm/);
  assert.match(source, /acquireReconciliationImportLock\(importingRef\)/);
});
