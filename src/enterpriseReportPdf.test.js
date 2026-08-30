import assert from "node:assert/strict";
import test from "node:test";
import { buildEnterpriseReportPdfData, generateEnterpriseReport, generateReportPdfBytes } from "./services/reportPdf.service.js";

const period = { startDate: "2026-08-01", endDate: "2026-08-31" };

function report(type, title, overrides = {}) {
  return {
    config: { type, title },
    metrics: [
      { label: "Operações", value: 2 },
      { label: "Valor", value: 1500, money: true },
      { label: "Comissões", value: 25, money: true },
    ],
    rows: [{ key: "row-1", date: "2026-08-10", party: "Contraparte", detail: "Operação", volume: 10, value: 1500, commission: 25, source: "Fonte oficial" }],
    ...overrides,
  };
}

const cases = [
  ["relatorio_comercial", "commercial", "Relatório Comercial", "relatorio-comercial"],
  ["relatorio_financeiro", "financial", "Relatório Financeiro", "relatorio-financeiro"],
  ["relatorio_compras", "purchases", "Relatório de Compras", "relatorio-compras"],
  ["relatorio_vendas", "sales", "Relatório de Vendas", "relatorio-vendas"],
];

for (const [reportType, type, title, filename] of cases) {
  test(`${title} possui configuração de PDF própria`, () => {
    const pdf = buildEnterpriseReportPdfData({ report: report(type, title), reportType, accessMode: "master", ...period });
    assert.equal(pdf.title, title);
    assert.equal(pdf.filename, filename);
    assert.equal(pdf.period, "01/08/2026 a 31/08/2026");
    assert.equal(pdf.rows.length, 1);
    assert.ok(pdf.columns.length > 0);
  });
}

test("período selecionado aparece no cabeçalho do PDF", () => {
  const pdf = buildEnterpriseReportPdfData({ report: report("sales", "Relatório de Vendas"), reportType: "relatorio_vendas", ...period });
  assert.equal(pdf.period, "01/08/2026 a 31/08/2026");
});

test("relatório vazio não gera PDF", () => {
  const empty = report("sales", "Relatório de Vendas", { rows: [] });
  assert.equal(buildEnterpriseReportPdfData({ report: empty, reportType: "relatorio_vendas", ...period }), null);
  assert.equal(generateEnterpriseReport({ report: empty, reportType: "relatorio_vendas", ...period }), false);
});

test("usuário comum não recebe comissão no resumo, colunas, linhas ou totais", () => {
  const pdf = buildEnterpriseReportPdfData({ report: report("sales", "Relatório de Vendas"), reportType: "relatorio_vendas", accessMode: "user", ...period });
  assert.equal(pdf.summary.some((item) => item.label === "Comissões"), false);
  assert.equal(pdf.columns.some((item) => item.key === "commission"), false);
  assert.equal(Object.hasOwn(pdf.rows[0], "commission"), false);
  assert.doesNotMatch(pdf.totals, /Comiss/);
});

test("Master recebe comissão nos relatórios não financeiros", () => {
  const pdf = buildEnterpriseReportPdfData({ report: report("purchases", "Relatório de Compras"), reportType: "relatorio_compras", accessMode: "master", ...period });
  assert.equal(pdf.summary.some((item) => item.label === "Comissões"), true);
  assert.equal(pdf.columns.some((item) => item.key === "commission"), true);
  assert.equal(pdf.rows[0].commission, "R$ 25,00");
});

test("gerador produz bytes de um PDF válido", () => {
  const { filename: _filename, ...document } = buildEnterpriseReportPdfData({ report: report("financial", "Relatório Financeiro"), reportType: "relatorio_financeiro", accessMode: "master", ...period });
  const bytes = generateReportPdfBytes(document);
  assert.equal(new TextDecoder("latin1").decode(bytes.slice(0, 8)), "%PDF-1.4");
  assert.ok(bytes.length > 500);
});
