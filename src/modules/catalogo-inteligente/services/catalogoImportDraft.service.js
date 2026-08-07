import { CATALOGO_IMPORT_STATUS, CATALOGO_IMPORT_TYPES, DEFAULT_IMPORT_SETTINGS, DUPLICATE_ACTIONS, EXTRACTION_CONFIDENCE, PRODUCT_STATUS, PRODUCT_TYPES } from "../constants/catalogo.constants";
import { createId, createProductFingerprint, nowIso } from "../utils/catalogo-normalizers";
import { validateExtractedProduct, validateImportDraft } from "../validators/catalogo.validators";

const STORAGE_PREFIX = "cunha-finance:catalog-imports";
function getStorageKey(companyId, userId) { if (!companyId || !userId) throw new Error("Empresa e usuário são obrigatórios para acessar as importações."); return `${STORAGE_PREFIX}:${companyId}:${userId}`; }
function readStorage(companyId, userId) { const raw = localStorage.getItem(getStorageKey(companyId, userId)); if (!raw) return []; try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function writeStorage(companyId, userId, drafts) { localStorage.setItem(getStorageKey(companyId, userId), JSON.stringify(drafts)); }

export function createEmptyDimensions() { return { a: null, b: null, c: null, width: null, height: null, thickness: null, externalDiameter: null, internalDiameter: null, length: null, unit: "mm", originalText: null }; }
export function createEmptyTechnicalData() { return { weightPerMeter: null, weightPerPiece: null, weightUnit: null, dimensions: createEmptyDimensions(), alloy: null, temper: null, finish: null, color: null, standard: null, application: null }; }
export function createEmptyCommercialData() { return { costPerKg: null, pricePerKg: null, pricePerMeter: null, pricePerPiece: null, currency: "BRL", stockQuantity: null, minimumOrder: null, salesUnit: null, leadTimeDays: null, notes: null }; }

export function createExtractedProduct(input = {}) {
  const timestamp = nowIso();
  return {
    id: input.id ?? createId("product"), existingProductId: input.existingProductId ?? null, supplierName: input.supplierName ?? "", supplierCode: input.supplierCode ?? null, marketCode: input.marketCode ?? null, name: input.name ?? "", description: input.description ?? "", productType: input.productType ?? PRODUCT_TYPES.OTHER, category: input.category ?? "", subcategory: input.subcategory ?? null, commercialLine: input.commercialLine ?? null, family: input.family ?? null, status: input.status ?? PRODUCT_STATUS.DRAFT,
    technical: { ...createEmptyTechnicalData(), ...(input.technical ?? {}), dimensions: { ...createEmptyDimensions(), ...(input.technical?.dimensions ?? {}) } },
    commercial: { ...createEmptyCommercialData(), ...(input.commercial ?? {}) },
    source: { importId: input.source?.importId ?? null, supplierId: input.source?.supplierId ?? null, supplierName: input.source?.supplierName ?? input.supplierName ?? "", catalogName: input.source?.catalogName ?? null, catalogVersion: input.source?.catalogVersion ?? null, originalFileName: input.source?.originalFileName ?? null, page: input.source?.page ?? null, section: input.source?.section ?? null, rawText: input.source?.rawText ?? null, imageReference: input.source?.imageReference ?? null, importedAt: input.source?.importedAt ?? timestamp, importedBy: input.source?.importedBy ?? null },
    confidence: input.confidence ?? {
      supplierCode: { value: input.supplierCode ?? null, confidence: EXTRACTION_CONFIDENCE.NOT_FOUND, rawValue: null, warning: null },
      description: { value: input.description ?? null, confidence: EXTRACTION_CONFIDENCE.NOT_FOUND, rawValue: null, warning: null },
      weightPerMeter: { value: input.technical?.weightPerMeter ?? null, confidence: EXTRACTION_CONFIDENCE.NOT_FOUND, rawValue: null, warning: null },
      dimensions: { value: input.technical?.dimensions ?? null, confidence: EXTRACTION_CONFIDENCE.NOT_FOUND, rawValue: null, warning: null },
    },
    synonyms: Array.isArray(input.synonyms) ? input.synonyms : [], warnings: Array.isArray(input.warnings) ? input.warnings : [], selected: input.selected ?? true, duplicateAction: input.duplicateAction ?? DUPLICATE_ACTIONS.CREATE, duplicateOf: input.duplicateOf ?? null, createdAt: input.createdAt ?? timestamp, updatedAt: timestamp,
  };
}

export function createImportDraft({ companyId, userId, supplierName = "", supplierId = null, catalogName = null, catalogVersion = null, originalFileName = null, type = CATALOGO_IMPORT_TYPES.PDF, totalPages = null }) {
  const timestamp = nowIso();
  return { id: createId("import"), type, status: CATALOGO_IMPORT_STATUS.DRAFT, supplierName, supplierId, catalogName, catalogVersion, originalFileName, totalPages, processedPages: 0, products: [], errors: [], warnings: [], settings: { ...DEFAULT_IMPORT_SETTINGS }, companyId, userId, createdAt: timestamp, updatedAt: timestamp };
}

export function listImportDrafts(companyId, userId) { return readStorage(companyId, userId); }
export function getImportDraft(companyId, userId, importId) { return readStorage(companyId, userId).find((draft) => draft.id === importId) ?? null; }
export function saveImportDraft(draft) {
  const validation = validateImportDraft(draft); if (!validation.valid) throw new Error(validation.errors.join(" "));
  const drafts = readStorage(draft.companyId, draft.userId); const nextDraft = { ...draft, updatedAt: nowIso() }; const existingIndex = drafts.findIndex((item) => item.id === nextDraft.id);
  if (existingIndex >= 0) drafts[existingIndex] = nextDraft; else drafts.unshift(nextDraft);
  writeStorage(nextDraft.companyId, nextDraft.userId, drafts); return nextDraft;
}
export function deleteImportDraft(companyId, userId, importId) { const drafts = readStorage(companyId, userId); const updated = drafts.filter((draft) => draft.id !== importId); writeStorage(companyId, userId, updated); return updated.length !== drafts.length; }

export function addProductToDraft(draft, input) {
  const product = createExtractedProduct({ ...input, supplierName: input.supplierName ?? draft.supplierName, source: { ...(input.source ?? {}), importId: draft.id, supplierId: draft.supplierId, supplierName: input.source?.supplierName ?? draft.supplierName, catalogName: input.source?.catalogName ?? draft.catalogName, catalogVersion: input.source?.catalogVersion ?? draft.catalogVersion, originalFileName: input.source?.originalFileName ?? draft.originalFileName, importedBy: input.source?.importedBy ?? draft.userId } });
  const validation = validateExtractedProduct(product); const nextProduct = { ...product, warnings: [...new Set([...(product.warnings ?? []), ...validation.warnings, ...validation.errors])] };
  return { ...draft, products: [...draft.products, nextProduct], updatedAt: nowIso() };
}

export function updateProductInDraft(draft, productId, changes) {
  const products = draft.products.map((product) => product.id !== productId ? product : createExtractedProduct({ ...product, ...changes, technical: { ...product.technical, ...(changes.technical ?? {}), dimensions: { ...product.technical?.dimensions, ...(changes.technical?.dimensions ?? {}) } }, commercial: { ...product.commercial, ...(changes.commercial ?? {}) }, source: { ...product.source, ...(changes.source ?? {}) }, confidence: { ...product.confidence, ...(changes.confidence ?? {}) }, updatedAt: nowIso() }));
  return { ...draft, products, updatedAt: nowIso() };
}

export function detectInternalDuplicates(draft) {
  const fingerprints = new Map();
  const products = draft.products.map((product) => { const fingerprint = createProductFingerprint(product); const existingId = fingerprints.get(fingerprint); if (!existingId) { fingerprints.set(fingerprint, product.id); return product; } return { ...product, duplicateAction: DUPLICATE_ACTIONS.REVIEW, duplicateOf: existingId, warnings: [...new Set([...(product.warnings ?? []), "Possível duplicidade encontrada nesta importação."])], updatedAt: nowIso() }; });
  return { ...draft, products, updatedAt: nowIso() };
}

export function getImportSummary(draft) {
  const selected = draft.products.filter((product) => product.selected); const duplicates = draft.products.filter((product) => product.duplicateOf); const withWarnings = draft.products.filter((product) => product.warnings?.length);
  return { total: draft.products.length, selected: selected.length, ignored: draft.products.length - selected.length, duplicates: duplicates.length, withWarnings: withWarnings.length, readyForReview: draft.products.filter((product) => validateExtractedProduct(product).valid).length };
}
