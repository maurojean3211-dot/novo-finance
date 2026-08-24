import test from "node:test";
import assert from "node:assert/strict";
import { buildPayablesReportData, dateKeyInTimeZone, generatePayablesReport } from "./services/reportPdf.service.js";

const now = new Date("2026-08-23T12:00:00-03:00");
const titles = [
  { id: "pending", empresa_id: "A", tipo: "Pagar", contraparte_nome: "Fornecedor A", descricao: "Pendente", vencimento: "2026-08-30", valor_original: 100, valor_baixado: 0, status: "Pendente", origem: "Manual" },
  { id: "overdue", empresa_id: "A", tipo: "Pagar", contraparte_nome: "Fornecedor B", descricao: "Vencida", vencimento: "2026-08-10", valor_original: 200, valor_baixado: 50, status: "Parcial", origem: "Compra", referencia: "PED-1/2" },
  { id: "paid", empresa_id: "A", tipo: "Pagar", contraparte_nome: "Fornecedor C", descricao: "Paga", vencimento: "2026-08-05", valor_original: 300, valor_baixado: 300, status: "Liquidado", origem: "Compra" },
  { id: "other-company", empresa_id: "B", tipo: "Pagar", vencimento: "2026-08-10", valor_original: 999, valor_baixado: 0, status: "Pendente" },
  { id: "receivable", empresa_id: "A", tipo: "Receber", vencimento: "2026-08-10", valor_original: 999, valor_baixado: 0, status: "Pendente" },
];
const settlements = [
  { id: "b1", titulo_id: "overdue", empresa_id: "A", tipo: "Baixa", valor: 80 },
  { id: "e1", titulo_id: "overdue", empresa_id: "A", tipo: "Estorno", valor: 30 },
  { id: "b2", titulo_id: "paid", empresa_id: "A", tipo: "Baixa", valor: 300 },
  { id: "foreign", titulo_id: "pending", empresa_id: "B", tipo: "Baixa", valor: 100 },
];

const build = (filters = { startDate: "", endDate: "", status: "all" }, source = titles, serverNow = now) => buildPayablesReportData({ titles: source, settlements, empresaId: "A", companyName: "Empresa A", filters, serverNow });

test("filtra pendentes sem incluir vencidos ou pagos", () => assert.deepEqual(build({ startDate: "", endDate: "", status: "pending" }).records.map((item) => item.id), ["pending"]));
test("filtra vencidos e considera baixas menos estornos", () => { const report = build({ startDate: "", endDate: "", status: "overdue" }); assert.equal(report.records[0].reportPaid, 50); assert.equal(report.records[0].reportBalance, 150); });
test("filtra pagos", () => assert.deepEqual(build({ startDate: "", endDate: "", status: "paid" }).records.map((item) => item.id), ["paid"]));
test("filtra por período de vencimento", () => assert.deepEqual(build({ startDate: "2026-08-06", endDate: "2026-08-20", status: "all" }).records.map((item) => item.id), ["overdue"]));
test("calcula totalizadores corretos", () => { const totals = build().totals; assert.deepEqual(totals, { count: 3, original: 600, paid: 350, open: 250, overdue: 150 }); });
test("não duplica títulos", () => assert.equal(build(undefined, [...titles, titles[0]]).records.length, 3));
test("isola títulos e baixas por empresa", () => { const report = build(); assert.equal(report.records.some((item) => item.empresa_id === "B"), false); assert.equal(report.records.find((item) => item.id === "pending").reportPaid, 0); });
test("filtro vazio não gera PDF", () => assert.equal(generatePayablesReport({ titles, settlements, empresaId: "A", companyName: "Empresa A", filters: { startDate: "2030-01-01", endDate: "2030-01-31", status: "all" }, serverNow: now }), false));
test("título vencendo hoje não é vencido", () => { const source = [{ ...titles[0], id: "today", vencimento: "2026-08-23" }]; assert.equal(build(undefined, source, "2026-08-24T02:59:59Z").records[0].reportStatus, "Pendente"); });
test("virada do dia respeita America/Sao_Paulo", () => { assert.equal(dateKeyInTimeZone("2026-08-24T02:59:59Z"), "2026-08-23"); assert.equal(dateKeyInTimeZone("2026-08-24T03:00:00Z"), "2026-08-24"); });
test("título de amanhã não é vencido", () => { const source = [{ ...titles[0], id: "tomorrow", vencimento: "2026-08-24" }]; assert.equal(build(undefined, source, "2026-08-24T02:59:59Z").records[0].reportStatus, "Pendente"); });
