import ExecutiveControlCenter from "./components/dashboard/ExecutiveControlCenter";
import ExecutiveMetrics from "./components/dashboard/ExecutiveMetrics";
import ExecutiveHeader from "./components/layout/ExecutiveHeader";
import useExecutiveDashboard from "./hooks/useExecutiveDashboard";
import "./Dashboard.css";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const total = (items, field = "valor") => items.reduce((sum, item) => sum + Number(item[field] || 0), 0);

export default function Dashboard({ empresaId, userId, nomeEmpresa, nomeUsuario, onNavigate }) {
  const dashboard = useExecutiveDashboard(empresaId);
  const metrics = [
    { label: "Receita", icon: "💰", value: dashboard.vendas.length ? currency.format(total(dashboard.vendas)) : "Sem dados disponíveis", detail: `${dashboard.vendas.length} venda(s) registrada(s)`, featured: true },
    { label: "Margem", icon: "📈", value: "Sem dados disponíveis", detail: "Indicador não disponível" },
    { label: "Compras", icon: "🛒", value: dashboard.compras.length || "Sem dados disponíveis", detail: "registros existentes" },
    { label: "Vendas", icon: "💼", value: dashboard.vendas.length || "Sem dados disponíveis", detail: "registros existentes" },
    { label: "Clientes", icon: "👥", value: dashboard.clientes.length || "Sem dados disponíveis", detail: "cadastros existentes" },
    { label: "CRM", icon: "📊", value: "Sem dados disponíveis", detail: "Indicador não disponível" },
  ];

  return (
    <main className="executive-dashboard">
      <ExecutiveHeader nomeEmpresa={nomeEmpresa} nomeUsuario={nomeUsuario} loading={dashboard.loading} onRefresh={dashboard.refresh} />
      {dashboard.error && <p className="dashboard-warning" role="status">{dashboard.error}</p>}
      <section className="executive-summary" aria-labelledby="executive-summary-title"><header><span>Visão geral</span><h2 id="executive-summary-title">Resumo Executivo</h2></header>{dashboard.loading ? <p className="dashboard-loading">Carregando indicadores…</p> : <ExecutiveMetrics items={metrics} />}</section>
      <ExecutiveControlCenter data={dashboard} empresaId={empresaId} userId={userId} onNavigate={onNavigate} />
    </main>
  );
}
