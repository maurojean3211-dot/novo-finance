export const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function dateLabel(value) { if (!value) return "—"; const [year, month, day] = String(value).slice(0, 10).split("-"); return year && month && day ? `${day}/${month}/${year}` : value; }
export const netIncome = (income) => Number(income.valorBruto || 0) - Number(income.descontos || 0);
