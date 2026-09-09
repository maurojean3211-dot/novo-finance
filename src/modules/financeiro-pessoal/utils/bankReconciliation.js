const INVESTMENT_CATEGORY = "Investimentos / Aplicações financeiras";
const IGNORED_DESCRIPTION_WORDS = new Set(["pix", "transferencia", "transferido", "enviada", "enviado", "recebida", "recebido", "compra", "debito", "pagamento", "pago", "boleto", "efetuado", "efetuada", "via", "por", "para", "de", "da", "do", "das", "dos", "na", "no"]);

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
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((word) => word && !IGNORED_DESCRIPTION_WORDS.has(word)).join(" ");
}

function dateDistance(left, right) {
  const first = new Date(`${left}T12:00:00Z`).getTime();
  const second = new Date(`${right}T12:00:00Z`).getTime();
  return Number.isFinite(first) && Number.isFinite(second) ? Math.abs(first - second) / 86400000 : Infinity;
}

export function reconciliationTextSimilarity(left, right) {
  const a = new Set(normalizeReconciliationText(left).split(" ").filter((word) => word.length > 2));
  const b = new Set(normalizeReconciliationText(right).split(" ").filter((word) => word.length > 2));
  if (!a.size || !b.size) return 0;
  const common = [...a].filter((word) => b.has(word)).length;
  return common / Math.max(a.size, b.size);
}

export function reconciliationFingerprint(item) {
  return [item.date || item.data_lancamento, item.systemType || item.tipo, Number(item.amount ?? item.valor).toFixed(2), normalizeReconciliationText(item.description || item.descricao)].join("|");
}

export function detectReconciliationDuplicate(item, existingRecords = []) {
  const sameOperation = existingRecords.filter((record) =>
    record.tipo === (item.systemType || item.tipo)
    && String(record.data_lancamento).slice(0, 10) === (item.date || String(item.data_lancamento).slice(0, 10))
    && Math.abs(Number(record.valor) - Number(item.amount ?? item.valor)) < 0.005,
  );
  if (!sameOperation.length) return { status: "none", matches: [] };
  const fingerprint = reconciliationFingerprint(item);
  const exact = sameOperation.find((record) => (item.idempotencyKey && record.idempotency_key === item.idempotencyKey) || reconciliationFingerprint(record) === fingerprint);
  if (exact) return { status: "exact", matches: [exact] };
  const ranked = [...sameOperation].sort((left, right) => reconciliationTextSimilarity(right.descricao, item.description || item.descricao) - reconciliationTextSimilarity(left.descricao, item.description || item.descricao));
  return { status: "possible_duplicate", matches: ranked };
}

export function suggestStatementTransaction(transaction) {
  const rawText = String(transaction.description || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
  const text = normalizeReconciliationText(transaction.description);
  const ownTransfer = transaction.isOwnTransfer || /entre contas|mesma titularidade|conta propria|minha conta/.test(rawText);
  const explicitBoletoPayment = /pagamento de boleto efetuad[oa]/.test(rawText) && !/estorno|devolucao|cancelamento/.test(rawText);
  const incoming = !explicitBoletoPayment && (transaction.direction === "entrada" || /recebid|credito|deposito|estorno/.test(rawText));
  const investment = /investimento|aplicacao|renda fixa|tesouro|acoes|acao|fii|bolsa|\b[a-z]{4}\d{1,2}\b/.test(text);
  if (ownTransfer) return { suggestedType: "Transferência", systemType: null, suggestedCategory: "Transferência entre contas próprias", confidence: "alta" };
  if (explicitBoletoPayment) return { suggestedType: "Despesa", systemType: "despesa", suggestedCategory: "Outros", confidence: "alta" };
  if (investment) return { suggestedType: "Investimento", systemType: transaction.direction === "saida" ? "despesa" : null, suggestedCategory: INVESTMENT_CATEGORY, confidence: transaction.direction === "saida" ? "alta" : "baixa" };
  if (incoming) return { suggestedType: "Receita", systemType: "receita", suggestedCategory: /pix/.test(text) ? "PIX recebido" : "Outras receitas", confidence: "alta" };
  if (transaction.direction === "saida" || /compra|debito|pagamento|pix enviado|transferencia enviada|boleto/.test(text)) {
    const category = /mercado|supermercado|padaria|restaurante|ifood/.test(text) ? "Alimentação" : /posto|combustivel|uber|99app/.test(text) ? "Transporte" : "Outros";
    return { suggestedType: "Despesa", systemType: "despesa", suggestedCategory: category, confidence: "alta" };
  }
  return { suggestedType: "Revisar", systemType: null, suggestedCategory: "Não definida", confidence: "baixa" };
}

export function findPayableMatches(transaction, payables = []) {
  return payables.filter((payable) => {
    const status = payable.reportStatus || payable.status;
    const description = [payable.fornecedor, payable.descricao].filter(Boolean).join(" ");
    return !["Pago", "Cancelada"].includes(status)
      && Math.abs(Number(payable.valor) - Number(transaction.amount)) < 0.005
      && dateDistance(String(payable.vencimento || "").slice(0, 10), transaction.date) <= 3
      && reconciliationTextSimilarity(description, transaction.description) >= 0.2;
  }).sort((left, right) => reconciliationTextSimilarity([right.fornecedor, right.descricao].join(" "), transaction.description) - reconciliationTextSimilarity([left.fornecedor, left.descricao].join(" "), transaction.description));
}

export function reconcileStatementTransactions(transactions = [], existingRecords = [], payables = []) {
  const usedMatches = new Set();
  const seenStatement = new Set();
  return transactions.map((transaction, index) => {
    const suggestion = suggestStatementTransaction(transaction);
    const comparable = existingRecords.filter((item) => item.tipo === suggestion.systemType && Math.abs(Number(item.valor) - Number(transaction.amount)) < 0.005 && !usedMatches.has(item.id));
    const duplicate = detectReconciliationDuplicate({ ...transaction, systemType: suggestion.systemType }, comparable);
    const exact = duplicate.status === "exact" ? duplicate.matches : [];
    const possibleDuplicates = duplicate.status === "possible_duplicate" ? duplicate.matches : [];
    const probable = comparable.filter((item) => dateDistance(String(item.data_lancamento).slice(0, 10), transaction.date) <= 3 || reconciliationTextSimilarity(item.descricao, transaction.description) >= 0.55);
    const payableMatches = transaction.direction === "saida" || suggestion.suggestedType === "Transferência" ? findPayableMatches(transaction, payables) : [];
    const fingerprint = reconciliationFingerprint({ ...transaction, systemType: suggestion.systemType });
    let situation = "Faltando lançar";
    if (suggestion.suggestedType === "Transferência") situation = "Transferências entre contas próprias";
    else if (exact.length) { situation = "Já conciliado / encontrado no sistema"; usedMatches.add(exact[0].id); }
    else if (possibleDuplicates.length) situation = "Possível duplicidade";
    else if (probable.length) situation = "Possível correspondência";
    else if (payableMatches.length && suggestion.suggestedType !== "Transferência") situation = "Possível correspondência";
    else if (seenStatement.has(fingerprint)) situation = "Possível duplicidade";
    else if (suggestion.suggestedType === "Investimento") situation = "Investimentos";
    else if (suggestion.confidence === "baixa") situation = "Necessita revisão";
    seenStatement.add(fingerprint);
    return {
      ...transaction,
      ...suggestion,
      id: transaction.id || `statement-${index + 1}`,
      situation,
      matchedIds: (exact.length ? exact.slice(0, 1) : possibleDuplicates.length ? possibleDuplicates : probable).map((item) => item.id),
      payableMatches: payableMatches.map((item) => ({ id: item.id, fornecedor: item.fornecedor || "", descricao: item.descricao || "", vencimento: item.vencimento, valor: Number(item.valor) })),
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
  return Boolean(item.selected && item.systemType && !item.matchedIds?.length && !item.payableMatches?.length && ["Faltando lançar", "Investimentos"].includes(item.situation));
}

export function buildReconciliationImportSummary(items = []) {
  const selected = items.filter(canImportReconciliationItem);
  const countType = (type) => selected.filter((item) => item.suggestedType === type).length;
  return {
    items: selected,
    total: selected.length,
    incomes: countType("Receita"),
    expenses: countType("Despesa"),
    investments: countType("Investimento"),
    transfers: countType("Transferência"),
    incoming: selected.filter((item) => item.direction === "entrada").reduce((sum, item) => sum + Number(item.amount || 0), 0),
    outgoing: selected.filter((item) => item.direction === "saida").reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };
}

export function reconciliationIdempotencyKey(item) {
  return `nubank:${item.date}:${item.systemType}:${Number(item.amount).toFixed(2)}:${normalizeReconciliationText(item.description).replace(/\s+/g, "-").slice(0, 80)}`;
}

export async function runReconciliationImport({ items = [], findExisting, insert }) {
  const importedIds = [];
  const exactIds = [];
  const duplicateIds = [];
  const errors = [];
  for (const item of items.filter(canImportReconciliationItem)) {
    const idempotencyKey = reconciliationIdempotencyKey(item);
    try {
      const duplicate = detectReconciliationDuplicate({ ...item, idempotencyKey }, await findExisting(item));
      if (duplicate.status === "exact") { exactIds.push(item.id); continue; }
      if (duplicate.status === "possible_duplicate") { duplicateIds.push(item.id); continue; }
      await insert(item, idempotencyKey);
      importedIds.push(item.id);
    } catch (cause) {
      if (cause?.code === "23505") exactIds.push(item.id);
      else errors.push({ id: item.id, message: cause.message || "Falha ao importar lançamento." });
    }
  }
  return { imported: importedIds.length, skipped: exactIds.length, blocked: duplicateIds.length, failed: errors.length, importedIds, exactIds, duplicateIds, errors };
}

export function acquireReconciliationImportLock(lock) {
  if (lock.current) return false;
  lock.current = true;
  return true;
}
