import test from "node:test";
import assert from "node:assert/strict";
import { acquireReconciliationImportLock, buildReconciliationImportSummary, detectReconciliationDuplicate, reconcileStatementTransactions, reconciliationTotals, runReconciliationImport } from "./modules/financeiro-pessoal/utils/bankReconciliation.js";
import { parseNubankStatement } from "./modules/financeiro-pessoal/utils/nubankStatementParser.js";

const parsed = parseNubankStatement([
  "Cliente Nubank",
  "Saldo inicial 1.000,00",
  "Saldo final do período R$ 1.080,00 Total de entradas +500,00 Total de saídas -420,00",
  "Movimentações",
  "01 SET 2026 Total de saídas - 120,00",
  "Compra no débito Mercado Central 120,00",
  "02 SET 2026 Total de entradas + 500,00",
  "Transferência recebida pelo Pix João 500,00",
  "03 SET 2026 Total de saídas - 200,00",
  "Aplicação Renda Fixa 200,00",
  "04 SET 2026 Total de saídas - 100,00",
  "Transferência entre contas de mesma titularidade 100,00",
]);

test("parser Nubank identifica saldos e movimentações", () => {
  assert.equal(parsed.initialBalance, 1000);
  assert.equal(parsed.finalBalance, 1080);
  assert.deepEqual(parsed.transactions.map((item) => [item.date, item.direction, item.amount]), [["2026-09-01", "saida", 120], ["2026-09-02", "entrada", 500], ["2026-09-03", "saida", 200], ["2026-09-04", "saida", 100]]);
});

test("conciliação separa encontrado, investimento e transferência própria", () => {
  const items = reconcileStatementTransactions(parsed.transactions, [{ id: "d1", tipo: "despesa", data_lancamento: "2026-09-01", descricao: "Mercado Central", valor: 120 }]);
  assert.deepEqual(items.map((item) => item.situation), ["Já conciliado / encontrado no sistema", "Faltando lançar", "Investimentos", "Transferências entre contas próprias"]);
  assert.equal(items[2].suggestedCategory, "Investimentos / Aplicações financeiras");
  assert.equal(items[3].systemType, null);
  assert.deepEqual(reconciliationTotals(parsed, items), { initialBalance: 1000, incoming: 500, outgoing: 420, finalBalance: 1080, found: 120, ownTransfers: 100, reconciliableTotal: 820, difference: 700 });
});

test("marca correspondência próxima e duplicidade no próprio extrato", () => {
  const transaction = { date: "2026-09-10", description: "Pagamento academia", direction: "saida", amount: 90 };
  const probable = reconcileStatementTransactions([transaction], [{ id: "d1", tipo: "despesa", data_lancamento: "2026-09-12", descricao: "Academia mensal", valor: 90 }]);
  assert.equal(probable[0].situation, "Possível correspondência");
  const duplicates = reconcileStatementTransactions([transaction, { ...transaction }], []);
  assert.deepEqual(duplicates.map((item) => item.situation), ["Faltando lançar", "Possível duplicidade"]);
});

test("cada lançamento existente concilia no máximo uma linha do extrato", () => {
  const transaction = { date: "2026-09-10", description: "Compra repetida", direction: "saida", amount: 16 };
  const items = reconcileStatementTransactions([transaction, { ...transaction }], [{ id: "d1", tipo: "despesa", data_lancamento: "2026-09-10", descricao: "Compra repetida", valor: 16 }]);
  assert.deepEqual(items.map((item) => item.situation), ["Já conciliado / encontrado no sistema", "Possível duplicidade"]);
});

test("mesma data, valor e descrição semelhante é possível duplicidade; data diferente não bloqueia", () => {
  const existing = [{ id: "d1", tipo: "despesa", data_lancamento: "2026-08-15", descricao: "SUPERMERCADO", valor: 133.13 }];
  assert.equal(detectReconciliationDuplicate({ systemType: "despesa", date: "2026-08-15", description: "Supermercado compra no débito", amount: 133.13 }, existing).status, "exact");
  assert.equal(detectReconciliationDuplicate({ systemType: "despesa", date: "2026-08-15", description: "ASSAI ATACADISTA LJ295", amount: 133.13 }, existing).status, "possible_duplicate");
  assert.equal(detectReconciliationDuplicate({ systemType: "despesa", date: "2026-08-16", description: "SUPERMERCADO", amount: 133.13 }, existing).status, "none");
});

test("importação é idempotente e consulta novamente antes de cada insert", async () => {
  const records = [];
  let lookups = 0;
  const item = { id: "n1", selected: true, situation: "Faltando lançar", systemType: "despesa", suggestedType: "Despesa", suggestedCategory: "Alimentação", direction: "saida", date: "2026-08-15", description: "SUPERMERCADO", amount: 133.13 };
  const adapter = {
    items: [item],
    findExisting: async () => { lookups += 1; return records; },
    insert: async (current, idempotencyKey) => { records.push({ id: "created", tipo: current.systemType, data_lancamento: current.date, descricao: current.description, valor: current.amount, idempotency_key: idempotencyKey }); },
  };
  const first = await runReconciliationImport(adapter);
  const second = await runReconciliationImport(adapter);
  assert.deepEqual([first.imported, second.imported, second.skipped, records.length, lookups], [1, 0, 1, 1, 2]);
});

test("importação inclui somente selecionados válidos e preserva investimento", async () => {
  const inserted = [];
  const valid = { id: "expense", selected: true, situation: "Faltando lançar", systemType: "despesa", suggestedType: "Despesa", direction: "saida", date: "2026-09-01", description: "Mercado", amount: 20 };
  const investment = { ...valid, id: "investment", situation: "Investimentos", suggestedType: "Investimento", suggestedCategory: "Investimentos / Aplicações financeiras", description: "Compra BHIA3", amount: 50 };
  const transfer = { ...valid, id: "transfer", situation: "Transferências entre contas próprias", systemType: null, suggestedType: "Transferência", selected: false, description: "Pix para conta própria", amount: 556.33 };
  const unselected = { ...valid, id: "off", selected: false };
  const result = await runReconciliationImport({ items: [valid, investment, transfer, unselected], findExisting: async () => [], insert: async (item) => inserted.push(item) });
  assert.equal(result.imported, 2);
  assert.deepEqual(inserted.map((item) => item.id), ["expense", "investment"]);
  assert.equal(inserted[1].suggestedCategory, "Investimentos / Aplicações financeiras");
  assert.equal(buildReconciliationImportSummary([valid, investment, transfer]).transfers, 0);
});

test("tickers de ações e FIIs permanecem classificados como investimento", () => {
  const transactions = ["BHIA3", "ASAI3", "XPML11"].map((ticker, index) => ({ id: ticker, date: `2026-09-${String(index + 1).padStart(2, "0")}`, description: `Compra de ações ${ticker}`, direction: "saida", amount: 50 + index }));
  const items = reconcileStatementTransactions(transactions, []);
  assert.deepEqual(items.map((item) => [item.suggestedType, item.suggestedCategory, item.situation]), Array(3).fill(["Investimento", "Investimentos / Aplicações financeiras", "Investimentos"]));
});

test("trava impede concorrência e duplo clique", () => {
  const lock = { current: false };
  assert.equal(acquireReconciliationImportLock(lock), true);
  assert.equal(acquireReconciliationImportLock(lock), false);
  lock.current = false;
  assert.equal(acquireReconciliationImportLock(lock), true);
});
