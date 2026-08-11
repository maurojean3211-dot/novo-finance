import DashboardPeriodFilter from "./components/dashboard/DashboardPeriodFilter";
import ExecutiveControlCenter from "./components/dashboard/ExecutiveControlCenter";
import ExecutiveMetrics from "./components/dashboard/ExecutiveMetrics";
import ExecutiveHeader from "./components/layout/ExecutiveHeader";
import useExecutiveDashboard from "./hooks/useExecutiveDashboard";
import { localIsoDate, safeNumber } from "./components/dashboard/dashboardMetrics";
import "./Dashboard.css";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function PainelExecutivo({ empresaId, nomeEmpresa, nomeUsuario, onNavigate }) {
  const dashboard = useExecutiveDashboard(empresaId, "month");
  const today = localIsoDate();
  const valid = (table, value) => dashboard.sourceAvailable(table) ? value : "—";
  const movement = (table, count, value) => valid(table, count ? value : typeof value === "number" ? 0 : value);
  const titles = dashboard.financeiro_titulos.filter((item) => item.status !== "Cancelado");
  const payable = titles.filter((item) => item.tipo === "Pagar").reduce((sum, item) => sum + safeNumber(item.saldo), 0);
  const receivable = titles.filter((item) => item.tipo === "Receber").reduce((sum, item) => sum + safeNumber(item.saldo), 0);
  const overdueReceivables = titles.filter((item) => item.tipo === "Receber" && safeNumber(item.saldo) > 0 && item.vencimento < today).reduce((sum, item) => sum + safeNumber(item.saldo), 0);
  const pipeline = dashboard.crm_oportunidades.filter((item) => !["Fechado — ganho", "Fechado — perdido"].includes(item.etapa)).reduce((sum, item) => sum + safeNumber(item.valor_estimado), 0);
  const budgets = dashboard.orcamentos.filter((item) => !["Cancelado", "Rejeitado"].includes(item.status));
  const purchases = dashboard.pedidos_compra.reduce((sum, item) => sum + safeNumber(item.valor_total), 0);
  const stockValue = dashboard.estoque.reduce((sum, item) => sum + safeNumber(item.estoque_atual) * safeNumber(item.custo_unitario), 0);
  const productionOpen = dashboard.ordens_producao.filter((item) => !["Concluída", "Cancelada"].includes(item.status));
  const productionRunning = dashboard.ordens_producao.filter((item) => item.status === "Em produção");
  const productionDelayed = productionOpen.filter((item) => item.data_prevista_fim && item.data_prevista_fim < today);
  const productionAmount = dashboard.ordem_producao_apontamentos.filter((item) => item.tipo === "Produção").reduce((sum, item) => sum + safeNumber(item.quantidade), 0);
  const productionLosses = dashboard.ordem_producao_apontamentos.filter((item) => item.tipo === "Perda").reduce((sum, item) => sum + safeNumber(item.quantidade), 0);
  const missingMaterials = dashboard.ordem_producao_materiais.filter((item) => item.necessidade_compra).length;
  const metrics = [
    { label: "Faturamento", icon: "↗", value: movement("vendas", dashboard.vendas.length, currency.format(dashboard.totalVendas)), detail: dashboard.vendas.length ? `${dashboard.vendas.length} venda(s) no período` : "Aguardando movimentação", featured: true },
    { label: "Margem", icon: "%", value: "—", detail: "Dados insuficientes" },
    { label: "Ticket médio", icon: "◇", value: movement("vendas", dashboard.vendas.length, currency.format(dashboard.ticketMedio)), detail: dashboard.vendas.length ? "Média por venda" : "Aguardando movimentação" },
    { label: "Pipeline CRM", icon: "◎", value: valid("crm_oportunidades", currency.format(pipeline)), detail: dashboard.crm_oportunidades.length ? `${dashboard.crm_oportunidades.length} oportunidade(s)` : "Aguardando movimentação" },
    { label: "Orçamentos", icon: "▤", value: valid("orcamentos", currency.format(budgets.reduce((sum, item) => sum + safeNumber(item.valor_final), 0))), detail: budgets.length ? `${budgets.length} ativo(s)` : "Sem dados no período" },
    { label: "Compras", icon: "▧", value: valid("pedidos_compra", currency.format(purchases)), detail: dashboard.pedidos_compra.length ? `${dashboard.pedidos_compra.length} pedido(s)` : "Aguardando movimentação" },
    { label: "Valor do estoque", icon: "▥", value: valid("estoque", currency.format(stockValue)), detail: dashboard.estoque.length ? "Custo persistido" : "Aguardando movimentação" },
    { label: "Fluxo de caixa", icon: "$", value: valid("lancamentos", currency.format(dashboard.resultado)), detail: dashboard.lancamentos.length ? "Resultado do período" : "Aguardando movimentação" },
    { label: "Inadimplência", icon: "!", value: valid("financeiro_titulos", currency.format(overdueReceivables)), detail: overdueReceivables ? "Recebíveis vencidos" : "Nenhum valor vencido" },
    { label: "Contas a pagar", icon: "↘", value: valid("financeiro_titulos", currency.format(payable)), detail: titles.length ? "Saldo em aberto" : "Aguardando movimentação" },
    { label: "Contas a receber", icon: "↗", value: valid("financeiro_titulos", currency.format(receivable)), detail: titles.length ? "Saldo em aberto" : "Aguardando movimentação" },
    { label: "OPs abertas", icon: "▤", value: valid("ordens_producao", productionOpen.length), detail: "Planejamento e execução" },
    { label: "Em produção", icon: "▶", value: valid("ordens_producao", productionRunning.length), detail: "Execução atual" },
    { label: "OPs atrasadas", icon: "!", value: valid("ordens_producao", productionDelayed.length), detail: "Condição por prazo previsto" },
    { label: "Produção do período", icon: "⚙", value: valid("ordem_producao_apontamentos", productionAmount.toLocaleString("pt-BR")), detail: "Quantidade apontada" },
    { label: "Perdas de produção", icon: "×", value: valid("ordem_producao_apontamentos", productionLosses.toLocaleString("pt-BR")), detail: "Refugo apontado" },
    { label: "Materiais faltantes", icon: "▧", value: valid("ordem_producao_materiais", missingMaterials), detail: "Necessidade de compra" },
  ];

  return <main className="executive-dashboard management-dashboard">
    <ExecutiveHeader nomeEmpresa={nomeEmpresa} nomeUsuario={nomeUsuario} loading={dashboard.loading} onRefresh={dashboard.refresh} />
    <header className="dashboard-view-heading"><div><span>Visão gerencial</span><h2>Painel Executivo</h2><p>Indicadores consolidados, comparação de períodos e tendências da empresa.</p></div><button type="button" onClick={() => onNavigate("dashboard")}>Voltar ao Dashboard →</button></header>
    <DashboardPeriodFilter dashboard={dashboard} />
    {dashboard.error && <div className="dashboard-warning" role="status"><strong>Algumas integrações estão indisponíveis.</strong><span>{Object.keys(dashboard.errors).join(", ")}</span></div>}
    <section className="executive-summary" aria-labelledby="management-summary"><header><span>Indicadores estratégicos</span><h2 id="management-summary">Desempenho consolidado</h2></header>{dashboard.loading ? <p className="dashboard-loading">Carregando indicadores…</p> : <ExecutiveMetrics items={metrics} />}</section>
    <ExecutiveControlCenter data={dashboard} onNavigate={onNavigate} />
  </main>;
}
