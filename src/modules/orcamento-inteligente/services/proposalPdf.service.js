import { downloadPdf, generateReportPdfBytes } from "../../../services/reportPdf.service";
import { formatMoney } from "../utils/money-calculations";

export function downloadProposalPdf(proposal) {
  const { company, quote, responsible } = proposal;
  const rows = quote.items.map((item) => ({
    code: item.codigo || "-",
    description: [item.descricao, item.liga, item.tempera, item.dimensoes].filter(Boolean).join(" · "),
    quantity: `${Number(item.quantidade || 0).toLocaleString("pt-BR")} ${item.unidade || ""}`,
    weight: `${Number(item.pesoTotal || 0).toLocaleString("pt-BR")} kg`,
    price: formatMoney(item.preco),
    subtotal: formatMoney(item.subtotal || Number(item.preco || 0) * Number(item.quantidade || 0)),
  }));
  const bytes = generateReportPdfBytes({
    title: `Proposta Comercial ${quote.numero || quote.id}`,
    companyName: company.name,
    period: `Emissão ${quote.data || proposal.emittedAt} · validade ${quote.validade || "não informada"}`,
    issuedBy: responsible,
    summary: [
      { label: "Cliente", value: quote.cliente }, { label: "Itens", value: quote.items.length },
      { label: "Subtotal", value: formatMoney(quote.subtotal) }, { label: "Desconto", value: formatMoney(quote.desconto) },
      { label: "Impostos", value: formatMoney(quote.impostos) }, { label: "Total", value: formatMoney(quote.valor) },
    ],
    columns: [
      { key: "code", label: "Código", width: 85 }, { key: "description", label: "Descrição", width: 285 },
      { key: "quantity", label: "Quantidade", width: 95 }, { key: "weight", label: "Peso", width: 90 },
      { key: "price", label: "Unitário", width: 110 }, { key: "subtotal", label: "Subtotal", width: 120 },
    ],
    rows,
    totals: `${formatMoney(quote.valor)} | ${quote.condicaoPagamento || "Pagamento não informado"} | ${quote.modalidadeFrete || "Frete não informado"}`,
  });
  const safeNumber = String(quote.numero || quote.id || "orcamento").replace(/[^a-zA-Z0-9_-]/g, "-");
  downloadPdf(bytes, `proposta-${safeNumber}.pdf`);
}
