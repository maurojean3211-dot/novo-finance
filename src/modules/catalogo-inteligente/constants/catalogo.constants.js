export const CATALOGO_IMPORT_TYPES = Object.freeze({ PDF: "pdf", EXCEL: "excel", CSV: "csv", MANUAL: "manual" });
export const CATALOGO_IMPORT_STATUS = Object.freeze({ DRAFT: "draft", READING: "reading", REVIEW: "review", APPROVED: "approved", IMPORTED: "imported", ERROR: "error" });
export const PRODUCT_STATUS = Object.freeze({ ACTIVE: "active", INACTIVE: "inactive", DRAFT: "draft", ARCHIVED: "archived" });
export const EXTRACTION_CONFIDENCE = Object.freeze({ HIGH: "high", MEDIUM: "medium", LOW: "low", NOT_FOUND: "not_found" });
export const DUPLICATE_ACTIONS = Object.freeze({ CREATE: "create", UPDATE: "update", IGNORE: "ignore", REVIEW: "review" });
export const PRODUCT_TYPES = Object.freeze({ ALUMINUM_PROFILE: "aluminum_profile", ALUMINUM_BILLET: "aluminum_billet", REFRACTORY: "refractory", THERMOCOUPLE: "thermocouple", CERAMIC_FILTER: "ceramic_filter", GRAPHITE: "graphite", METAL: "metal", MASTER_ALLOY: "master_alloy", LUBRICANT: "lubricant", OTHER: "other" });
export const WEIGHT_UNITS = Object.freeze({ KG_PER_METER: "kg/m", KG_PER_PIECE: "kg/piece", KG: "kg", TON: "t" });
export const MEASURE_UNITS = Object.freeze({ MILLIMETER: "mm", CENTIMETER: "cm", METER: "m", INCH: "in" });
export const SALES_UNITS = Object.freeze({ KG: "kg", TON: "t", METER: "m", PIECE: "piece", UNIT: "unit", BOX: "box", PACKAGE: "package", ROLL: "roll" });
export const SUPPORTED_CURRENCIES = Object.freeze(["BRL", "USD", "EUR", "GBP", "CAD", "MXN"]);
export const WZM_INITIAL_CATEGORIES = Object.freeze([
  { id: "barra-chata", name: "Barra chata", productType: PRODUCT_TYPES.ALUMINUM_PROFILE },
  { id: "cantoneira", name: "Cantoneira", productType: PRODUCT_TYPES.ALUMINUM_PROFILE },
  { id: "vergalhao-redondo", name: "Vergalhão redondo", productType: PRODUCT_TYPES.ALUMINUM_PROFILE },
  { id: "perfil-u", name: "Perfil U", productType: PRODUCT_TYPES.ALUMINUM_PROFILE },
  { id: "tubo-redondo", name: "Tubo redondo", productType: PRODUCT_TYPES.ALUMINUM_PROFILE },
  { id: "tubo-quadrado", name: "Tubo quadrado", productType: PRODUCT_TYPES.ALUMINUM_PROFILE },
  { id: "tubo-retangular", name: "Tubo retangular", productType: PRODUCT_TYPES.ALUMINUM_PROFILE },
]);
export const BGB_INITIAL_CATEGORIES = Object.freeze(["Termometria", "Refratários e isolamento", "Tintas e revestimentos", "Filtração e tratamento do alumínio", "Grafite e componentes", "Lubrificantes", "Metais e antiligas", "Outros insumos"]);
export const DEFAULT_IMPORT_SETTINGS = Object.freeze({ requireHumanReview: true, allowAutomaticDatabaseWrite: false, minimumConfidenceForApproval: EXTRACTION_CONFIDENCE.MEDIUM, detectDuplicates: true, preserveSourceReference: true });
