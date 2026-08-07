import { DUPLICATE_ACTIONS, EXTRACTION_CONFIDENCE, PRODUCT_TYPES } from "../constants/catalogo.constants";

const highConfidence = (value) => ({ value, confidence: EXTRACTION_CONFIDENCE.HIGH, rawValue: value == null ? null : String(value), warning: null });
const WZM_ITEMS = [
  ["WZM-020", "Barra chata canto vivo", "Barra chata", 0.081, [9.53, 3.18, null], 8, "9,53 x 3,18 mm"],
  ["WZM-052", "Cantoneira", "Cantoneira", 0.053, [12.7, 12.7, 0.8], 9, "12,70 x 12,70 x 0,80 mm"],
  ["WZM-187", "Vergalhão redondo", "Vergalhão redondo", 0.085, [6.35, null, null], 10, "Ø 6,35 mm"],
  ["WZM-239", "Tubo redondo", "Tubo redondo", 0.059, [9.52, 0.8, null], 12, "9,52 x 0,80 mm"],
  ["WZM-128", "Tubo quadrado", "Tubo quadrado", 0.22, [15.87, 15.87, 1.4], 14, "15,87 x 15,87 x 1,40 mm"],
  ["WZM-067", "Tubo retangular", "Tubo retangular", 0.46, [38.1, 25.4, 1.4], 15, "38,10 x 25,40 x 1,40 mm"],
];

export function createWzmDemoProducts() {
  return WZM_ITEMS.map(([supplierCode, description, category, weight, dimensions, page, originalText]) => ({
    supplierName: "WZM", supplierCode, name: description, description, category, productType: PRODUCT_TYPES.ALUMINUM_PROFILE,
    technical: { weightPerMeter: weight, weightUnit: "kg/m", dimensions: { a: dimensions[0], b: dimensions[1], c: dimensions[2], externalDiameter: category.includes("redondo") ? dimensions[0] : null, unit: "mm", originalText } },
    commercial: { currency: "BRL" }, source: { page }, selected: true, duplicateAction: DUPLICATE_ACTIONS.CREATE,
    confidence: { supplierCode: highConfidence(supplierCode), description: highConfidence(description), weightPerMeter: highConfidence(weight), dimensions: highConfidence(originalText) },
  }));
}
