import { EXTRACTION_CONFIDENCE, SUPPORTED_CURRENCIES } from "../constants/catalogo.constants";
import { normalizeCode, normalizeDecimal, normalizeText } from "../utils/catalogo-normalizers";
const VALID_CONFIDENCE_VALUES = new Set(Object.values(EXTRACTION_CONFIDENCE));
export function validateExtractedProduct(product) {
  const errors = []; const warnings = [];
  if (!normalizeText(product?.supplierName)) errors.push("Fornecedor não informado.");
  if (!normalizeCode(product?.supplierCode)) errors.push("Código do produto não informado.");
  if (!normalizeText(product?.name) && !normalizeText(product?.description) && !normalizeText(product?.category)) errors.push("O produto precisa ter nome, descrição ou categoria.");
  if (!product?.source?.page) errors.push("Página de origem não informada.");
  const weightPerMeter = normalizeDecimal(product?.technical?.weightPerMeter);
  if (weightPerMeter !== null && weightPerMeter < 0) errors.push("Peso por metro não pode ser negativo.");
  if (weightPerMeter === null) warnings.push("Peso por metro não encontrado.");
  if (!product?.technical?.dimensions?.originalText) { const dimensions = product?.technical?.dimensions ?? {}; const hasDimension = [dimensions.a, dimensions.b, dimensions.c, dimensions.width, dimensions.height, dimensions.thickness, dimensions.externalDiameter, dimensions.internalDiameter, dimensions.length].some((value) => normalizeDecimal(value) !== null); if (!hasDimension) warnings.push("Medidas não encontradas."); }
  if (!product?.technical?.alloy) warnings.push("Liga não informada no catálogo.");
  if (!product?.technical?.temper) warnings.push("Têmpera não informada no catálogo.");
  const currency = product?.commercial?.currency;
  if (currency && !/^[A-Z]{3}$/.test(currency) && !SUPPORTED_CURRENCIES.includes(currency)) warnings.push("Código de moeda fora do padrão ISO 4217.");
  Object.entries(product?.confidence ?? {}).forEach(([field, data]) => { if (!VALID_CONFIDENCE_VALUES.has(data?.confidence)) warnings.push(`Confiança inválida no campo ${field}.`); });
  return { valid: errors.length === 0, errors, warnings };
}
export function validateImportDraft(draft) { const errors = []; const warnings = []; if (!draft?.id) errors.push("Importação sem identificador."); if (!draft?.companyId) errors.push("Empresa não identificada."); if (!draft?.userId) errors.push("Usuário não identificado."); if (!normalizeText(draft?.supplierName)) warnings.push("Fornecedor ainda não identificado."); if (!Array.isArray(draft?.products)) errors.push("Lista de produtos inválida."); return { valid: errors.length === 0, errors, warnings }; }
export function canApproveProduct(product) { const result = validateExtractedProduct(product); if (!result.valid) return false; const confidenceValues = Object.values(product?.confidence ?? {}).map((field) => field?.confidence); return !confidenceValues.includes(EXTRACTION_CONFIDENCE.LOW); }
