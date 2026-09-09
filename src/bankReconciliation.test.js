import test from "node:test";
import assert from "node:assert/strict";
import { reconcileStatementTransactions, reconciliationTotals } from "./modules/financeiro-pessoal/utils/bankReconciliation.js";
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
