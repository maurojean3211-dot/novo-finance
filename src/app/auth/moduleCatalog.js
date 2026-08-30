export const CLIENT_TYPES = Object.freeze({ PERSON: "PF", COMPANY: "PJ" });

export const MODULE_CATALOG = Object.freeze([
  { key: "financas_pessoais", label: "Finanças Pessoais", audience: "personal", contract: true },
  { key: "pessoal_visao_geral", label: "Visão Geral Pessoal", audience: "personal", permissionOnly: true },
  { key: "pessoal_receitas", label: "Receitas Pessoais", audience: "personal", permissionOnly: true },
  { key: "pessoal_despesas", label: "Despesas Pessoais", audience: "personal", permissionOnly: true },
  { key: "pessoal_contas_pagar", label: "Contas Pessoais", audience: "personal", permissionOnly: true },
  { key: "pessoal_contas_fixas", label: "Contas Fixas", audience: "personal", permissionOnly: true },
  { key: "pessoal_orcamentos", label: "Orçamentos e Metas", audience: "personal", permissionOnly: true },
  { key: "pessoal_recorrencias", label: "Recorrências Pessoais", audience: "personal", permissionOnly: true },
  { key: "pessoal_relatorios", label: "Relatórios Pessoais", audience: "personal", permissionOnly: true },
  { key: "financeiro", label: "Financeiro Empresarial", audience: "company", contract: true },
  { key: "crm", label: "CRM", audience: "company", contract: true },
  { key: "prospeccao", label: "Prospecção", audience: "company", contract: true },
  { key: "vendas", label: "Vendas", audience: "company", contract: true },
  { key: "compras", label: "Compras", audience: "company", contract: true },
  { key: "estoque", label: "Estoque", audience: "company", contract: true },
  { key: "catalogo", label: "Produtos e Fornecedores", audience: "company", contract: true },
  { key: "orcamentos", label: "Orçamentos", audience: "company", contract: true },
  { key: "pcp", label: "PCP e Produção", audience: "company", contract: true },
  { key: "tributario", label: "Tributário", audience: "company", contract: true },
  { key: "relatorios", label: "Relatórios Empresariais", audience: "company", contract: true },
  { key: "energia", label: "Energia", audience: "future", contract: true, future: true },
  { key: "representacoes", label: "Representações", audience: "future", contract: true, future: true },
]);

export const CONTRACT_MODULES = Object.freeze(MODULE_CATALOG.filter((module) => module.contract));
export const CONTRACT_MODULE_KEYS = Object.freeze(CONTRACT_MODULES.map((module) => module.key));

export function modulesForClientType(type) {
  return CONTRACT_MODULES.filter((module) => type === CLIENT_TYPES.PERSON ? module.audience === "personal" : module.audience !== "personal");
}
