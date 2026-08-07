const actions = [
  { page: "vendas", label: "Nova venda", icon: "↗" },
  { page: "compras", label: "Nova compra", icon: "▧" },
  { page: "financeiro", label: "Novo lançamento", icon: "$" },
  { page: "clientes", label: "Clientes", icon: "◎" },
  { page: "catalogo_inteligente", label: "Catálogo", icon: "▦" },
  { page: "relatorio", label: "Relatórios", icon: "◫" },
];

export default function QuickActions({ onNavigate }) {
  return <div className="quick-actions">{actions.map((action) => <button type="button" key={action.page} onClick={() => onNavigate(action.page)}><span>{action.icon}</span>{action.label}<b>→</b></button>)}</div>;
}
