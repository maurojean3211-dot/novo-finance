import { CATALOGO_IMPORT_STATUS, CATALOGO_IMPORT_TYPES, DEFAULT_IMPORT_SETTINGS, DUPLICATE_ACTIONS, EXTRACTION_CONFIDENCE, PRODUCT_STATUS, PRODUCT_TYPES } from "../constants/catalogo.constants";
import { createId, createProductFingerprint, nowIso } from "../utils/catalogo-normalizers";
import { validateExtractedProduct, validateImportDraft } from "../validators/catalogo.validators";
import { supabase } from "../../../supabase";

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

export async function listImportDrafts(companyId) { if(!companyId)return[];const{data,error}=await supabase.from("catalogo_importacoes").select("*").eq("empresa_id",String(companyId)).order("created_at",{ascending:false});if(error)throw error;return(data||[]).map((row)=>({...row.dados,id:row.id,companyId:row.empresa_id,userId:row.user_id,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at})); }
export async function getImportDraft(companyId, importId) { const{data,error}=await supabase.from("catalogo_importacoes").select("*").eq("id",importId).eq("empresa_id",String(companyId)).maybeSingle();if(error)throw error;return data?{...data.dados,id:data.id,companyId:data.empresa_id,userId:data.user_id,status:data.status,createdAt:data.created_at,updatedAt:data.updated_at}:null; }
export async function saveImportDraft(draft) {
  const validation = validateImportDraft(draft); if (!validation.valid) throw new Error(validation.errors.join(" "));
  const nextDraft={...draft,updatedAt:nowIso()};const{id,companyId,userId,status,createdAt,updatedAt,...dados}=nextDraft;void createdAt;const{error}=await supabase.from("catalogo_importacoes").upsert({id,empresa_id:String(companyId),user_id:userId,status,dados,updated_at:updatedAt});if(error)throw error;return nextDraft;
}
export async function deleteImportDraft(companyId, userId, importId) { void userId;const{error}=await supabase.from("catalogo_importacoes").delete().eq("id",importId).eq("empresa_id",String(companyId));if(error)throw error;return true; }

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
