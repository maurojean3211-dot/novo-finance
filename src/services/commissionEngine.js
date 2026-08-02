export const COMMISSION_TYPES = {
  PER_KG: "PER_KG",
  PERCENT_SALE: "PERCENT_SALE",
};

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
    return { type: COMMISSION_TYPES.PERCENT_SALE, rate: null };
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
  const percent = parseDecimal(percentage);
  const rule = getCommissionRule(product, fallbackPerKgRate);
  const totalSale = kilograms * unitPrice;
  const commission = rule.type === COMMISSION_TYPES.PERCENT_SALE
    ? totalSale * (percent / 100)
    : kilograms * rule.rate;

  return { kilograms, unitPrice, percentage: percent, totalSale, commission, rule };
}

export function getCommissionRuleLabel(product, storedRate = 0.05) {
  const rule = getCommissionRule(product, parseDecimal(storedRate));
  if (rule.type === COMMISSION_TYPES.PERCENT_SALE) return "Percentual sobre venda";
  return `R$ ${Number(rule.rate || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/kg`;
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
