import DashboardPeriodFilter from "./components/dashboard/DashboardPeriodFilter";
import ExecutiveControlCenter from "./components/dashboard/ExecutiveControlCenter";
import ExecutiveMetrics from "./components/dashboard/ExecutiveMetrics";
import ExecutiveHeader from "./components/layout/ExecutiveHeader";
import useExecutiveDashboard from "./hooks/useExecutiveDashboard";
import "./Dashboard.css";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard({ empresaId, userId, nomeEmpresa, nomeUsuario, onNavigate }) {
  const dashboard = useExecutiveDashboard(empresaId);
  const available = (table, value, empty = "Sem dados disponíveis") => dashboard.sourceAvailable(table) ? value : empty;
  const financialTitles = dashboard.financeiro_titulos.filter((item) => item.status !== "Cancelado");
  const payable = financialTitles.filter((item) => item.tipo === "Pagar").reduce((sum, item) => sum + Number(item.saldo || 0), 0);
  const receivable = financialTitles.filter((item) => item.tipo === "Receber").reduce((sum, item) => sum + Number(item.saldo || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = financialTitles.filter((item) => Number(item.saldo || 0) > 0 && item.vencimento < today).reduce((sum, item) => sum + Number(item.saldo || 0), 0);
  const titleType = new Map(financialTitles.map((item) => [item.id, item.tipo]));
  const month = today.slice(0, 7);
  const monthlyFlow = dashboard.financeiro_baixas.filter((item) => String(item.data_movimento).startsWith(month)).reduce((sum, item) => {
    const direction = titleType.get(item.titulo_id) === "Receber" ? 1 : -1;
    const reversal = item.tipo === "Estorno" ? -1 : 1;
    return sum + Number(item.valor || 0) * direction * reversal;
  }, 0);
  const metrics = [
    { label: "Total vendido", icon: "↗", value: available("vendas", dashboard.vendas.length ? currency.format(dashboard.totalVendas) : "Sem dados disponíveis"), detail: `${dashboard.vendas.length} venda(s) no período`, featured: true },
    { label: "Ticket médio", icon: "◇", value: available("vendas", dashboard.vendas.length ? currency.format(dashboard.ticketMedio) : "Sem dados disponíveis"), detail: "Média por venda" },
    { label: "Comissão de vendas", icon: "%", value: available("vendas", dashboard.vendas.length ? currency.format(dashboard.comissaoVendas) : "Sem dados disponíveis"), detail: "Motor de comissão existente" },
    { label: "Total comprado", icon: "▧", value: available("compras", dashboard.compras.length ? currency.format(dashboard.totalCompras) : "Sem dados disponíveis"), detail: `${dashboard.compras.length} compra(s) no período` },
    { label: "Peso comprado", icon: "⚖", value: available("compras", dashboard.compras.length ? `${dashboard.pesoCompras.toLocaleString("pt-BR")} kg` : "Sem dados disponíveis"), detail: "Volume no período" },
    { label: "Comissão de compras", icon: "$", value: available("compras", dashboard.compras.length ? currency.format(dashboard.comissaoCompras) : "Sem dados disponíveis"), detail: "Motor de comissão existente" },
    { label: "Clientes", icon: "◎", value: available("clientes", dashboard.clientes.length || "Sem dados disponíveis"), detail: `${dashboard.novosClientes.length} novo(s) no período` },
    { label: "Estoque atual", icon: "▥", value: available("estoque", dashboard.estoque.reduce((sum, item) => sum + Number(item.estoque_atual || 0), 0).toLocaleString("pt-BR")), detail: "Quantidade física real" },
    { label: "Itens críticos", icon: "!", value: available("estoque", dashboard.estoque.filter((item) => Number(item.estoque_disponivel || 0) <= Number(item.ponto_reposicao || item.estoque_minimo || 0)).length), detail: "No ponto de reposição" },
    { label: "Reservas", icon: "◇", value: available("estoque", dashboard.estoque.reduce((sum, item) => sum + Number(item.estoque_reservado || 0), 0).toLocaleString("pt-BR")), detail: "Quantidade reservada" },
    { label: "Valor do estoque", icon: "R$", value: available("estoque", currency.format(dashboard.estoque.reduce((sum, item) => sum + Number(item.estoque_atual || 0) * Number(item.custo_unitario || 0), 0))), detail: "Custo persistido" },
    { label: "Valor comprado", icon: "▧", value: available("pedidos_compra", currency.format(dashboard.pedidos_compra.reduce((sum, item) => sum + Number(item.valor_total || 0), 0))), detail: "Pedidos persistentes" },
    { label: "Pedidos em aberto", icon: "◎", value: available("pedidos_compra", dashboard.pedidos_compra.filter((item) => !["Recebido", "Cancelado"].includes(item.status)).length), detail: "Fluxo de compras" },
    { label: "Recebimentos pendentes", icon: "!", value: available("pedidos_compra", dashboard.pedidos_compra.filter((item) => ["Comprado", "Recebido parcialmente"].includes(item.status)).length), detail: "Aguardando estoque" },
    { label: "Fornecedores ativos", icon: "▦", value: available("pedidos_compra", new Set(dashboard.pedidos_compra.map((item) => item.fornecedor_id)).size), detail: "Com pedidos reais" },
    { label: "Contas a pagar", icon: "↘", value: available("financeiro_titulos", currency.format(payable)), detail: "Saldo corporativo em aberto" },
    { label: "Contas a receber", icon: "↗", value: available("financeiro_titulos", currency.format(receivable)), detail: "Saldo corporativo em aberto" },
    { label: "Títulos vencidos", icon: "!", value: available("financeiro_titulos", currency.format(overdue)), detail: "Pagar e receber vencidos" },
    { label: "Saldo projetado", icon: "◇", value: available("financeiro_titulos", currency.format(receivable - payable)), detail: "Recebíveis menos compromissos" },
    { label: "Fluxo do mês", icon: "$", value: available("financeiro_baixas", currency.format(monthlyFlow)), detail: "Baixas realizadas no mês" },
  ];

  return <main className="executive-dashboard">
    <ExecutiveHeader nomeEmpresa={nomeEmpresa} nomeUsuario={nomeUsuario} loading={dashboard.loading} onRefresh={dashboard.refresh} />
    <DashboardPeriodFilter dashboard={dashboard} />
    {dashboard.error && <div className="dashboard-warning" role="status"><strong>{dashboard.error}</strong><span>{Object.keys(dashboard.errors).join(", ")}</span></div>}
    <section className="executive-summary" aria-labelledby="executive-summary-title"><header><span>Visão geral</span><h2 id="executive-summary-title">Resumo Executivo</h2></header>{dashboard.loading ? <p className="dashboard-loading">Carregando indicadores…</p> : <ExecutiveMetrics items={metrics} />}</section>
    <ExecutiveControlCenter data={dashboard} empresaId={empresaId} userId={userId} onNavigate={onNavigate} />
  </main>;
}
