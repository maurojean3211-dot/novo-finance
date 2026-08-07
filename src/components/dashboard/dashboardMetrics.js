import { getPurchaseCommissionData, getStoredOrCalculatedCommission } from "../../services/commissionEngine";

export const PERIOD_OPTIONS = [
  ["today", "Hoje"],
  ["7days", "Últimos 7 dias"],
  ["30days", "Últimos 30 dias"],
  ["month", "Mês atual"],
  ["year", "Ano atual"],
  ["custom", "Personalizado"],
];

const DAY = 86400000;
export const moneyValue = (item) => Number(item?.valor ?? item?.valor_total ?? 0) || 0;
export const dateValue = (item, fields) => fields.map((field) => item?.[field]).find(Boolean) || null;

function localDate(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

export function resolvePeriod(period, customStart, customEnd, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  let start = new Date(end);
  if (period === "7days") start = new Date(end.getTime() - 6 * DAY);
  if (period === "30days") start = new Date(end.getTime() - 29 * DAY);
  if (period === "month") start = new Date(end.getFullYear(), end.getMonth(), 1, 12);
  if (period === "year") start = new Date(end.getFullYear(), 0, 1, 12);
  if (period === "custom") {
    return { start: customStart || null, end: customEnd || null };
  }
  return { start: iso(start), end: iso(end) };
}

export function inPeriod(item, fields, range) {
  const date = localDate(dateValue(item, fields));
  if (!date) return false;
  const start = localDate(range.start);
  const end = localDate(range.end);
  return (!start || date >= start) && (!end || date <= end);
}

export function buildMonthlyFlow(lancamentos, range) {
  const start = localDate(range.start);
  const end = localDate(range.end);
  if (!start || !end) return [];
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  const last = new Date(end.getFullYear(), end.getMonth(), 1, 12);
  while (cursor <= last) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, mes: cursor.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), receitas: 0, despesas: 0, resultado: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const byMonth = Object.fromEntries(months.map((month) => [month.key, month]));
  lancamentos.forEach((item) => {
    const date = localDate(dateValue(item, ["data_lancamento", "data"]));
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = byMonth[key];
    if (!month) return;
    if (item.tipo === "receita") month.receitas += moneyValue(item);
    if (item.tipo === "despesa") month.despesas += moneyValue(item);
    month.resultado = month.receitas - month.despesas;
  });
  return months;
}

export function buildRecentActivities({ vendas, compras, lancamentos, clientes }) {
  return [
    ...vendas.map((item) => ({ id: `v-${item.id}`, type: "Venda", description: item.cliente_nome || item.produto || "Venda registrada", date: dateValue(item, ["data_venda", "created_at"]), value: moneyValue(item), icon: "↗" })),
    ...compras.map((item) => ({ id: `c-${item.id}`, type: "Compra", description: item.fornecedor || item.produto || "Compra registrada", date: dateValue(item, ["data_compra", "created_at"]), value: moneyValue(item), icon: "▧" })),
    ...lancamentos.map((item) => ({ id: `l-${item.id}`, type: item.tipo === "receita" ? "Receita" : item.tipo === "despesa" ? "Despesa" : "Lançamento", description: item.descricao || "Lançamento financeiro", date: dateValue(item, ["data_lancamento", "data", "created_at"]), value: moneyValue(item), icon: "$" })),
    ...clientes.map((item) => ({ id: `cl-${item.id}`, type: "Cliente", description: item.nome || "Cliente cadastrado", date: item.created_at, value: null, icon: "◎" })),
  ].filter((item) => item.date).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);
}

export function calculateDashboardMetrics(data, range) {
  const vendas = data.vendas.filter((item) => inPeriod(item, ["data_venda", "created_at"], range));
  const compras = data.compras.filter((item) => inPeriod(item, ["data_compra", "created_at"], range));
  const lancamentos = data.lancamentos.filter((item) => inPeriod(item, ["data_lancamento", "data", "created_at"], range));
  const recebimentos = data.recebimentos.filter((item) => inPeriod(item, ["data_vencimento", "created_at"], range));
  const novosClientes = data.clientes.filter((item) => inPeriod(item, ["created_at"], range));
  const pedidosCompra = data.pedidos_compra.filter((item) => inPeriod(item, ["data", "created_at"], range));
  const oportunidades = data.crm_oportunidades.filter((item) => inPeriod(item, ["created_at"], range));
  const orcamentos = data.orcamentos.filter((item) => inPeriod(item, ["data", "created_at"], range));
  const receitas = lancamentos.filter((item) => item.tipo === "receita");
  const despesas = lancamentos.filter((item) => item.tipo === "despesa");
  const pendentes = recebimentos.filter((item) => !["pago", "recebido"].includes(String(item.status || "").toLowerCase().trim()));
  const totalVendas = vendas.reduce((sum, item) => sum + moneyValue(item), 0);
  const totalCompras = compras.reduce((sum, item) => sum + moneyValue(item), 0);
  const totalReceitas = receitas.reduce((sum, item) => sum + moneyValue(item), 0);
  const totalDespesas = despesas.reduce((sum, item) => sum + moneyValue(item), 0);
  return {
    vendas, compras, lancamentos, recebimentos, novosClientes, receitas, despesas, pendentes,
    pedidos_compra: pedidosCompra, crm_oportunidades: oportunidades, orcamentos,
    totalVendas, totalCompras, totalReceitas, totalDespesas,
    ticketMedio: vendas.length ? totalVendas / vendas.length : 0,
    comissaoVendas: vendas.reduce((sum, item) => sum + getStoredOrCalculatedCommission(item), 0),
    pesoCompras: compras.reduce((sum, item) => sum + getPurchaseCommissionData(item).kilograms, 0),
    comissaoCompras: compras.reduce((sum, item) => sum + getPurchaseCommissionData(item).commission, 0),
    contasReceber: pendentes.reduce((sum, item) => sum + moneyValue(item), 0),
    resultado: totalReceitas - totalDespesas,
    fluxoMensal: buildMonthlyFlow(lancamentos, range),
    recent: buildRecentActivities({ vendas, compras, lancamentos, clientes: novosClientes }),
  };
}
