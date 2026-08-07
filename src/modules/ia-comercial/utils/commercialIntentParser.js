const INTENTS = [
  ["client", ["cliente", "clientes", "contato"]],
  ["prospect", ["prospect", "prospecção", "prospeccao", "lead"]],
  ["opportunity", ["oportunidade", "oportunidades", "crm"]],
  ["product", ["produto", "material", "catálogo", "catalogo"]],
  ["budget", ["orçamento", "orcamento", "proposta"]],
  ["return", ["retorno", "follow-up", "follow up", "agenda"]],
  ["sale", ["venda", "vendas"]],
  ["purchase", ["compra", "compras"]],
  ["summary", ["resumo", "situação comercial", "situacao comercial", "hoje"]],
];

export function normalizeCommand(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function parseCommercialIntent(command) {
  const normalized = normalizeCommand(command);
  const match = INTENTS.find(([, keywords]) => keywords.some((keyword) => normalized.includes(normalizeCommand(keyword))));
  return { intent: match?.[0] || "unknown", normalized, original: String(command || "").trim() };
}

export const RECOGNIZED_INTENTS = INTENTS.map(([intent]) => intent);
