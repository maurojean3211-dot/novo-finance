import { COMMISSION_TYPES, formatPercentage, getCommissionRule, getPurchaseCommissionData, getSaleCommissionPercentage, getStoredOrCalculatedCommission } from "./commissionEngine.js";
import { formatOriginalPurchaseDate } from "./purchaseDate.js";
import { fixedExpenseOccurrences, manualPersonalExpenses, personalPaymentTotals } from "../modules/financeiro-pessoal/utils/personalFinanceCalculations.js";

const PAGE = { width: 841.89, height: 595.28, margin: 28 };

export const EMPTY_PURCHASE_FILTERS = { startDate: "", endDate: "", party: "", product: "", unit: "", status: "" };
export const EMPTY_PAYABLE_REPORT_FILTERS = { startDate: "", endDate: "", status: "all" };
export const FINANCE_TIME_ZONE = "America/Sao_Paulo";

function pdfText(value) {
  const normalized = String(value ?? "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  return Array.from(normalized, (char) => char.codePointAt(0) <= 255 || char === "…" ? char : "?").join("")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatMoney(value) {
  return `R$ ${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function getPurchaseTotalValue(item) {
  if (item.valor_total !== null && item.valor_total !== undefined && item.valor_total !== "") return Number(item.valor_total) || 0;
  if (item.valor !== null && item.valor !== undefined && item.valor !== "") return Number(item.valor) || 0;
  const unitPrice = Number(item.preco_compra || item.valor_unitario || 0);
  const quantity = Number(item.kilos || item.quantidade || 0);
  return unitPrice * quantity;
}

function formatDate(value) {
  if (!value) return "Não informado";
  const dateOnly = String(value).slice(0, 10);
  const parts = dateOnly.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
}

function formatEmission(date = new Date()) {
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function textCommand(text, x, y, size = 8, bold = false, color = "0.16 0.21 0.29") {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfText(text)}) Tj ET\n`;
}

function lineCommand(x1, y1, x2, y2, color = "0.78 0.82 0.87") {
  return `${color} RG 0.4 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}

function rectCommand(x, y, width, height, color) {
  return `${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`;
}

function truncate(value, width, fontSize = 7) {
  const text = String(value ?? "-");
  const limit = Math.max(3, Math.floor(width / (fontSize * 0.52)));
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function createPageHeader({ title, companyName, period, issuedBy, emittedAt, pageNumber }) {
  let content = rectCommand(0, PAGE.height - 72, PAGE.width, 72, "0.035 0.075 0.13");
  content += rectCommand(PAGE.margin, PAGE.height - 58, 5, 34, "0.18 0.43 0.88");
  content += textCommand(companyName || "Cunha Finance", PAGE.margin + 14, PAGE.height - 34, 15, true, "0.92 0.95 1");
  content += textCommand(title, PAGE.margin + 14, PAGE.height - 52, 10, false, "0.45 0.65 1");
  content += textCommand(`Período: ${period}`, 510, PAGE.height - 31, 7, false, "0.78 0.84 0.93");
  content += textCommand(`Emissão: ${emittedAt}`, 510, PAGE.height - 43, 7, false, "0.78 0.84 0.93");
  content += textCommand(`Responsável: ${issuedBy || "Não informado"}`, 510, PAGE.height - 55, 7, false, "0.78 0.84 0.93");
  content += textCommand(`Página ${pageNumber}`, PAGE.width - 77, 17, 7, false, "0.38 0.45 0.55");
  content += textCommand("Cunha Finance - documento gerado localmente", PAGE.margin, 17, 7, false, "0.38 0.45 0.55");
  return content;
}

function createSummary(summary, startY) {
  const available = PAGE.width - PAGE.margin * 2;
  const width = available / summary.length;
  let content = "";
  summary.forEach((item, index) => {
    const x = PAGE.margin + index * width;
    content += rectCommand(x, startY - 38, width - 5, 38, index % 2 ? "0.94 0.96 0.98" : "0.91 0.94 0.98");
    content += textCommand(item.label, x + 7, startY - 13, item.labelSize || 6, false, "0.35 0.42 0.52");
    content += textCommand(truncate(item.value, width - 14, 9), x + 7, startY - 29, 9, true, "0.08 0.16 0.27");
  });
  return content;
}

function createTableHeader(columns, y) {
  let content = rectCommand(PAGE.margin, y - 20, PAGE.width - PAGE.margin * 2, 20, "0.12 0.24 0.4");
  let x = PAGE.margin;
  columns.forEach((column) => {
    content += textCommand(truncate(column.label, column.width, 6), x + 3, y - 13, 6, true, "0.94 0.97 1");
    x += column.width;
  });
  return content;
}

function createTableRow(row, columns, y, shaded) {
  const rowHeight = 20;
  let content = shaded ? rectCommand(PAGE.margin, y - rowHeight, PAGE.width - PAGE.margin * 2, rowHeight, "0.965 0.975 0.985") : "";
  let x = PAGE.margin;
  columns.forEach((column) => {
    content += textCommand(truncate(row[column.key], column.width), x + 3, y - 13, 7);
    x += column.width;
  });
  content += lineCommand(PAGE.margin, y - rowHeight, PAGE.width - PAGE.margin, y - rowHeight);
  return content;
}

function toWinAnsiBytes(value) {
  const replacements = { "€": 128, "…": 133, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151 };
  const bytes = [];
  for (const char of value) {
    const code = char.codePointAt(0);
    bytes.push(replacements[char] ?? (code <= 255 ? code : 63));
  }
  return Uint8Array.from(bytes);
}

export function generateReportPdfBytes({ title, companyName, period, issuedBy, summary, columns, rows, totals }) {
  const emittedAt = formatEmission();
  const pages = [];
  let pageNumber = 1;
  let y = PAGE.height - 88;
  let content = createPageHeader({ title, companyName, period, issuedBy, emittedAt, pageNumber });
  content += createSummary(summary, y);
  y -= 52;
  content += createTableHeader(columns, y);
  y -= 20;

  rows.forEach((row, index) => {
    if (y - 20 < 35) {
      pages.push(content);
      pageNumber += 1;
      y = PAGE.height - 88;
      content = createPageHeader({ title, companyName, period, issuedBy, emittedAt, pageNumber });
      content += createTableHeader(columns, y);
      y -= 20;
    }
    content += createTableRow(row, columns, y, index % 2 === 1);
    y -= 20;
  });

  if (y - 28 < 35) {
    pages.push(content);
    pageNumber += 1;
    y = PAGE.height - 88;
    content = createPageHeader({ title, companyName, period, issuedBy, emittedAt, pageNumber });
  }
  content += rectCommand(PAGE.margin, y - 25, PAGE.width - PAGE.margin * 2, 25, "0.88 0.93 0.99");
  content += textCommand(`Totais: ${totals}`, PAGE.margin + 8, y - 17, 8, true, "0.07 0.19 0.34");
  pages.push(content);

  const objects = [];
  const pageRefs = pages.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((pageContent, index) => {
    const pageRef = 5 + index * 2;
    const contentRef = pageRef + 1;
    objects[pageRef] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >>`;
    objects[contentRef] = `<< /Length ${pageContent.length} >>\nstream\n${pageContent}endstream`;
  });

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return toWinAnsiBytes(pdf);
}

export function downloadPdf(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function describePeriod(start, end) {
  if (!start && !end) return "Todos os registros carregados";
  return `${start ? formatDate(start) : "início"} a ${end ? formatDate(end) : "hoje"}`;
}

function payableStatus({ paid, balance, dueDate, today }) {
  if (balance <= 0) return "Pago";
  if (dueDate && dueDate < today) return "Vencido";
  return paid > 0 ? "Pendente (parcial)" : "Pendente";
}

export function dateKeyInTimeZone(value, timeZone = FINANCE_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Referência de data do servidor inválida.");
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function netSettlementsByTitle(settlements, empresaId) {
  const totals = new Map();
  const titlesWithEvents = new Set();
  settlements.forEach((event) => {
    if (String(event.empresa_id) !== String(empresaId) || !event.titulo_id) return;
    titlesWithEvents.add(String(event.titulo_id));
    const signed = event.tipo === "Estorno" ? -Number(event.valor || 0) : Number(event.valor || 0);
    totals.set(String(event.titulo_id), (totals.get(String(event.titulo_id)) || 0) + signed);
  });
  return { totals, titlesWithEvents };
}

export function buildPayablesReportData({ titles = [], settlements = [], empresaId, companyName, filters = EMPTY_PAYABLE_REPORT_FILTERS, serverNow }) {
  const today = dateKeyInTimeZone(serverNow);
  const { totals: settlementTotals, titlesWithEvents } = netSettlementsByTitle(settlements, empresaId);
  const seen = new Set();
  const records = titles.flatMap((title) => {
    const id = String(title.id || "");
    if (!id || seen.has(id) || String(title.empresa_id) !== String(empresaId) || title.tipo !== "Pagar" || title.status === "Cancelado") return [];
    seen.add(id);
    const dueDate = String(title.vencimento || "").slice(0, 10);
    if (!matchesDate(dueDate, filters.startDate, filters.endDate)) return [];
    const original = Math.max(0, Number(title.valor_original || 0));
    const eventPaid = settlementTotals.get(id) || 0;
    const paid = Math.min(original, Math.max(0, titlesWithEvents.has(id) ? eventPaid : Number(title.valor_baixado || 0)));
    const balance = Math.max(0, original - paid);
    const status = payableStatus({ paid, balance, dueDate, today });
    const requested = filters.status || "all";
    if (requested === "pending" && !status.startsWith("Pendente")) return [];
    if (requested === "overdue" && status !== "Vencido") return [];
    if (requested === "paid" && status !== "Pago") return [];
    return [{ ...title, reportStatus: status, reportPaid: paid, reportBalance: balance, dueDate }];
  });
  const totals = records.reduce((result, item) => ({
    count: result.count + 1,
    original: result.original + Number(item.valor_original || 0),
    paid: result.paid + item.reportPaid,
    open: result.open + item.reportBalance,
    overdue: result.overdue + (item.reportStatus === "Vencido" ? item.reportBalance : 0),
  }), { count: 0, original: 0, paid: 0, open: 0, overdue: 0 });
  const rows = records.map((item) => ({
    party: item.contraparte_nome || "-",
    description: item.descricao || "-",
    dueDate: formatDate(item.dueDate),
    original: formatMoney(item.valor_original),
    paid: formatMoney(item.reportPaid),
    balance: formatMoney(item.reportBalance),
    status: item.reportStatus,
    origin: [item.origem, item.referencia].filter(Boolean).join(" · ") || "Manual",
  }));
  return {
    records,
    totals,
    pdf: {
      title: "Relatório de Contas a Pagar",
      companyName,
      period: describePeriod(filters.startDate, filters.endDate),
      issuedBy: "Financeiro Corporativo",
      summary: [
        { label: "Títulos", value: totals.count },
        { label: "Total original", value: formatMoney(totals.original) },
        { label: "Total pago", value: formatMoney(totals.paid) },
        { label: "Total em aberto", value: formatMoney(totals.open) },
        { label: "Total vencido", value: formatMoney(totals.overdue) },
      ],
      columns: [
        { key: "party", label: "Fornecedor", width: 105 },
        { key: "description", label: "Descrição", width: 125 },
        { key: "dueDate", label: "Vencimento", width: 62 },
        { key: "original", label: "Original", width: 78 },
        { key: "paid", label: "Pago", width: 74 },
        { key: "balance", label: "Saldo", width: 74 },
        { key: "status", label: "Status", width: 80 },
        { key: "origin", label: "Parcela / origem", width: 187 },
      ],
      rows,
      totals: `${totals.count} título(s) | original ${formatMoney(totals.original)} | pago ${formatMoney(totals.paid)} | aberto ${formatMoney(totals.open)} | vencido ${formatMoney(totals.overdue)}`,
    },
  };
}

export function generatePayablesReport(options) {
  const report = buildPayablesReportData(options);
  if (!report.records.length) return false;
  downloadPdf(generateReportPdfBytes(report.pdf), `relatorio-contas-a-pagar-${new Date().toISOString().slice(0, 10)}.pdf`);
  return true;
}

function matchesPersonalPeriod(value, filters) {
  const date = String(value || "").slice(0, 10);
  if (!date) return !filters.month && !filters.start && !filters.end;
  if (filters.month) return date.slice(0, 7) === filters.month;
  return (!filters.start || date >= filters.start) && (!filters.end || date <= filters.end);
}

function personalPeriodLabel(filters) {
  if (filters.month) return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: FINANCE_TIME_ZONE }).format(new Date(`${filters.month}-02T12:00:00Z`));
  return describePeriod(filters.start, filters.end);
}

export function buildPersonalFinanceReportData({ incomes = [], expenses = [], fixedExpenses = [], payables = [], paymentEvents = [], empresaId, userId, filters = { month: "", start: "", end: "" }, serverNow }) {
  const today = dateKeyInTimeZone(serverNow);
  const sameCompany = (item) => String(item.empresa_id) === String(empresaId);
  const sameOwner = (item) => sameCompany(item) && String(item.proprietario_id) === String(userId);
  const filteredIncomes = incomes.filter((item) => sameOwner(item) && item.tipo === "receita" && matchesPersonalPeriod(item.data_lancamento, filters));
  const filteredExpenses = manualPersonalExpenses(expenses).filter((item) => sameOwner(item) && matchesPersonalPeriod(item.data_lancamento, filters));
  const integratedPaymentExpenses = expenses.filter((item) => sameOwner(item) && item.tipo === "despesa" && item.pagamento_evento_id && matchesPersonalPeriod(item.data_lancamento, filters));
  const ownedFixedExpenses = fixedExpenses.filter(sameOwner);
  const activeFixedExpenses = fixedExpenseOccurrences(ownedFixedExpenses, filters);
  const filteredPayables = payables.filter((item) => sameOwner(item) && matchesPersonalPeriod(item.vencimento, filters));
  const filteredPaymentEvents = paymentEvents.filter((item) => sameOwner(item) && matchesPersonalPeriod(item.pago_em, filters));
  const numberValue = (value) => Number(value || 0);
  const sumValues = (items, field = "valor") => items.reduce((sum, item) => sum + numberValue(item[field]), 0);
  const classifiedPayables = filteredPayables.map((item) => ({ ...item, reportStatus: item.status === "Cancelada" ? "Cancelada" : item.status === "Pago" ? "Pago" : String(item.vencimento || "").slice(0, 10) < today ? "Vencida" : "Pendente" }));
  const pending = classifiedPayables.filter((item) => item.reportStatus === "Pendente");
  const overdue = classifiedPayables.filter((item) => item.reportStatus === "Vencida");
  const paid = classifiedPayables.filter((item) => item.reportStatus === "Pago");
  const cancelled = classifiedPayables.filter((item) => item.reportStatus === "Cancelada");
  const installments = classifiedPayables.filter((item) => item.grupo_parcelamento_id);
  const activeOwnedEvents = personalPaymentTotals(paymentEvents.filter(sameOwner)).active.filter((item) => matchesPersonalPeriod(item.pago_em, filters));
  const paymentTotals = personalPaymentTotals(activeOwnedEvents);
  const payments = paymentTotals.payments;
  const downPayments = paymentTotals.downPayments;
  const anticipations = paymentTotals.anticipations;
  const reversals = filteredPaymentEvents.filter((item) => item.tipo === "Estorno");
  const paymentValue = (items) => sumValues(items, "valor_pago");
  const grossOutflow = paymentTotals.effectiveOutflow;
  const reversedOutflow = paymentValue(reversals);
  const effectiveOutflow = paymentTotals.effectiveOutflow;
  const incomeTotal = sumValues(filteredIncomes);
  const expenseTotal = sumValues(filteredExpenses);
  const accountingBalance = incomeTotal - expenseTotal;
  const fixedMonthly = sumValues(activeFixedExpenses);
  const activePayables = [...pending, ...overdue];
  const activePayablesTotal = sumValues(activePayables);
  const totals = {
    incomeTotal, expenseTotal, accountingBalance, fixedMonthly,
    activePayablesTotal, paidTotal: sumValues(paid), pendingTotal: sumValues(pending), overdueTotal: sumValues(overdue), cancelledTotal: sumValues(cancelled),
    installmentTotal: sumValues(installments), effectiveOutflow, grossOutflow, reversedOutflow,
    paymentTotal: paymentTotals.paymentTotal, downPaymentTotal: paymentTotals.downPaymentTotal, anticipationTotal: paymentTotals.anticipationTotal, savings: paymentTotals.savings,
  };
  const rows = [
    ...filteredIncomes.map((item) => ({ type: "Receita", date: formatDate(item.data_lancamento), description: item.descricao || "-", detail: item.categoria || "Sem categoria", status: "Recebida", value: formatMoney(item.valor) })),
    ...filteredExpenses.map((item) => ({ type: "Despesa", date: formatDate(item.data_lancamento), description: item.descricao || "-", detail: item.categoria || "Sem categoria", status: "Realizada", value: formatMoney(item.valor) })),
    ...classifiedPayables.map((item) => ({ type: item.grupo_parcelamento_id ? "Parcela" : "Conta a pagar", date: formatDate(item.vencimento), description: item.descricao || item.fornecedor || "-", detail: item.grupo_parcelamento_id ? `${item.parcela_numero}/${item.parcelas_total} · ${item.fornecedor || "-"}` : item.fornecedor || "-", status: item.reportStatus, value: formatMoney(item.valor) })),
    ...activeFixedExpenses.map((item) => ({ type: "Conta fixa", date: item.competencia ? `${item.competencia} · dia ${item.dia_vencimento}` : item.dia_vencimento ? `Dia ${item.dia_vencimento}` : "-", description: item.descricao || "-", detail: item.frequencia || "Mensal", status: "Ativa", value: formatMoney(item.valor) })),
    ...filteredPaymentEvents.map((item) => ({ type: item.tipo === "Antecipacao" ? "Antecipação" : item.tipo, date: formatDate(item.pago_em), description: "Evento de Conta a Pagar", detail: item.observacoes || "Evento persistido", status: item.tipo === "Estorno" ? "Redução dos pagamentos" : item.tipo === "Antecipacao" ? "Antecipação" : "Pagamento realizado", value: `${item.tipo === "Estorno" ? "-" : ""}${formatMoney(item.valor_pago)}` })),
  ];
  const hasData = rows.length > 0;
  return {
    filteredIncomes, filteredExpenses, integratedPaymentExpenses, activeFixedExpenses, filteredPayables: classifiedPayables, filteredPaymentEvents,
    pending, overdue, paid, cancelled, installments, payments, downPayments, anticipations, reversals, totals, hasData,
    pdf: {
      title: "Relatório Financeiro Pessoal Consolidado", companyName: "Financeiro Pessoal", period: personalPeriodLabel(filters), issuedBy: "Usuário autenticado",
      summary: [
        { label: "Receitas", value: formatMoney(incomeTotal) }, { label: "Despesas lançadas", value: formatMoney(expenseTotal) },
        { label: "Saldo receitas x despesas", value: formatMoney(accountingBalance) }, { label: "Contas em aberto", value: formatMoney(activePayablesTotal) },
        { label: "Pagamentos realizados em Contas a Pagar", value: formatMoney(effectiveOutflow), labelSize: 5 },
        { label: "Antecipações", value: formatMoney(totals.anticipationTotal) },
      ],
      columns: [
        { key: "type", label: "Origem", width: 90 }, { key: "date", label: "Data", width: 68 }, { key: "description", label: "Descrição", width: 180 },
        { key: "detail", label: "Detalhe / parcela", width: 190 }, { key: "status", label: "Status", width: 145 }, { key: "value", label: "Valor", width: 112 },
      ], rows,
      totals: `receitas ${formatMoney(incomeTotal)} | despesas lançadas ${formatMoney(expenseTotal)} | pagamentos em contas a pagar ${formatMoney(effectiveOutflow)} | antecipações ${formatMoney(totals.anticipationTotal)} | saldo receitas x despesas ${formatMoney(accountingBalance)}`,
    },
  };
}

export function generatePersonalFinanceReport(options) {
  const report = buildPersonalFinanceReportData(options);
  if (!report.hasData) return false;
  downloadPdf(generateReportPdfBytes(report.pdf), `relatorio-financeiro-pessoal-${dateKeyInTimeZone(options.serverNow)}.pdf`);
  return true;
}

function includesText(value, filter) {
  return !filter || String(value || "").toLocaleLowerCase("pt-BR").includes(String(filter).toLocaleLowerCase("pt-BR"));
}

function matchesDate(value, start, end) {
  const date = String(value || "").slice(0, 10);
  return (!start || date >= start) && (!end || date <= end);
}

export function filterSalesRecords(records, filters) {
  return records.filter((item) => {
    const rule = getCommissionRule(item.produto, 0.05);
    const type = rule.type === COMMISSION_TYPES.PERCENT_SALE ? "PERCENT_SALE" : "PER_KG";
    const unit = String(item.unidade_original || "KG").toUpperCase();
    return includesText(item.cliente_nome, filters.party)
      && includesText(item.produto, filters.product)
      && includesText(item.vendedor_nome || item.vendedor || item.user_id, filters.responsible)
      && includesText(item.status, filters.status)
      && (!filters.unit || unit === filters.unit)
      && (!filters.commissionType || type === filters.commissionType)
      && matchesDate(item.data_venda, filters.startDate, filters.endDate);
  });
}

export function filterPurchaseRecords(records, filters) {
  return records.filter((item) => {
    const unit = String(item.unidade_original || "KG").toUpperCase();
    return includesText(item.fornecedor, filters.party)
      && includesText(item.produto, filters.product)
      && includesText(item.responsavel || item.user_id, filters.responsible)
      && includesText(item.status, filters.status)
      && (!filters.unit || unit === filters.unit)
      && matchesDate(item.data_compra, filters.startDate, filters.endDate);
  });
}

export function generateSalesReport({ records, companyName, issuedBy, period }) {
  const weight = records.reduce((sum, item) => sum + Number(item.kilos || 0), 0);
  const value = records.reduce((sum, item) => sum + Number(item.valor || item.valor_total || 0), 0);
  const commission = records.reduce((sum, item) => sum + getStoredOrCalculatedCommission(item), 0);
  const rows = records.map((item) => {
    const kg = Number(item.kilos || 0);
    const total = Number(item.valor || item.valor_total || 0);
    const rule = getCommissionRule(item.produto, 0.05);
    return {
      date: formatDate(item.data_venda), client: item.cliente_nome || "-", product: item.produto || "-",
      kg: formatNumber(kg), unit: item.unidade_original || "kg", price: formatMoney(kg ? total / kg : 0), total: formatMoney(total),
      type: rule.type === COMMISSION_TYPES.PERCENT_SALE ? "Percentual" : "Por kg",
      base: rule.type === COMMISSION_TYPES.PERCENT_SALE ? `${formatPercentage(getSaleCommissionPercentage(item))} sobre o total` : `${formatMoney(rule.rate)}/kg`,
      commission: formatMoney(getStoredOrCalculatedCommission(item)), seller: item.vendedor_nome || item.vendedor || item.user_id || "Não informado",
    };
  });
  const bytes = generateReportPdfBytes({
    title: "Relatório de Vendas", companyName, period, issuedBy,
    summary: [
      { label: "Vendas", value: records.length }, { label: "Peso (kg)", value: formatNumber(weight) },
      { label: "Peso (t)", value: formatNumber(weight / 1000, 3) }, { label: "Valor vendido", value: formatMoney(value) },
      { label: "Comissão", value: formatMoney(commission) }, { label: "Ticket médio", value: formatMoney(records.length ? value / records.length : 0) },
      { label: "Valor médio/kg", value: formatMoney(weight ? value / weight : 0) },
    ],
    columns: [
      { key: "date", label: "Data", width: 52 }, { key: "client", label: "Cliente", width: 82 }, { key: "product", label: "Produto", width: 65 },
      { key: "kg", label: "Peso", width: 53 }, { key: "unit", label: "Un.", width: 29 }, { key: "price", label: "R$/kg", width: 62 },
      { key: "total", label: "Total", width: 68 }, { key: "type", label: "Tipo comissão", width: 70 }, { key: "base", label: "Regra", width: 65 },
      { key: "commission", label: "Comissão", width: 68 }, { key: "seller", label: "Vendedor", width: 100 },
    ], rows,
    totals: `${records.length} vendas | ${formatNumber(weight)} kg | ${formatMoney(value)} | comissão ${formatMoney(commission)}`,
  });
  downloadPdf(bytes, `relatorio-vendas-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function buildPurchasesReportData({ records, companyName, issuedBy, period }) {
  const weight = records.reduce((sum, item) => sum + Number(item.kilos || 0), 0);
  const value = records.reduce((sum, item) => sum + getPurchaseTotalValue(item), 0);
  const suppliers = new Set(records.map((item) => item.fornecedor).filter(Boolean));
  const materialWeights = records.reduce((acc, item) => ({ ...acc, [item.produto || "Outros"]: (acc[item.produto || "Outros"] || 0) + Number(item.kilos || 0) }), {});
  const topMaterial = Object.entries(materialWeights).sort((a, b) => b[1] - a[1])[0]?.[0] || "Sem dados";
  const commission = records.reduce((sum, item) => sum + getPurchaseCommissionData(item).commission, 0);
  const rows = records.map((item) => {
    const kg = Number(item.kilos || 0);
    const total = getPurchaseTotalValue(item);
    const commissionData = getPurchaseCommissionData(item);
    return {
      date: formatOriginalPurchaseDate(item), supplier: item.fornecedor || "-", material: item.produto || "Outros", alloy: item.liga || "Não informada",
      quantity: formatNumber(item.quantidade_original || kg), unit: item.unidade_original || "kg", kg: formatNumber(kg), price: formatMoney(kg ? total / kg : 0),
      total: formatMoney(total), freight: item.frete != null ? formatMoney(item.frete) : "Não informado",
      finalCost: item.custo_final_kg != null ? formatMoney(item.custo_final_kg) : "Não informado", status: item.status || "Não informado",
      commissionType: "Por kg", commissionRule: `${formatMoney(commissionData.rate)}/kg`, commission: formatMoney(commissionData.commission),
    };
  });
  return {
    title: "Relatório de Compras", companyName, period, issuedBy,
    summary: [
      { label: "Compras", value: records.length }, { label: "Peso (kg)", value: formatNumber(weight) },
      { label: "Peso (t)", value: formatNumber(weight / 1000, 3) }, { label: "Valor investido", value: formatMoney(value) },
      { label: "Valor médio/kg", value: formatMoney(weight ? value / weight : 0) }, { label: "Fornecedores", value: suppliers.size },
      { label: "Material principal", value: topMaterial }, { label: "Comissão", value: formatMoney(commission) },
    ],
    columns: [
      { key: "date", label: "Data", width: 42 }, { key: "supplier", label: "Fornecedor", width: 65 }, { key: "material", label: "Material", width: 55 },
      { key: "alloy", label: "Liga", width: 40 }, { key: "quantity", label: "Qtd.", width: 40 }, { key: "unit", label: "Un.", width: 22 },
      { key: "kg", label: "Kg", width: 42 }, { key: "price", label: "R$/kg", width: 48 }, { key: "total", label: "Total", width: 55 },
      { key: "freight", label: "Frete", width: 55 }, { key: "finalCost", label: "Custo final/kg", width: 55 }, { key: "status", label: "Status", width: 50 },
      { key: "commissionType", label: "Tipo comissão", width: 55 }, { key: "commissionRule", label: "Regra", width: 55 }, { key: "commission", label: "Comissão", width: 55 },
    ], rows,
    totals: `${records.length} compras | ${formatNumber(weight)} kg | ${formatMoney(value)} | comissão ${formatMoney(commission)} | ${suppliers.size} fornecedores`,
  };
}

export function generatePurchasesReport(options) {
  const bytes = generateReportPdfBytes(buildPurchasesReportData(options));
  downloadPdf(bytes, `relatorio-compras-${new Date().toISOString().slice(0, 10)}.pdf`);
}
