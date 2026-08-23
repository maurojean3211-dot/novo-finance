const value = (field) => field?.value ?? null;
const decimal = (field) => {
  const raw = value(field);
  if (raw == null || raw === "") return null;
  const normalized = String(raw).replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
};
const date = (field) => {
  const raw = value(field);
  if (!raw) return null;
  const match = String(raw).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
};
const confidence = (extraction) => {
  const values = [...Object.values(extraction.fields ?? {}), ...(extraction.items ?? [])].map((item) => item?.confidence).filter(Number.isFinite);
  return values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : null;
};

export function normalizeFiscalNoteExtraction(extraction) {
  const fields = extraction.fields ?? {};
  const note = {
    number: value(fields.invoice_number), series: value(fields.series), accessKey: value(fields.access_key), issueDate: date(fields.issue_date),
    originState: value(fields.issuer_state), destinationState: value(fields.recipient_state),
    direction: ["entrada", "saida"].includes(String(value(fields.direction)).toLowerCase()) ? String(value(fields.direction)).toLowerCase() : null,
    partyName: value(fields.party_name), partyTaxId: value(fields.party_tax_id), totalAmount: decimal(fields.total_amount), freight: decimal(fields.freight_amount),
    icms: decimal(fields.icms_amount), ipi: decimal(fields.ipi_amount), ibs: decimal(fields.ibs_amount), cbs: decimal(fields.cbs_amount), fiscalNotes: value(fields.fiscal_notes),
  };
  const items = (extraction.items ?? []).map((item) => ({
    description: value(item.description), ncm: value(item.ncm), cfop: value(item.cfop), cst: value(item.icms_cst), csosn: value(item.icms_csosn), quantity: decimal(item.quantity), unit: value(item.unit), weight: decimal(item.weight),
    unitPrice: decimal(item.unit_price), totalAmount: decimal(item.total_amount), icms: decimal(item.icms), ipi: decimal(item.ipi), ibs: decimal(item.ibs), cbs: decimal(item.cbs), confidence: item.confidence ?? null,
  }));
  return { note, items, confidence: confidence(extraction) };
}
