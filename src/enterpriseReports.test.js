import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildEnterpriseReport, ENTERPRISE_REPORTS, loadEnterpriseReport } from "./services/enterpriseReports.service.js";
import { calculateCorporateFinanceMetrics } from "./modules/financeiro-corporativo/services/financeiroMetrics.js";

const period = { startDate: "2026-08-01", endDate: "2026-08-31" };
const sale = { id: "sale-1", cliente_nome: "Empresa Homônima", produto: "Perfil", kilos: 100, valor: 1000, comissao: 15, data_venda: "2026-08-10" };
const currentPurchase = {
  id: "order-1", fornecedorId: "supplier-1", fornecedor: { nome: "Empresa Homônima" }, numero: "PC-1", status: "Comprado", data: "2026-08-11", valorTotal: 400,
  items: [{ id: "item-1", descricao: "Sucata de alumínio", quantidade: 50, unidade: "KG", comissao: 2.5 }],
};
const legacyPurchase = { id: "legacy-1", fornecedor: "Fornecedor Legado", produto: "Cavaco", kilos: 20, valor: 100, comissao: 1.4, data_compra: "2026-08-12" };
const purchases = { current: [currentPurchase], legacy: [legacyPurchase] };

function dataFor(reportType) {
  if (reportType === "relatorio_vendas") return { sales: [sale] };
  if (reportType === "relatorio_compras") return { purchases };
  return { sales: [sale], purchases };
}

test("cada reportType possui título e natureza próprios", () => {
  assert.deepEqual(
    ["relatorio_comercial", "relatorio_financeiro", "relatorio_compras", "relatorio_vendas"].map((type) => ENTERPRISE_REPORTS[type].title),
    ["Relatório Comercial", "Relatório Financeiro", "Relatório de Compras", "Relatório de Vendas"],
  );
  assert.equal(new Set(Object.values(ENTERPRISE_REPORTS).slice(1).map((item) => item.type)).size, 4);
});

test("Comercial, Compras e Vendas produzem conteúdos diferenciados", () => {
  const commercial = buildEnterpriseReport({ reportType: "relatorio_comercial", data: dataFor("relatorio_comercial"), ...period, accessMode: "master" });
  const sales = buildEnterpriseReport({ reportType: "relatorio_vendas", data: dataFor("relatorio_vendas"), ...period, accessMode: "master" });
  const purchaseReport = buildEnterpriseReport({ reportType: "relatorio_compras", data: dataFor("relatorio_compras"), ...period, accessMode: "master" });
  assert.notDeepEqual(commercial.metrics.map((item) => item.label), sales.metrics.map((item) => item.label));
  assert.notDeepEqual(sales.metrics.map((item) => item.label), purchaseReport.metrics.map((item) => item.label));
  assert.equal(sales.rows.every((item) => item.source === "Venda"), true);
  assert.deepEqual(new Set(purchaseReport.rows.map((item) => item.source)), new Set(["Pedido atual", "Compra histórica"]));
});

test("Vendas usa a data operacional e não inclui compras", () => {
  const report = buildEnterpriseReport({ reportType: "relatorio_vendas", data: { sales: [sale, { ...sale, id: "outside", data_venda: "2026-07-31" }] }, ...period });
  assert.deepEqual(report.rows.map((item) => item.key), ["sale:sale-1"]);
  assert.equal(report.rows[0].date, "2026-08-10");
});

test("Compras separa fluxo vigente e legado pela data operacional", () => {
  const report = buildEnterpriseReport({ reportType: "relatorio_compras", data: { purchases: { current: [currentPurchase, { ...currentPurchase, id: "outside", data: "2026-09-01" }], legacy: [legacyPurchase] } }, ...period });
  assert.deepEqual(report.rows.map((item) => item.source).sort(), ["Compra histórica", "Pedido atual"]);
  assert.equal(report.metrics.find((item) => item.label === "Pedidos atuais").value, 1);
  assert.equal(report.metrics.find((item) => item.label === "Compras históricas").value, 1);
});

test("cliente e fornecedor homônimos usam chaves de consolidação distintas", () => {
  const report = buildEnterpriseReport({ reportType: "relatorio_comercial", data: { sales: [sale], purchases: { current: [currentPurchase], legacy: [] } }, ...period });
  const homonyms = report.rows.filter((item) => item.party === "Empresa Homônima");
  assert.equal(homonyms.length, 2);
  assert.notEqual(homonyms[0].key, homonyms[1].key);
  assert.deepEqual(new Set(homonyms.map((item) => item.kind)), new Set(["Cliente", "Fornecedor"]));
});

test("Financeiro reutiliza baixas, estornos e saldos oficiais", () => {
  const financial = {
    titles: [
      { id: "receive", tipo: "Receber", status: "Aberto", saldo: 200, vencimento: "2026-08-20", valor_original: 500, contraparte_nome: "Cliente" },
      { id: "pay", tipo: "Pagar", status: "Aberto", saldo: 80, vencimento: "2026-08-21", valor_original: 300, contraparte_nome: "Fornecedor" },
    ],
    settlements: [
      { titulo_id: "receive", tipo: "Baixa", valor: 300, data_movimento: "2026-08-10" },
      { titulo_id: "receive", tipo: "Estorno", valor: 50, data_movimento: "2026-08-11" },
      { titulo_id: "pay", tipo: "Baixa", valor: 220, data_movimento: "2026-08-12" },
      { titulo_id: "pay", tipo: "Estorno", valor: 20, data_movimento: "2026-08-13" },
    ],
  };
  const official = calculateCorporateFinanceMetrics(financial, { period: "custom", customStart: period.startDate, customEnd: period.endDate });
  const report = buildEnterpriseReport({ reportType: "relatorio_financeiro", data: { financial }, ...period });
  assert.equal(official.received, 250);
  assert.equal(official.paid, 200);
  assert.equal(report.metrics.find((item) => item.label === "Realizado").value, 50);
  assert.equal(report.metrics.find((item) => item.label === "A receber").value, 200);
  assert.equal(report.metrics.find((item) => item.label === "A pagar").value, 80);
});

test("título cancelado fica fora dos saldos, listas e títulos do período", () => {
  const financial = {
    titles: [
      { id: "active-receive", tipo: "Receber", status: "Aberto", saldo: 90, vencimento: "2026-08-20", valor_original: 90 },
      { id: "active-pay", tipo: "Pagar", status: "Aberto", saldo: 40, vencimento: "2026-08-21", valor_original: 40 },
      { id: "cancelled", tipo: "Receber", status: "Cancelado", saldo: 9999, vencimento: "2026-08-22", valor_original: 9999 },
    ],
    settlements: [],
  };
  const metrics = calculateCorporateFinanceMetrics(financial, { period: "custom", customStart: period.startDate, customEnd: period.endDate });
  assert.deepEqual(metrics.receivable.map((item) => item.id), ["active-receive"]);
  assert.deepEqual(metrics.payable.map((item) => item.id), ["active-pay"]);
  assert.equal(metrics.receivableBalance, 90);
  assert.equal(metrics.payableBalance, 40);
  assert.equal(metrics.projected, 50);
  assert.equal(metrics.periodTitles.some((item) => item.id === "cancelled"), false);
});

test("pedido cancelado permanece identificável, mas não entra no valor ativo de compras", () => {
  const cancelled = { ...currentPurchase, id: "cancelled-order", numero: "PC-CANCELADO", status: "Cancelado", valorTotal: 5000 };
  const report = buildEnterpriseReport({ reportType: "relatorio_compras", data: { purchases: { current: [currentPurchase, cancelled], legacy: [] } }, ...period, accessMode: "master" });
  assert.equal(report.rows.some((item) => item.key === "current:cancelled-order"), true);
  assert.equal(report.metrics.find((item) => item.label === "Valor ativo").value, 400);
  assert.equal(report.metrics.find((item) => item.label === "Comissões").value, 2.5);
});

test("loaders recebem empresa_id e erros não são convertidos em zeros", async () => {
  const companies = [];
  const loaders = {
    sales: async (empresaId) => { companies.push(["sales", empresaId]); return []; },
    purchases: async (empresaId) => { companies.push(["purchases", empresaId]); return { current: [], legacy: [] }; },
    financial: async (empresaId) => { companies.push(["financial", empresaId]); return { titles: [], settlements: [] }; },
  };
  await loadEnterpriseReport("relatorio_comercial", "empresa-1", loaders);
  await loadEnterpriseReport("relatorio_financeiro", "empresa-1", loaders);
  assert.deepEqual(companies, [["sales", "empresa-1"], ["purchases", "empresa-1"], ["financial", "empresa-1"]]);
  await assert.rejects(() => loadEnterpriseReport("relatorio_vendas", "empresa-1", { ...loaders, sales: async () => { throw new Error("RLS bloqueou a consulta"); } }), /RLS bloqueou/);
});

test("empresa A nunca recebe registros da empresa B no loader isolado", async () => {
  const stored = [
    { ...sale, id: "sale-a", empresa_id: "empresa-a" },
    { ...sale, id: "sale-b", empresa_id: "empresa-b" },
  ];
  const isolatedLoaders = {
    sales: async (empresaId) => stored.filter((item) => item.empresa_id === empresaId),
    purchases: async () => ({ current: [], legacy: [] }),
    financial: async () => ({ titles: [], settlements: [] }),
  };
  const loaded = await loadEnterpriseReport("relatorio_vendas", "empresa-a", isolatedLoaders);
  const report = buildEnterpriseReport({ reportType: "relatorio_vendas", data: loaded, ...period });
  assert.deepEqual(report.rows.map((item) => item.key), ["sale:sale-a"]);
  assert.equal(report.rows.some((item) => item.key === "sale:sale-b"), false);
});

test("consultas empresariais preservam empresa_id e não acessam tabelas pessoais", async () => {
  const source = await readFile(new URL("./services/enterpriseReports.service.js", import.meta.url), "utf8");
  assert.match(source, /\.eq\("empresa_id", String\(empresaId\)\)/);
  assert.doesNotMatch(source, /lancamentos_pessoais|contas_pagar_pessoais|proprietario_id/);
  assert.match(source, /loadCorporateFinance/);
  assert.doesNotMatch(source, /created_at.*startDate|created_at.*endDate/);
});

test("App passa reportType e mantém a distinção Master/usuário", async () => {
  const app = await readFile(new URL("./App.jsx", import.meta.url), "utf8");
  const reportTypeProps = app.match(/reportType=\{pagina\}/g) || [];
  assert.equal(reportTypeProps.length, 2);
  assert.match(app, /loginMaster[\s\S]*<Relatorio[\s\S]*<RelatorioUsuario/);
  const master = buildEnterpriseReport({ reportType: "relatorio_vendas", data: { sales: [sale] }, ...period, accessMode: "master" });
  const user = buildEnterpriseReport({ reportType: "relatorio_vendas", data: { sales: [sale] }, ...period, accessMode: "user" });
  assert.equal(master.metrics.some((item) => item.label === "Comissões"), true);
  assert.equal(user.metrics.some((item) => item.label === "Comissões"), false);
});
