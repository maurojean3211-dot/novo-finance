export const menuGroups = [
  {
    id: "visao-geral",
    label: "VISÃO GERAL",
    icon: "▦",
    items: [
      { page: "dashboard", path: "/", label: "Dashboard", icon: "📊", permissionKey: "dashboard" },
      { page: "painel_executivo", path: "/painel-executivo", label: "Painel Executivo", icon: "◫", permissionKey: "dashboard" },
    ],
  },
  {
    id: "comercial",
    label: "COMERCIAL",
    icon: "◇",
    items: [
      { page: "crm", path: "/crm", label: "CRM", icon: "◎", permissionKey: "crm" },
      { page: "clientes", path: "/clientes", label: "Clientes", icon: "◉", permissionKey: "crm" },
      { page: "prospeccao", path: "/prospeccao", label: "Prospecção", icon: "⌕", permissionKey: "prospeccao" },
      {
        page: "agenda_comercial",
        path: "/agenda-comercial",
        label: "Agenda Comercial",
        icon: "◷",
        permissionKey: "prospeccao",
      },
      { page: "contatos", label: "Contatos", icon: "◉", planned: true },
      {
        page: "orcamentos",
        path: "/orcamentos",
        label: "Orçamentos",
        icon: "▤",
        permissionKey: "orcamentos",
      },
      { page: "vendas", path: "/vendas", label: "Vendas", icon: "📦", permissionKey: "vendas" },
      { page: "compras", path: "/compras", label: "Compras", icon: "🧱", permissionKey: "compras" },
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
        path: "/catalogo",
        label: "Catálogo",
        icon: "▦",
        permissionKey: "catalogo",
      },
      { page: "produtos", path: "/produtos", label: "Produtos", icon: "◈", permissionKey: "catalogo" },
      { page: "estoque", path: "/estoque", label: "Estoque", icon: "▥", permissionKey: "estoque" },
      {
        page: "producao",
        path: "/pcp",
        label: "Produção e PCP",
        icon: "⚙",
        permissionKey: "pcp",
      },
      {
        page: "fornecedores",
        path: "/fornecedores",
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
        path: "/financeiro/contas-a-pagar",
        label: "Contas a pagar",
        icon: "↘",
        permissionKey: "financeiro",
      },
      {
        page: "recebimentos",
        path: "/financeiro/contas-a-receber",
        label: "Contas a Receber",
        icon: "💵",
        permissionKey: "financeiro",
      },
      {
        page: "financeiro",
        path: "/financeiro",
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
        path: "/ia-comercial",
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
        path: "/relatorios",
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
        path: "/relatorios/comercial",
        label: "Comercial",
        icon: "◇",
        permissionKey: "relatorios",
      },
      {
        page: "relatorio_financeiro",
        path: "/relatorios/financeiro",
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
        path: "/relatorios/compras",
        label: "Compras",
        icon: "▧",
        permissionKey: "relatorios",
      },
      {
        page: "relatorio_vendas",
        path: "/relatorios/vendas",
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
        path: "/financeiro-pessoal",
        label: "Visão Geral",
        icon: "▦",
        permissionKey: "pessoal_visao_geral",
        legacyPermissionKeys: ["pessoal"],
      },
      {
        page: "receitas_pessoais",
        path: "/financeiro-pessoal/receitas",
        label: "Receitas",
        icon: "↗",
        permissionKey: "pessoal_receitas",
        legacyPermissionKeys: ["pessoal"],
      },
      {
        page: "despesas_pessoais",
        path: "/financeiro-pessoal/despesas",
        label: "Despesas",
        icon: "↘",
        permissionKey: "pessoal_despesas",
        legacyPermissionKeys: ["pessoal"],
      },
      {
        page: "contas_pagar_pessoais",
        path: "/financeiro-pessoal/contas-a-pagar",
        label: "Contas a Pagar",
        icon: "◷",
        permissionKey: "pessoal_contas_pagar",
        legacyPermissionKeys: ["pessoal"],
      },
      {
        page: "contas_fixas_pessoais",
        path: "/financeiro-pessoal/contas-fixas",
        label: "Contas Fixas",
        icon: "🔁",
        permissionKey: "pessoal_contas_fixas",
        legacyPermissionKeys: ["pessoal", "contas_fixas"],
      },
      {
        page: "relatorios_pessoais",
        path: "/financeiro-pessoal/relatorios",
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
        path: "/usuarios",
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
        path: "/configuracoes/tributarias",
        label: "Configuração Tributária",
        icon: "🧾",
        permissionKey: "tributario",
      },

      { page: "energia", label: "Energia", icon: "⚡", permissionKey: "energia", planned: true },
      { page: "representacoes", label: "Representações", icon: "◇", permissionKey: "representacoes", planned: true },

      {
        page: "master",
        path: "/master",
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

export const activeRoutes = Object.freeze(
  menuGroups
    .flatMap((group) => group.items)
    .filter((item) => !item.planned && item.path)
    .map((item) => Object.freeze({ page: item.page, path: item.path }))
);

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function pathForPage(page) {
  return activeRoutes.find((route) => route.page === page)?.path || "/";
}

export function pageForPath(pathname) {
  const path = normalizePath(pathname);
  return activeRoutes.find((route) => route.path === path)?.page || null;
}

export function isActivePage(page) {
  return activeRoutes.some((route) => route.page === page);
}
