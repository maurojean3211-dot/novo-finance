export const menuGroups = [
  {
    id: "visao-geral",
    label: "Visão Geral",
    icon: "▦",
    items: [
      { page: "dashboard", label: "Dashboard Executivo", icon: "📊" },
      { page: "painel_executivo", label: "Painel Executivo", icon: "◫" },
    ],
  },
  {
    id: "comercial",
    label: "Comercial",
    icon: "◇",
    items: [
      { page: "crm", label: "CRM e Prospecção", icon: "◎", permissionKey: "vendas" },
      { page: "contatos", label: "Contatos", icon: "◉", planned: true },
      { page: "orcamentos", label: "Orçamento Inteligente", icon: "▤", permissionKey: "vendas" },
      { page: "vendas", label: "Vendas", icon: "📦", permissionKey: "vendas" },
      { page: "pos_venda", label: "Pós-venda", icon: "↗", planned: true },
    ],
  },
  {
    id: "materiais-operacoes",
    label: "Materiais e Operações",
    icon: "▧",
    items: [
      { page: "catalogo_inteligente", label: "Catálogo Inteligente", icon: "▦", permissionKey: "compras" },
      { page: "produtos", label: "Produtos", icon: "◈", permissionKey: "compras" },
      { page: "estoque", label: "Estoque", icon: "▥", planned: true },
      { page: "compras", label: "Compras", icon: "🧱", permissionKey: "compras" },
      { page: "fornecedores", label: "Fornecedores", icon: "🏭", permissionKey: "compras" },
    ],
  },
  {
    id: "financeiro-empresarial",
    label: "Financeiro Empresarial",
    icon: "$",
    items: [
      { page: "financeiro", label: "Fluxo de Caixa", icon: "⌁", permissionKey: "financeiro" },
      { page: "recebimentos", label: "Contas a Receber", icon: "💵", permissionKey: "recebimentos" },
      { page: "bancos", label: "Bancos", icon: "▣", planned: true },
    ],
  },
  {
    id: "inteligencia",
    label: "Inteligência",
    icon: "✦",
    items: [
      { page: "ia_comercial", label: "IA Comercial", icon: "✦", planned: true },
      { page: "leitor_pdf", label: "Leitor Inteligente de PDF", icon: "PDF", planned: true },
      { page: "dolar", label: "Dólar", icon: "$", planned: true },
      { page: "lme", label: "LME", icon: "Al", planned: true },
      { page: "indicadores", label: "Indicadores", icon: "↗", planned: true },
      { page: "margens", label: "Margens", icon: "%", planned: true },
      { page: "simulador_precos", label: "Simulador de Preços", icon: "◫", planned: true },
    ],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    icon: "▤",
    items: [
      { page: "relatorio_comercial", label: "Comercial", icon: "◇", permissionKey: "relatorio" },
      { page: "relatorio_financeiro", label: "Financeiro", icon: "$", permissionKey: "relatorio" },
      { page: "relatorio_estoque", label: "Estoque", icon: "▥", planned: true },
      { page: "relatorio_compras", label: "Compras", icon: "▧", permissionKey: "relatorio" },
      { page: "relatorio_vendas", label: "Vendas", icon: "↗", permissionKey: "relatorio" },
      { page: "relatorio_ia", label: "IA", icon: "✦", planned: true },
    ],
  },
  {
    id: "financeiro-pessoal",
    label: "Financeiro Pessoal",
    icon: "♡",
    items: [
      { page: "financeiro_pessoal", label: "Visão Geral", icon: "▦", permissionKey: "pessoal" },
      { page: "receitas_pessoais", label: "Receitas", icon: "↗", permissionKey: "pessoal" },
      { page: "contas_pagar", label: "Gastos", icon: "💸", permissionKey: "contas_pagar" },
      { page: "contas_fixas", label: "Contas Fixas", icon: "🔁", permissionKey: "contas_fixas" },
      { page: "relatorios_pessoais", label: "Relatórios Pessoais", icon: "▤", permissionKey: "pessoal" },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    icon: "⚙",
    items: [
      { page: "usuarios", label: "Usuários", icon: "👤", planned: true },
      { page: "empresas_saas", label: "Empresas do SaaS", icon: "▦", planned: true },
      { page: "planos", label: "Planos", icon: "◇", planned: true },
      { page: "permissoes", label: "Permissões", icon: "◆", planned: true },
      { page: "configuracoes", label: "Configurações", icon: "⚙", planned: true },
      { page: "master", label: "Master Admin", icon: "◆", masterOnly: true },
    ],
  },
];

export function canAccessMenuItem(item, permissoes, loginMaster) {
  if (item.masterOnly) return loginMaster;
  if (item.page === "dashboard" || item.page === "painel_executivo") return true;
  if (item.permissionKey) return Boolean(permissoes[item.permissionKey]);
  return Boolean(item.planned);
}

export function findMenuGroupByPage(page) {
  return menuGroups.find((group) => group.items.some((item) => item.page === page));
}

export function findMenuItem(page) {
  return menuGroups.flatMap((group) => group.items).find((item) => item.page === page);
}
