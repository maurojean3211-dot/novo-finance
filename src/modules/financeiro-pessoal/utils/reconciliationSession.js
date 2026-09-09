const SESSION_PREFIX = "cunha-finance:personal-reconciliation";
const SESSION_VERSION = 1;

export function reconciliationSessionKey(empresaId, userId) {
  return `${SESSION_PREFIX}:${empresaId || "unknown"}:${userId || "unknown"}`;
}

export function statementPeriod(statement) {
  const dates = (statement?.transactions || []).map((item) => item.date).filter(Boolean).sort();
  return dates.length ? { start: dates[0], end: dates.at(-1) } : { start: "", end: "" };
}

export function buildReconciliationSession({ fileName = "", statement, items = [], feedback = "", totals = null }) {
  if (!statement) return null;
  const safeStatement = {
    bank: statement.bank || "",
    accountHolder: statement.accountHolder || "",
    initialBalance: statement.initialBalance ?? null,
    printedIncoming: statement.printedIncoming ?? null,
    printedOutgoing: statement.printedOutgoing ?? null,
    finalBalance: statement.finalBalance ?? null,
    warnings: Array.isArray(statement.warnings) ? statement.warnings : [],
    transactions: (statement.transactions || []).map(({ id, date, description, direction, amount, isOwnTransfer }) => ({ id, date, description, direction, amount, isOwnTransfer: Boolean(isOwnTransfer) })),
  };
  const safeItems = items.map((item) => ({ ...item }));
  const groups = safeItems.reduce((result, item) => ({ ...result, [item.situation]: [...(result[item.situation] || []), item.id] }), {});
  return { version: SESSION_VERSION, fileName, period: statementPeriod(safeStatement), statement: safeStatement, items: safeItems, groups, totals, feedback };
}

export function loadReconciliationSession(storage, empresaId, userId) {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(reconciliationSessionKey(empresaId, userId)) || "null");
    return value?.statement && Array.isArray(value.items) ? value : null;
  } catch { return null; }
}

export function saveReconciliationSession(storage, empresaId, userId, value) {
  if (!storage || !value?.statement) return;
  try { storage.setItem(reconciliationSessionKey(empresaId, userId), JSON.stringify(value)); } catch { /* sessão indisponível: mantém o estado atual em memória */ }
}

export function clearReconciliationSession(storage, empresaId, userId) {
  storage?.removeItem(reconciliationSessionKey(empresaId, userId));
}
