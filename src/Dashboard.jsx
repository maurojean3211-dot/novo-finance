import ExecutiveHeader from "./components/layout/ExecutiveHeader";
import ExecutiveMetrics from "./components/dashboard/ExecutiveMetrics";
import ExecutivePanel from "./components/dashboard/ExecutivePanel";
import QuickActions from "./components/dashboard/QuickActions";
import RecentActivities from "./components/dashboard/RecentActivities";
import useExecutiveDashboard from "./hooks/useExecutiveDashboard";
import { localIsoDate, safeNumber } from "./components/dashboard/dashboardMetrics";
import "./Dashboard.css";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard({ empresaId, nomeEmpresa, nomeUsuario, onNavigate }) {
  const dashboard = useExecutiveDashboard(empresaId, "today");
  const today = localIsoDate();
  const source = (name, value) => dashboard.sourceAvailable(name) ? value : "—";
  const titles = dashboard.financeiro_titulos.filter((item) => item.status !== "Cancelado");
  const receivable = titles.filter((item) => item.tipo === "Receber").reduce((sum, item) => sum + safeNumber(item.saldo), 0);
  const payable = titles.filter((item) => item.tipo === "Pagar").reduce((sum, item) => sum + safeNumber(item.saldo), 0);
  const criticalStock = dashboard.estoque.filter((item) => {
    const threshold = item.ponto_reposicao ?? item.estoque_minimo;
    return threshold !== null && threshold !== undefined && safeNumber(item.estoque_disponivel) <= safeNumber(threshold);
  });
  const openPurchases = dashboard.pedidos_compra.filter((item) => !["Recebido", "Cancelado"].includes(item.status));
  const overdue = titles.filter((item) => safeNumber(item.saldo) > 0 && item.vencimento < today);
  const todayPurchases = dashboard.pedidos_compra.filter((item) => item.data === today);
  const delayedProduction = dashboard.ordens_producao.filter((item) => !["Concluída", "Cancelada"].includes(item.status) && item.data_prevista_fim && item.data_prevista_fim < today);
  const missingMaterials = dashboard.ordem_producao_materiais.filter((item) => item.necessidade_compra);
  const blockedProduction = new Set(missingMaterials.map((item) => item.ordem_id)).size;
  const metrics = [
    { label: "Saldo", icon: "$", value: source("lancamentos", currency.format(dashboard.saldoAtual)), detail: dashboard.lancamentos.length ? "Posição dos lançamentos" : "Aguardando movimentação", featured: true },
    { label: "Contas a receber", icon: "↗", value: source("financeiro_titulos", currency.format(receivable)), detail: titles.length ? "Saldo corporativo aberto" : "Aguardando movimentação" },
    { label: "Contas a pagar", icon: "↘", value: source("financeiro_titulos", currency.format(payable)), detail: titles.length ? "Compromissos em aberto" : "Aguardando movimentação" },
    { label: "Vendas de hoje", icon: "◇", value: source("vendas", currency.format(dashboard.totalVendas)), detail: dashboard.vendas.length ? `${dashboard.vendas.length} venda(s)` : "Aguardando movimentação" },
    { label: "Compras de hoje", icon: "▧", value: source("pedidos_compra", currency.format(todayPurchases.reduce((sum, item) => sum + safeNumber(item.valor_total), 0))), detail: todayPurchases.length ? `${todayPurchases.length} pedido(s)` : "Sem dados no período" },
    { label: "Estoque crítico", icon: "!", value: source("estoque", criticalStock.length), detail: criticalStock.length ? "Itens no ponto de reposição" : "Nenhum alerta ativo" },
  ];
  const alerts = [
    { label: "Títulos vencidos", value: overdue.length, detail: overdue.length ? currency.format(overdue.reduce((sum, item) => sum + safeNumber(item.saldo), 0)) : "Nenhuma pendência" },
    { label: "Pedidos em aberto", value: openPurchases.length, detail: openPurchases.length ? "Acompanhar compras" : "Nenhuma pendência" },
    { label: "Estoque em atenção", value: criticalStock.length, detail: criticalStock.length ? "Revisar reposição" : "Operação regular" },
    { label: "OPs atrasadas", value: source("ordens_producao", delayedProduction.length), detail: delayedProduction.length ? "Revisar programação" : "Nenhuma OP atrasada" },
    { label: "Produção bloqueada", value: source("ordem_producao_materiais", blockedProduction), detail: blockedProduction ? "Falta de material" : "Nenhum bloqueio registrado" },
    { label: "Materiais faltantes", value: source("ordem_producao_materiais", missingMaterials.length), detail: missingMaterials.length ? "Preparar necessidade de compra" : "Nenhuma falta registrada" },
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
