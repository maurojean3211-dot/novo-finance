export function normalizeText(value) { return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase(); }
export function normalizeCode(value) { return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/[–—]/g, "-"); }
export function normalizeDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let normalized = String(value).trim().replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!normalized) return null;
  const hasComma = normalized.includes(","); const hasDot = normalized.includes(".");
  if (hasComma && hasDot) { const lastComma = normalized.lastIndexOf(","); const lastDot = normalized.lastIndexOf("."); normalized = lastComma > lastDot ? normalized.replace(/\./g, "").replace(",", ".") : normalized.replace(/,/g, ""); }
  else if (hasComma) normalized = normalized.replace(",", ".");
  const parsed = Number(normalized); return Number.isFinite(parsed) ? parsed : null;
}
export function normalizePhone(value) { return String(value ?? "").replace(/[^\d+]/g, ""); }
export function normalizeDocumentNumber(value) { return String(value ?? "").replace(/\D/g, ""); }
export function normalizePageNumber(value) { const parsed = Number.parseInt(String(value ?? ""), 10); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
export function createSearchText(product) { const values = [product?.supplierName, product?.supplierCode, product?.marketCode, product?.name, product?.description, product?.category, product?.subcategory, product?.commercialLine, product?.family, product?.technical?.alloy, product?.technical?.temper, product?.technical?.finish, product?.technical?.dimensions?.originalText, ...(product?.synonyms ?? [])]; return normalizeText(values.filter(Boolean).join(" ")); }
export function createProductFingerprint(product) { const dimensions = product?.technical?.dimensions ?? {}; return [normalizeText(product?.supplierName), normalizeCode(product?.supplierCode), normalizeCode(product?.marketCode), normalizeText(product?.category), normalizeDecimal(dimensions.a), normalizeDecimal(dimensions.b), normalizeDecimal(dimensions.c), normalizeDecimal(product?.technical?.weightPerMeter)].join("|"); }
export function createId(prefix = "catalog") { if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`; return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
export function nowIso() { return new Date().toISOString(); }
