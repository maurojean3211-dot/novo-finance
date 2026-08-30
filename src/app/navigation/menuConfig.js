export const menuGroups = [
  {
    id: "visao-geral",
    label: "VISÃO GERAL",
    icon: "▦",
    items: [
      { page: "dashboard", label: "Dashboard", icon: "📊", permissionKey: "dashboard" },
      { page: "painel_executivo", label: "Painel Executivo", icon: "◫", permissionKey: "dashboard" },
    ],
  },
  {
    id: "comercial",
    label: "COMERCIAL",
    icon: "◇",
    items: [
      { page: "crm", label: "CRM", icon: "◎", permissionKey: "crm" },
      { page: "clientes", label: "Clientes", icon: "◉", permissionKey: "crm" },
      { page: "prospeccao", label: "Prospecção", icon: "⌕", permissionKey: "prospeccao" },
      {
        page: "agenda_comercial",
        label: "Agenda Comercial",
        icon: "◷",
        permissionKey: "prospeccao",
      },
      { page: "contatos", label: "Contatos", icon: "◉", planned: true },
      {
        page: "orcamentos",
        label: "Orçamentos",
        icon: "▤",
        permissionKey: "orcamentos",
      },
      { page: "vendas", label: "Vendas", icon: "📦", permissionKey: "vendas" },
      { page: "compras", label: "Compras", icon: "🧱", permissionKey: "compras" },
      { page: "pos_venda", label: "Pós-venda", icon: "↗", planned: true },
    ],
  },
  {
    id: "materiais-operacoes",
    label: "PRODUTOS",
    icon: "▧",
    items: [
      {
        page: "catalogo_inteligente",
        label: "Catálogo",
        icon: "▦",
        permissionKey: "catalogo",
      },
      { page: "produtos", label: "Produtos", icon: "◈", permissionKey: "catalogo" },
      { page: "estoque", label: "Estoque", icon: "▥", permissionKey: "estoque" },
      {
        page: "producao",
        label: "Produção e PCP",
        icon: "⚙",
        permissionKey: "pcp",
      },
      {
        page: "fornecedores",
        label: "Fornecedores",
        icon: "🏭",
        permissionKey: "catalogo",
      },
    ],
  },
  {
    id: "financeiro-empresarial",
    label: "FINANCEIRO",
    icon: "$",
    items: [
      {
        page: "contas_pagar",
        label: "Contas a pagar",
        icon: "↘",
        permissionKey: "financeiro",
      },
      {
        page: "recebimentos",
        label: "Contas a Receber",
        icon: "💵",
        permissionKey: "financeiro",
      },
      {
        page: "financeiro",
        label: "Fluxo de Caixa",
        icon: "⌁",
        permissionKey: "financeiro",
      },
      { page: "bancos", label: "Bancos", icon: "▣", planned: true },
    ],
  },
  {
    id: "inteligencia",
    label: "INTELIGÊNCIA ARTIFICIAL",
    icon: "✦",
    items: [
      {
        page: "ia_comercial",
        label: "Atendimento Comercial IA",
        icon: "✦",
        permissionKey: "catalogo",
      },
      {
        page: "leitor_pdf",
        label: "Leitor Inteligente de PDF",
        icon: "PDF",
        planned: true,
      },
      { page: "dolar", label: "Dólar", icon: "$", planned: true },
      { page: "lme", label: "LME", icon: "Al", planned: true },
      { page: "margens", label: "Margens", icon: "%", planned: true },
      {
        page: "simulador_precos",
        label: "Simulador de Preços",
        icon: "◫",
        planned: true,
      },
    ],
  },
  {
    id: "relatorios",
    label: "RELATÓRIOS",
    icon: "▤",
    items: [
      {
        page: "relatorio",
        label: "Relatórios",
        icon: "▤",
        permissionKey: "relatorios",
      },
      {
        page: "indicadores",
        label: "Indicadores de Mercado",
        icon: "↗",
        planned: true,
      },
      {
        page: "relatorio_comercial",
        label: "Comercial",
        icon: "◇",
        permissionKey: "relatorios",
      },
      {
        page: "relatorio_financeiro",
        label: "Financeiro",
        icon: "$",
        permissionKey: "relatorios",
      },
      {
        page: "relatorio_estoque",
        label: "Estoque",
        icon: "▥",
        planned: true,
      },
      {
        page: "relatorio_compras",
        label: "Compras",
        icon: "▧",
        permissionKey: "relatorios",
      },
      {
        page: "relatorio_vendas",
        label: "Vendas",
        icon: "↗",
        permissionKey: "relatorios",
      },
      {
        page: "relatorio_ia",
        label: "IA",
        icon: "✦",
        planned: true,
      },
    ],
  },
  {
    id: "financeiro-pessoal",
    label: "FINANCEIRO PESSOAL",
    icon: "♡",
    items: [
      {
        page: "financeiro_pessoal",
        label: "Visão Geral",
        icon: "▦",
        permissionKey: "pessoal_visao_geral",
        legacyPermissionKeys: ["pessoal"],
      },
      {
        page: "receitas_pessoais",
        label: "Receitas",
        icon: "↗",
        permissionKey: "pessoal_receitas",
        legacyPermissionKeys: ["pessoal"],
      },
      {
        page: "despesas_pessoais",
        label: "Despesas",
        icon: "↘",
        permissionKey: "pessoal_despesas",
        legacyPermissionKeys: ["pessoal"],
      },
      {
        page: "contas_pagar_pessoais",
        label: "Contas a Pagar",
        icon: "◷",
        permissionKey: "pessoal_contas_pagar",
        legacyPermissionKeys: ["pessoal"],
      },
      {
        page: "contas_fixas_pessoais",
        label: "Contas Fixas",
        icon: "🔁",
        permissionKey: "pessoal_contas_fixas",
        legacyPermissionKeys: ["pessoal", "contas_fixas"],
      },
      {
        page: "relatorios_pessoais",
        label: "Relatórios Pessoais",
        icon: "▤",
        permissionKey: "pessoal_relatorios",
        legacyPermissionKeys: ["pessoal"],
      },
    ],
  },
  {
    id: "administracao",
    label: "SISTEMA",
    icon: "⚙",
    items: [
      {
        page: "usuarios",
        label: "Usuários",
        icon: "👤",
        permissionKey: "gerenciar_usuarios",
      },
      {
        page: "empresas_saas",
        label: "Empresas do SaaS",
        icon: "▦",
        planned: true,
      },
      {
        page: "planos",
        label: "Planos",
        icon: "◇",
        planned: true,
      },
      {
        page: "permissoes",
        label: "Permissões",
        icon: "◆",
        planned: true,
      },

      {
        page: "configuracoes",
        label: "Configuração Tributária",
        icon: "🧾",
        permissionKey: "tributario",
      },

      { page: "energia", label: "Energia", icon: "⚡", permissionKey: "energia", planned: true },
      { page: "representacoes", label: "Representações", icon: "◇", permissionKey: "representacoes", planned: true },

      {
        page: "master",
        label: "Master Admin",
        icon: "◆",
        accessScope: "PLATFORM_ADMIN",
      },
    ],
  },
];

export function canAccessMenuItem(item, permissoes, loginMaster) {
  if (item.planned) return false;
  if (item.accessScope === "PLATFORM_ADMIN") return loginMaster === true;

  if (item.permissionKey) {
    if (
      Object.prototype.hasOwnProperty.call(
        permissoes,
        item.permissionKey
      )
    ) {
      return Boolean(permissoes[item.permissionKey]);
    }

    return (item.legacyPermissionKeys || []).some((key) =>
      Boolean(permissoes[key])
    );
  }

  return false;
}

export function findMenuGroupByPage(page) {
  return menuGroups.find((group) =>
    group.items.some((item) => item.page === page)
  );
}

export function findMenuItem(page) {
  return menuGroups
    .flatMap((group) => group.items)
    .find((item) => item.page === page);
}
