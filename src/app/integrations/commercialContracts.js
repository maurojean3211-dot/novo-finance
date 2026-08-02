export const COMMERCIAL_EVENTS = Object.freeze({
  CRM_OPPORTUNITY_SELECTED: "crm.opportunity.selected",
  QUOTE_APPROVED: "quote.approved",
  QUOTE_CONVERTED_TO_SALE: "quote.converted_to_sale",
  SALE_CREATED: "sale.created",
  RECEIVABLE_CREATED: "receivable.created",
});

export function createCommercialReference({ empresaId, clienteId, oportunidadeId = null, orcamentoId = null, vendaId = null }) {
  return { empresaId, clienteId, oportunidadeId, orcamentoId, vendaId };
}

export const COMMERCIAL_FLOW = ["CRM", "Orçamento Inteligente", "Vendas", "Contas a Receber", "Dashboard e Relatórios"];
export const MATERIAL_FLOW = ["Catálogo Inteligente", "Orçamento Inteligente", "Vendas", "Compras"];
