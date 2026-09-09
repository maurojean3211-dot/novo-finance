const INVESTMENT_CATEGORY = "Investimentos / Aplicações financeiras";

export const RECONCILIATION_GROUPS = [
  "Já conciliado / encontrado no sistema",
  "Faltando lançar",
  "Possível correspondência",
  "Possível duplicidade",
  "Investimentos",
  "Transferências entre contas próprias",
  "Necessita revisão",
];

export function normalizeReconciliationText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
}

function dateDistance(left, right) {
  const first = new Date(`${left}T12:00:00Z`).getTime();
  const second = new Date(`${right}T12:00:00Z`).getTime();
  return Number.isFinite(first) && Number.isFinite(second) ? Math.abs(first - second) / 86400000 : Infinity;
}

function textSimilarity(left, right) {
  const a = new Set(normalizeReconciliationText(left).split(" ").filter((word) => word.length > 2));
  const b = new Set(normalizeReconciliationText(right).split(" ").filter((word) => word.length > 2));
  if (!a.size || !b.size) return 0;
  const common = [...a].filter((word) => b.has(word)).length;
  return common / Math.max(a.size, b.size);
}

export function reconciliationFingerprint(item) {
  return [item.date || item.data_lancamento, item.systemType || item.tipo, Number(item.amount ?? item.valor).toFixed(2), normalizeReconciliationText(item.description || item.descricao)].join("|");
}

export function suggestStatementTransaction(transaction) {
  const text = normalizeReconciliationText(transaction.description);
  const incoming = transaction.direction === "entrada" || /recebid|credito|deposito|estorno/.test(text);
  const ownTransfer = transaction.isOwnTransfer || /entre contas|mesma titularidade|conta propria|minha conta/.test(text);
  const investment = /investimento|aplicacao|renda fixa|tesouro|compra (de )?(acoes|acao|fii)|bolsa/.test(text);
  if (ownTransfer) return { suggestedType: "Transferência", systemType: null, suggestedCategory: "Transferência entre contas próprias", confidence: "alta" };
  if (investment) return { suggestedType: "Investimento", systemType: transaction.direction === "saida" ? "despesa" : null, suggestedCategory: INVESTMENT_CATEGORY, confidence: transaction.direction === "saida" ? "alta" : "baixa" };
  if (incoming) return { suggestedType: "Receita", systemType: "receita", suggestedCategory: /pix/.test(text) ? "PIX recebido" : "Outras receitas", confidence: "alta" };
  if (transaction.direction === "saida" || /compra|debito|pagamento|pix enviado|transferencia enviada|boleto/.test(text)) {
    const category = /mercado|supermercado|padaria|restaurante|ifood/.test(text) ? "Alimentação" : /posto|combustivel|uber|99app/.test(text) ? "Transporte" : "Outros";
    return { suggestedType: "Despesa", systemType: "despesa", suggestedCategory: category, confidence: "alta" };
  }
  return { suggestedType: "Revisar", systemType: null, suggestedCategory: "Não definida", confidence: "baixa" };
}

export function reconcileStatementTransactions(transactions = [], existingRecords = []) {
  const usedMatches = new Set();
  const seenStatement = new Set();
  return transactions.map((transaction, index) => {
    const suggestion = suggestStatementTransaction(transaction);
    const comparable = existingRecords.filter((item) => item.tipo === suggestion.systemType && Math.abs(Number(item.valor) - Number(transaction.amount)) < 0.005);
    const exact = comparable.filter((item) => !usedMatches.has(item.id) && String(item.data_lancamento).slice(0, 10) === transaction.date).sort((left, right) => textSimilarity(right.descricao, transaction.description) - textSimilarity(left.descricao, transaction.description));
    const probable = comparable.filter((item) => !usedMatches.has(item.id) && (dateDistance(String(item.data_lancamento).slice(0, 10), transaction.date) <= 3 || textSimilarity(item.descricao, transaction.description) >= 0.55));
    const fingerprint = reconciliationFingerprint({ ...transaction, systemType: suggestion.systemType });
    let situation = "Faltando lançar";
    if (suggestion.suggestedType === "Transferência") situation = "Transferências entre contas próprias";
    else if (exact.length) { situation = "Já conciliado / encontrado no sistema"; usedMatches.add(exact[0].id); }
    else if (probable.length) situation = "Possível correspondência";
    else if (seenStatement.has(fingerprint)) situation = "Possível duplicidade";
    else if (suggestion.suggestedType === "Investimento") situation = "Investimentos";
    else if (suggestion.confidence === "baixa") situation = "Necessita revisão";
    seenStatement.add(fingerprint);
    return {
      ...transaction,
      ...suggestion,
      id: transaction.id || `statement-${index + 1}`,
      situation,
      matchedIds: (exact.length ? exact.slice(0, 1) : probable).map((item) => item.id),
      selected: ["Faltando lançar", "Investimentos"].includes(situation),
    };
  });
}

export function reconciliationTotals(statement, items = []) {
  const incoming = items.filter((item) => item.direction === "entrada").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const outgoing = items.filter((item) => item.direction === "saida").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const found = items.filter((item) => item.situation === "Já conciliado / encontrado no sistema").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const ownTransfers = items.filter((item) => item.situation === "Transferências entre contas próprias").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const reconciliableTotal = incoming + outgoing - ownTransfers;
  return { initialBalance: statement.initialBalance, incoming, outgoing, finalBalance: statement.finalBalance, found, ownTransfers, reconciliableTotal, difference: Math.max(0, reconciliableTotal - found) };
}

export function canImportReconciliationItem(item) {
  return item.selected && item.systemType && !item.matchedIds?.length && ["Faltando lançar", "Investimentos"].includes(item.situation);
}
