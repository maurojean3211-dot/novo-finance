export const CLIENT_TYPES = Object.freeze({ PERSON: "Pessoa Física", COMPANY: "Empresa" });

export const MODULE_CATALOG = Object.freeze([
  { key: "pessoal_visao_geral", label: "Visão Geral Pessoal", audience: "personal" },
  { key: "pessoal_receitas", label: "Receitas", audience: "personal" },
  { key: "pessoal_despesas", label: "Despesas", audience: "personal" },
  { key: "pessoal_contas_pagar", label: "Contas a Pagar", audience: "personal" },
  { key: "pessoal_contas_fixas", label: "Contas Fixas", audience: "personal", hidden: true },
  { key: "pessoal_relatorios", label: "Relatórios Pessoais", audience: "personal" },
  { key: "vendas", label: "Comercial e Vendas", audience: "company" },
  { key: "compras", label: "Produtos, Compras e Operações", audience: "company" },
  { key: "contas_pagar", label: "Contas a Pagar Empresarial", audience: "company" },
  { key: "recebimentos", label: "Contas a Receber", audience: "company" },
  { key: "financeiro", label: "Fluxo de Caixa Empresarial", audience: "company" },
  { key: "relatorio", label: "Relatórios Empresariais", audience: "company" },
]);

export function modulesForClientType(type) {
  return MODULE_CATALOG.filter((module) => !module.hidden && (type === CLIENT_TYPES.PERSON ? module.audience === "personal" : true));
}
