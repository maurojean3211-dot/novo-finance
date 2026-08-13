const KEY = "cunha-finance:crm:customer-opportunity:v1";
const CUSTOMER_KEY = "cunha-finance:customers:selected:v1";

export function startCustomerOpportunityFlow({ empresaId, opportunityId }) {
  if (!empresaId || !opportunityId) return;
  sessionStorage.setItem(KEY, JSON.stringify({ empresaId: String(empresaId), opportunityId }));
}

export function startCustomerFlow({ empresaId, customerId }) {
  if (!empresaId || !customerId) return;
  sessionStorage.setItem(CUSTOMER_KEY, JSON.stringify({ empresaId: String(empresaId), customerId }));
}

export function consumeCustomerFlow({ empresaId }) {
  try {
    const value = JSON.parse(sessionStorage.getItem(CUSTOMER_KEY) || "null");
    return value?.empresaId === String(empresaId) ? value.customerId : null;
  } catch {
    sessionStorage.removeItem(CUSTOMER_KEY);
    return null;
  }
}

export function clearCustomerFlow() {
  sessionStorage.removeItem(CUSTOMER_KEY);
}

export function consumeCustomerOpportunityFlow({ empresaId }) {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    sessionStorage.removeItem(KEY);
    return value?.empresaId === String(empresaId) ? value.opportunityId : null;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}
