const SESSION_PREFIX = "cunha-finance:personal-reconciliation";

export function reconciliationSessionKey(empresaId, userId) {
  return `${SESSION_PREFIX}:${empresaId || "unknown"}:${userId || "unknown"}`;
}

export function statementPeriod(statement) {
  const dates = (statement?.transactions || []).map((item) => item.date).filter(Boolean).sort();
  return dates.length ? { start: dates[0], end: dates.at(-1) } : { start: "", end: "" };
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
  storage.setItem(reconciliationSessionKey(empresaId, userId), JSON.stringify(value));
}

export function clearReconciliationSession(storage, empresaId, userId) {
  storage?.removeItem(reconciliationSessionKey(empresaId, userId));
}
