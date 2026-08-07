import ExecutiveHeader from "./components/layout/ExecutiveHeader";
import ExecutiveMetrics from "./components/dashboard/ExecutiveMetrics";
import ExecutivePanel from "./components/dashboard/ExecutivePanel";
import QuickActions from "./components/dashboard/QuickActions";
import RecentActivities from "./components/dashboard/RecentActivities";
import useExecutiveDashboard from "./hooks/useExecutiveDashboard";
import "./Dashboard.css";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard({ empresaId, nomeEmpresa, nomeUsuario, onNavigate }) {
  const dashboard = useExecutiveDashboard(empresaId, "today");
  const source = (name, value) => dashboard.sourceAvailable(name) ? value : "—";
  const titles = dashboard.financeiro_titulos.filter((item) => item.status !== "Cancelado");
  const receivable = titles.filter((item) => item.tipo === "Receber").reduce((sum, item) => sum + Number(item.saldo || 0), 0);
  const payable = titles.filter((item) => item.tipo === "Pagar").reduce((sum, item) => sum + Number(item.saldo || 0), 0);
  const criticalStock = dashboard.estoque.filter((item) => Number(item.estoque_disponivel || 0) <= Number(item.ponto_reposicao || item.estoque_minimo || 0));
  const openPurchases = dashboard.pedidos_compra.filter((item) => !["Recebido", "Cancelado"].includes(item.status));
  const overdue = titles.filter((item) => Number(item.saldo || 0) > 0 && item.vencimento < new Date().toISOString().slice(0, 10));
  const todayPurchases = dashboard.pedidos_compra.filter((item) => item.data === new Date().toISOString().slice(0, 10));
  const metrics = [
    { label: "Saldo", icon: "$", value: source("lancamentos", currency.format(dashboard.saldoAtual)), detail: dashboard.lancamentos.length ? "Posição dos lançamentos" : "Aguardando movimentação", featured: true },
    { label: "Contas a receber", icon: "↗", value: source("financeiro_titulos", currency.format(receivable)), detail: titles.length ? "Saldo corporativo aberto" : "Aguardando movimentação" },
    { label: "Contas a pagar", icon: "↘", value: source("financeiro_titulos", currency.format(payable)), detail: titles.length ? "Compromissos em aberto" : "Aguardando movimentação" },
    { label: "Vendas de hoje", icon: "◇", value: source("vendas", currency.format(dashboard.totalVendas)), detail: dashboard.vendas.length ? `${dashboard.vendas.length} venda(s)` : "Aguardando movimentação" },
    { label: "Compras de hoje", icon: "▧", value: source("pedidos_compra", currency.format(todayPurchases.reduce((sum, item) => sum + Number(item.valor_total || 0), 0))), detail: todayPurchases.length ? `${todayPurchases.length} pedido(s)` : "Aguardando movimentação" },
    { label: "Estoque crítico", icon: "!", value: source("estoque", criticalStock.length), detail: criticalStock.length ? "Itens no ponto de reposição" : "Nenhum alerta ativo" },
  ];
  const alerts = [
    { label: "Títulos vencidos", value: overdue.length, detail: overdue.length ? currency.format(overdue.reduce((sum, item) => sum + Number(item.saldo || 0), 0)) : "Nenhuma pendência" },
    { label: "Pedidos em aberto", value: openPurchases.length, detail: openPurchases.length ? "Acompanhar compras" : "Nenhuma pendência" },
    { label: "Estoque em atenção", value: criticalStock.length, detail: criticalStock.length ? "Revisar reposição" : "Operação regular" },
  ];

  return <main className="executive-dashboard operational-dashboard">
    <ExecutiveHeader nomeEmpresa={nomeEmpresa} nomeUsuario={nomeUsuario} loading={dashboard.loading} onRefresh={dashboard.refresh} />
    <header className="dashboard-view-heading"><div><span>Operação de hoje</span><h2>Dashboard</h2><p>Atalhos, pendências e movimentações que pedem atenção agora.</p></div><button type="button" onClick={() => onNavigate("painel_executivo")}>Abrir Painel Executivo →</button></header>
    {dashboard.error && <div className="dashboard-warning" role="status"><strong>Algumas integrações estão indisponíveis.</strong><span>{Object.keys(dashboard.errors).join(", ")}</span></div>}
    <section className="executive-summary" aria-labelledby="daily-summary"><header><span>Resumo diário</span><h2 id="daily-summary">Números principais</h2></header>{dashboard.loading ? <p className="dashboard-loading">Carregando operação…</p> : <ExecutiveMetrics items={metrics} />}</section>
    <section className="operational-dashboard__grid">
      <ExecutivePanel title="Atalhos rápidos" eyebrow="Acesso operacional" icon="→"><QuickActions onNavigate={onNavigate} /></ExecutivePanel>
      <ExecutivePanel title="Pendências e alertas" eyebrow="Prioridades do dia" icon="!"><div className="operational-alerts">{alerts.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></article>)}</div></ExecutivePanel>
      <RecentActivities activities={dashboard.recent} />
    </section>
  </main>;
}
