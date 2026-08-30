import { getPurchaseCommissionData, getPurchaseOrderCommissionData, getStoredOrCalculatedCommission } from "./commissionEngine.js";
import { calculateCorporateFinanceMetrics } from "../modules/financeiro-corporativo/services/financeiroMetrics.js";

export const ENTERPRISE_REPORTS = Object.freeze({
  relatorio: { title: "Central de Relatórios", description: "Visão consolidada das operações empresariais.", type: "commercial" },
  relatorio_comercial: { title: "Relatório Comercial", description: "Vendas, compras e comissões empresariais consolidadas.", type: "commercial" },
  relatorio_financeiro: { title: "Relatório Financeiro", description: "Títulos, baixas, estornos e saldos do financeiro corporativo.", type: "financial" },
  relatorio_compras: { title: "Relatório de Compras", description: "Pedidos atuais e histórico legado identificados separadamente.", type: "purchases" },
  relatorio_vendas: { title: "Relatório de Vendas", description: "Valores, volumes, clientes e comissões por data de venda.", type: "sales" },
});

const SALES_FIELDS = "id,empresa_id,cliente_nome,produto,kilos,valor,comissao,valor_por_kg,comissao_por_kg,data_venda";
const CURRENT_PURCHASE_FIELDS = "id,empresa_id,fornecedor_id,fornecedor_snapshot,numero,status,data,previsao,valor_total,pedido_compra_itens(id,produto,descricao,quantidade,unidade,comissao)";
const LEGACY_PURCHASE_FIELDS = "id,empresa_id,data_compra,fornecedor,produto,kilos,valor,comissao,comissao_por_kg";

async function querySales(empresaId) {
  const { supabase } = await import("../supabase.js");
  const { data, error } = await supabase.from("vendas").select(SALES_FIELDS).eq("empresa_id", String(empresaId)).order("data_venda", { ascending: false });
  if (error) throw new Error(`Falha ao carregar vendas: ${error.message}`);
  return data || [];
}

async function queryCurrentPurchases(empresaId) {
  const { supabase } = await import("../supabase.js");
  const { data, error } = await supabase.from("pedidos_compra").select(CURRENT_PURCHASE_FIELDS).eq("empresa_id", String(empresaId)).order("data", { ascending: false });
  if (error) throw new Error(`Falha ao carregar pedidos atuais: ${error.message}`);
  return (data || []).map((row) => ({
    ...row,
    source: "current",
    sourceLabel: "Pedido atual",
    fornecedorId: row.fornecedor_id,
    fornecedor: row.fornecedor_snapshot || {},
    valorTotal: Number(row.valor_total || 0),
    items: (row.pedido_compra_itens || []).map((item) => ({
      ...item,
      codigo: item.produto,
      quantidade: Number(item.quantidade || 0),
    })),
  }));
}

async function queryLegacyPurchases(empresaId) {
  const { supabase } = await import("../supabase.js");
  const { data, error } = await supabase.from("compras").select(LEGACY_PURCHASE_FIELDS).eq("empresa_id", String(empresaId)).order("data_compra", { ascending: false });
  if (error) throw new Error(`Falha ao carregar compras legadas: ${error.message}`);
  return (data || []).map((row) => ({ ...row, source: "legacy", sourceLabel: "Compra histórica" }));
}

const defaultLoaders = {
  sales: querySales,
  purchases: async (empresaId) => {
    const [current, legacy] = await Promise.all([queryCurrentPurchases(empresaId), queryLegacyPurchases(empresaId)]);
    return { current, legacy };
  },
  financial: async (empresaId) => {
    const { loadCorporateFinance } = await import("../modules/financeiro-corporativo/services/financeiro.service.js");
    return loadCorporateFinance(empresaId);
  },
};

export async function loadEnterpriseReport(reportType, empresaId, loaders = defaultLoaders) {
  if (!empresaId) throw new Error("Empresa não identificada para o relatório.");
  const config = ENTERPRISE_REPORTS[reportType] || ENTERPRISE_REPORTS.relatorio;
  if (config.type === "financial") return { financial: await loaders.financial(empresaId) };
  if (config.type === "sales") return { sales: await loaders.sales(empresaId) };
  if (config.type === "purchases") return { purchases: await loaders.purchases(empresaId) };
  const [sales, purchases] = await Promise.all([loaders.sales(empresaId), loaders.purchases(empresaId)]);
  return { sales, purchases };
}

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateOnly = (value) => String(value || "").slice(0, 10);
const inPeriod = (value, startDate, endDate) => {
  const date = dateOnly(value);
  if (!date) return false;
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
};

function filteredSales(sales, startDate, endDate) {
  return (sales || []).filter((item) => inPeriod(item.data_venda, startDate, endDate));
}

function filteredPurchases(purchases, startDate, endDate) {
  return {
    current: (purchases?.current || []).filter((item) => inPeriod(item.data, startDate, endDate)),
    legacy: (purchases?.legacy || []).filter((item) => inPeriod(item.data_compra, startDate, endDate)),
  };
}

function salesView(sales, accessMode) {
  const rows = sales.map((item) => ({
    key: `sale:${item.id}`,
    date: dateOnly(item.data_venda),
    party: item.cliente_nome || "Cliente não informado",
    detail: item.produto || "Produto não informado",
    volume: number(item.kilos),
    value: number(item.valor),
    commission: getStoredOrCalculatedCommission(item),
    source: "Venda",
  }));
  const value = rows.reduce((sum, item) => sum + item.value, 0);
  const volume = rows.reduce((sum, item) => sum + item.volume, 0);
  const commission = rows.reduce((sum, item) => sum + item.commission, 0);
  const metrics = [
    { label: "Vendas do período", value: rows.length, detail: "registros de vendas", icon: "↗" },
    { label: "Valor vendido", value, money: true, detail: "pela data da venda", icon: "R$", tone: "green" },
    { label: "Volume vendido", value: volume, suffix: " kg", detail: "peso informado", icon: "⚖" },
  ];
  if (accessMode === "master") metrics.push({ label: "Comissões", value: commission, money: true, detail: "persistidas ou calculadas", icon: "%", tone: "amber" });
  return { metrics, rows, empty: "Nenhuma venda encontrada no período." };
}

function purchaseRows(purchases) {
  const current = purchases.current.map((item) => ({
    key: `current:${item.id}`,
    date: dateOnly(item.data),
    party: item.fornecedor?.nome || "Fornecedor não informado",
    detail: `${item.numero || "Pedido"} · ${item.status || "Sem status"}`,
    volume: item.items.reduce((sum, entry) => sum + number(entry.quantidade), 0),
    value: number(item.valorTotal),
    commission: getPurchaseOrderCommissionData(item).commission,
    source: "Pedido atual",
    consolidationKey: `fornecedor:id:${item.fornecedorId || item.id}`,
    active: item.status !== "Cancelado",
  }));
  const legacy = purchases.legacy.map((item) => ({
    key: `legacy:${item.id}`,
    date: dateOnly(item.data_compra),
    party: item.fornecedor || "Fornecedor não informado",
    detail: item.produto || "Produto não informado",
    volume: number(item.kilos),
    value: number(item.valor),
    commission: getPurchaseCommissionData(item).commission,
    source: "Compra histórica",
    consolidationKey: `fornecedor:legado:${String(item.fornecedor || item.id).toUpperCase()}`,
    active: true,
  }));
  return [...current, ...legacy].sort((a, b) => b.date.localeCompare(a.date));
}

function purchasesView(purchases, accessMode) {
  const rows = purchaseRows(purchases);
  const active = rows.filter((item) => item.active);
  const metrics = [
    { label: "Pedidos atuais", value: purchases.current.length, detail: "fluxo Compras Inteligentes", icon: "▥" },
    { label: "Compras históricas", value: purchases.legacy.length, detail: "fonte legada identificada", icon: "◷" },
    { label: "Valor ativo", value: active.reduce((sum, item) => sum + item.value, 0), money: true, detail: "cancelados não somam", icon: "R$", tone: "amber" },
    { label: "Volume", value: active.reduce((sum, item) => sum + item.volume, 0), suffix: " un./kg", detail: "conforme unidade de origem", icon: "⚖" },
  ];
  if (accessMode === "master") metrics.push({ label: "Comissões", value: active.reduce((sum, item) => sum + item.commission, 0), money: true, detail: "pedidos e histórico", icon: "%" });
  return { metrics, rows, empty: "Nenhuma compra encontrada no período." };
}

function commercialView(sales, purchases, accessMode) {
  const saleRows = salesView(sales, "master").rows;
  const purchaseRowsList = purchaseRows(purchases);
  const parties = new Map();
  const add = (key, party, kind, volume, value, commission) => {
    const current = parties.get(key) || { key, party, kind, volume: 0, value: 0, commission: 0 };
    current.volume += volume;
    current.value += value;
    current.commission += commission;
    parties.set(key, current);
  };
  saleRows.forEach((item) => add(`cliente:nome:${item.party.toUpperCase()}`, item.party, "Cliente", item.volume, item.value, item.commission));
  purchaseRowsList.filter((item) => item.active).forEach((item) => add(item.consolidationKey, item.party, "Fornecedor", item.volume, item.value, item.commission));
  const rows = [...parties.values()].map((item) => ({ ...item, date: "", detail: item.kind, source: item.kind }));
  const purchaseValue = purchaseRowsList.filter((item) => item.active).reduce((sum, item) => sum + item.value, 0);
  const metrics = [
    { label: "Valor vendido", value: saleRows.reduce((sum, item) => sum + item.value, 0), money: true, detail: "operações de venda", icon: "↗", tone: "green" },
    { label: "Valor comprado", value: purchaseValue, money: true, detail: "pedidos atuais e legado", icon: "↙", tone: "amber" },
    { label: "Contrapartes", value: rows.length, detail: "clientes e fornecedores separados", icon: "◇" },
  ];
  if (accessMode === "master") metrics.push({ label: "Comissões", value: [...saleRows, ...purchaseRowsList.filter((item) => item.active)].reduce((sum, item) => sum + item.commission, 0), money: true, detail: "vendas e compras", icon: "%" });
  return { metrics, rows, empty: "Nenhuma operação comercial encontrada no período." };
}

function financialView(financial, startDate, endDate) {
  const metrics = calculateCorporateFinanceMetrics(financial, {
    period: "custom",
    customStart: startDate,
    customEnd: endDate,
  });
  const rows = metrics.periodTitles.map((item) => ({
    key: `title:${item.id}`,
    date: dateOnly(item.vencimento),
    party: item.contraparte_nome || "Contraparte não informada",
    detail: `${item.tipo} · ${item.status}`,
    volume: 0,
    value: number(item.saldo),
    commission: 0,
    source: item.origem || "Financeiro",
  }));
  return {
    metrics: [
      { label: "Recebido", value: metrics.received, money: true, detail: "baixas menos estornos", icon: "↗", tone: "green" },
      { label: "Pago", value: metrics.paid, money: true, detail: "baixas menos estornos", icon: "↘", tone: "amber" },
      { label: "Realizado", value: metrics.realized, money: true, detail: "recebido menos pago", icon: "R$", tone: metrics.realized >= 0 ? "green" : "rose" },
      { label: "A receber", value: metrics.receivableBalance, money: true, detail: "saldo dos títulos", icon: "+" },
      { label: "A pagar", value: metrics.payableBalance, money: true, detail: "saldo dos títulos", icon: "−" },
    ],
    rows,
    empty: "Nenhum título financeiro encontrado no período.",
  };
}

export function buildEnterpriseReport({ reportType, data, startDate, endDate, accessMode = "user" }) {
  const config = ENTERPRISE_REPORTS[reportType] || ENTERPRISE_REPORTS.relatorio;
  if (config.type === "financial") return { config, ...financialView(data.financial, startDate, endDate) };
  const sales = filteredSales(data.sales, startDate, endDate);
  if (config.type === "sales") return { config, ...salesView(sales, accessMode) };
  const purchases = filteredPurchases(data.purchases, startDate, endDate);
  if (config.type === "purchases") return { config, ...purchasesView(purchases, accessMode) };
  return { config, ...commercialView(sales, purchases, accessMode) };
}
