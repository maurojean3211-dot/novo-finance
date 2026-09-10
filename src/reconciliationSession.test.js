import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildReconciliationSession, clearReconciliationSession, loadReconciliationSession, saveReconciliationSession, statementPeriod } from "./modules/financeiro-pessoal/utils/reconciliationSession.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test("sair da rota e voltar restaura toda a conciliação durante a sessão", () => {
  const storage = memoryStorage();
  const state = buildReconciliationSession({ fileName: "extrato.pdf", statement: { bank: "Nubank", transactions: [{ id: "n1", date: "2026-08-01", description: "Mercado", direction: "saida", amount: 10 }] }, items: [{ id: "n1", selected: true, suggestedType: "Despesa", suggestedCategory: "Alimentação", situation: "Faltando lançar" }], totals: { outgoing: 10 }, feedback: "" });
  saveReconciliationSession(storage, "empresa-a", "user-a", state);
  assert.deepEqual(loadReconciliationSession(storage, "empresa-a", "user-a"), state);
  assert.equal(loadReconciliationSession(storage, "empresa-a", "user-b"), null);
  clearReconciliationSession(storage, "empresa-a", "user-a");
  assert.equal(loadReconciliationSession(storage, "empresa-a", "user-a"), null);
});

test("checks alterados sobrevivem à navegação e ao refresh na mesma sessão", () => {
  const storage = memoryStorage();
  const statement = { transactions: [{ id: "n1", date: "2026-08-01", description: "Mercado", direction: "saida", amount: 10 }] };
  const checked = buildReconciliationSession({ fileName: "agosto.pdf", statement, items: [{ id: "n1", selected: false, suggestedType: "Despesa", suggestedCategory: "Mercado", situation: "Faltando lançar" }], totals: { outgoing: 10 } });
  saveReconciliationSession(storage, "empresa-a", "user-a", checked);
  assert.equal(loadReconciliationSession(storage, "empresa-a", "user-a").items[0].selected, false);
  assert.equal(loadReconciliationSession(storage, "empresa-a", "user-a").fileName, "agosto.pdf");
});

test("snapshot persiste somente dados processados e limpar encerra a conciliação", () => {
  const storage = memoryStorage();
  const state = buildReconciliationSession({ fileName: "extrato.pdf", statement: { transactions: [{ id: "n1", date: "2026-08-01", description: "Mercado", direction: "saida", amount: 10 }], rawPdf: "não persistir", bytes: [1, 2, 3] }, items: [{ id: "n1", selected: true, situation: "Faltando lançar" }], totals: { outgoing: 10 } });
  saveReconciliationSession(storage, "empresa-a", "user-a", state);
  const restored = loadReconciliationSession(storage, "empresa-a", "user-a");
  assert.equal(restored.statement.rawPdf, undefined);
  assert.equal(restored.statement.bytes, undefined);
  assert.deepEqual(restored.groups, { "Faltando lançar": ["n1"] });
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

test("conferência de extrato mantém item de menu e rota dedicada para o componente existente", () => {
  const menuSource = readFileSync(new URL("./app/navigation/menuConfig.js", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("./modules/financeiro-pessoal/pages/ConferenciaExtratoPage.jsx", import.meta.url), "utf8");
  assert.match(menuSource, /page: "conferencia_extrato_pessoal"[\s\S]*path: "\/financeiro-pessoal\/conferencia-extrato"[\s\S]*label: "Conferência de Extrato"/);
  assert.match(appSource, /pagina === "conferencia_extrato_pessoal"[\s\S]*<ConferenciaExtratoPage/);
  assert.match(pageSource, /<BankReconciliationPanel/);
});
