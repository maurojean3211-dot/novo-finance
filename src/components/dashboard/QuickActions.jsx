const actions = [
  { page: "crm", label: "Abrir CRM", icon: "◎" },
  { page: "orcamentos", label: "Novo orçamento", icon: "▤" },
  { page: "vendas", label: "Registrar venda", icon: "↗" },
  { page: "compras", label: "Registrar compra", icon: "▧" },
  { page: "financeiro", label: "Fluxo de caixa", icon: "$" },
  { page: "relatorio", label: "Ver relatórios", icon: "◫" },
];

export default function QuickActions({ onNavigate }) {
  return <div className="quick-actions">{actions.map((action) => <button type="button" key={action.page} onClick={() => onNavigate(action.page)}><span>{action.icon}</span>{action.label}<b>→</b></button>)}</div>;
}
