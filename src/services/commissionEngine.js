export const COMMISSION_TYPES = {
  PER_KG: "PER_KG",
  PERCENT_SALE: "PERCENT_SALE",
};

export const DEFAULT_PROFILE_COMMISSION_PERCENT = 1.5;

export function parseDecimal(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim();
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toKilograms(quantity, unit = "KG") {
  const amount = parseDecimal(quantity);
  const normalizedUnit = String(unit).trim().toUpperCase();
  return ["T", "TON", "TONELADA", "TONELADAS"].includes(normalizedUnit)
    ? amount * 1000
    : amount;
}

export function getCommissionRule(product, fallbackPerKgRate = 0.05) {
  const name = String(product || "").trim().toUpperCase();

  if (name.includes("PERFIL")) {
    return { type: COMMISSION_TYPES.PERCENT_SALE, rate: DEFAULT_PROFILE_COMMISSION_PERCENT };
  }

  if (name.includes("CAVACO") || name.includes("LIMALHA")) {
    return { type: COMMISSION_TYPES.PER_KG, rate: 0.07 };
  }

  if (name.includes("TARUGO")) {
    return { type: COMMISSION_TYPES.PER_KG, rate: 0.05 };
  }

  return { type: COMMISSION_TYPES.PER_KG, rate: fallbackPerKgRate };
}

export function calculateCommission({
  product,
  quantity,
  unit = "KG",
  pricePerKg = 0,
  percentage = 0,
  fallbackPerKgRate = 0.05,
}) {
  const kilograms = toKilograms(quantity, unit);
  const unitPrice = parseDecimal(pricePerKg);
  const rule = getCommissionRule(product, fallbackPerKgRate);
  const percent = rule.type === COMMISSION_TYPES.PERCENT_SALE && String(percentage ?? "").trim() === ""
    ? rule.rate
    : parseDecimal(percentage);
  const totalSale = kilograms * unitPrice;
  const commission = rule.type === COMMISSION_TYPES.PERCENT_SALE
    ? totalSale * (percent / 100)
    : kilograms * rule.rate;

  return { kilograms, unitPrice, percentage: percent, totalSale, commission, rule };
}

export function getCommissionRuleLabel(product, storedRate = 0.05) {
  const rule = getCommissionRule(product, parseDecimal(storedRate));
  if (rule.type === COMMISSION_TYPES.PERCENT_SALE) return `${formatPercentage(rule.rate)} sobre o total`;
  return `R$ ${Number(rule.rate || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/kg`;
}

export function getSaleCommissionPercentage(sale) {
  if (sale.percentual_comissao !== null && sale.percentual_comissao !== undefined && sale.percentual_comissao !== "") {
    return parseDecimal(sale.percentual_comissao);
  }

  const totalSale = parseDecimal(sale.valor || sale.valor_total);
  const storedCommission = parseDecimal(sale.comissao);
  return totalSale > 0 && storedCommission >= 0
    ? (storedCommission / totalSale) * 100
    : DEFAULT_PROFILE_COMMISSION_PERCENT;
}

export function formatPercentage(value) {
  return `${parseDecimal(value).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
}

export function normalizePurchaseProductName(product) {
  return String(product || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function getDefaultPurchaseCommissionRate(product) {
  const name = normalizePurchaseProductName(product);
  if (name.includes("CAVACO") || name.includes("LIMALHA")) return 0.07;
  if (name.includes("SUCATA DE ALUMINIO")) return 0.05;
  return 0;
}

export function roundPurchaseCommission(value) {
  return Math.round((parseDecimal(value) + Number.EPSILON) * 100) / 100;
}

export function calculatePurchaseCommission({ product, quantity, unit = "KG", rate = "" }) {
  const kilograms = toKilograms(quantity, unit);
  const manualRate = String(rate ?? "").trim();
  const commissionRate = manualRate === "" ? getDefaultPurchaseCommissionRate(product) : parseDecimal(rate);
  return { kilograms, rate: commissionRate, commission: roundPurchaseCommission(kilograms * commissionRate) };
}

export function getPurchaseCommissionData(purchase) {
  const kilograms = toKilograms(purchase.kilos || purchase.quantidade || 0, purchase.unidade_original || "KG");
  const persistedCommission = parseDecimal(purchase.comissao);
  const explicitRate = purchase.comissao_por_kg ?? purchase.taxa_comissao;
  const rate = explicitRate !== null && explicitRate !== undefined && explicitRate !== ""
    ? parseDecimal(explicitRate)
    : persistedCommission > 0 && kilograms > 0
      ? persistedCommission / kilograms
      : getDefaultPurchaseCommissionRate(purchase.produto || purchase.material || purchase.descricao);
  const commission = persistedCommission > 0 ? persistedCommission : roundPurchaseCommission(kilograms * rate);
  return { kilograms, rate, commission };
}

export function getPurchaseItemCommissionData(item) {
  return getPurchaseCommissionData({
    produto: item.descricao || item.produto || item.codigo,
    kilos: item.quantidade,
    unidade_original: item.unidade || "KG",
    comissao: item.comissao,
    comissao_por_kg: item.comissaoPorKg ?? item.comissao_por_kg,
  });
}

export function getPurchaseOrderCommissionData(order) {
  const items = (order.items || []).map(getPurchaseItemCommissionData);
  return { items, commission: roundPurchaseCommission(items.reduce((total, item) => total + item.commission, 0)) };
}

export function formatPurchaseCommissionRate(rate) {
  const value = parseDecimal(rate);
  return value > 0
    ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    : "";
}

export function getStoredOrCalculatedCommission(sale) {
  if (sale.comissao !== null && sale.comissao !== undefined && sale.comissao !== "") {
    return parseDecimal(sale.comissao);
  }

  return calculateCommission({
    product: sale.produto,
    quantity: sale.kilos,
    unit: "KG",
    pricePerKg: sale.valor_por_kg || 0,
    percentage: sale.percentual_comissao || 0,
  }).commission;
}
