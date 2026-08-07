import { useMemo } from "react";
import DashboardRecommendation from "./DashboardRecommendation";
import ExecutiveAlert from "./ExecutiveAlert";
import IntelligenceCard from "./IntelligenceCard";

const DAY = 86400000;
const pendingStatus = (item) => !["pago", "recebido"].includes(String(item.status || "").toLowerCase().trim());

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysFromToday(value) {
  if (!value) return null;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - startOfToday()) / DAY);
}

function buildInsights({ recebimentos, vendas }) {
  const alerts = [];
  const recommendations = [];
  const pending = recebimentos.filter(pendingStatus);
  const overdue = pending.filter((item) => daysFromToday(item.data_vencimento) < 0);
  const dueSoon = pending.filter((item) => {
    const days = daysFromToday(item.data_vencimento);
    return days !== null && days >= 0 && days <= 7;
  });

  if (overdue.length) {
    alerts.push({ icon: "!", title: "Títulos vencidos", description: `${overdue.length} título(s) aguardam regularização.`, category: "Financeiro", tone: "danger" });
    recommendations.push({ text: "Existem títulos vencidos que precisam de acompanhamento.", tone: "danger" });
  }
  if (dueSoon.length) {
    alerts.push({ icon: "◷", title: "Vencimentos próximos", description: `${dueSoon.length} título(s) vencem nos próximos 7 dias.`, category: "Financeiro", tone: "warning" });
    recommendations.push({ text: "Há títulos próximos do vencimento.", tone: "warning" });
  }

  const validSales = vendas.filter((item) => item.data_venda && !Number.isNaN(new Date(`${String(item.data_venda).slice(0, 10)}T00:00:00`).getTime()));
  if (validSales.length) {
    const latestSale = Math.max(...validSales.map((item) => new Date(`${String(item.data_venda).slice(0, 10)}T00:00:00`).getTime()));
    const daysWithoutSales = Math.floor((startOfToday().getTime() - latestSale) / DAY);
    if (daysWithoutSales > 30) {
      alerts.push({ icon: "↗", title: "Movimentação comercial", description: `A última venda registrada ocorreu há ${daysWithoutSales} dias.`, category: "Comercial", tone: "info" });
      recommendations.push({ text: "Não há vendas registradas nos últimos 30 dias.", tone: "info" });
    }
  }

  const productVolumes = vendas.reduce((result, item) => {
    const product = String(item.produto || "").trim();
    if (product) result[product] = (result[product] || 0) + Number(item.kilos || 0);
    return result;
  }, {});
  const topProduct = Object.entries(productVolumes).sort((a, b) => b[1] - a[1])[0];
  if (topProduct && topProduct[1] > 0) {
    alerts.push({ icon: "◆", title: "Produto mais vendido", description: `${topProduct[0]} lidera o volume registrado, com ${topProduct[1].toLocaleString("pt-BR")} kg.`, category: "Operacional", tone: "success" });
  }

  return { alerts, recommendations };
}

export default function IntelligenceCenter({ loading, recebimentos, vendas, compact = false }) {
  const { alerts, recommendations } = useMemo(() => buildInsights({ recebimentos, vendas }), [recebimentos, vendas]);
  const insufficient = !loading && alerts.length === 0;

  return (
    <section className={`intelligence-center${compact ? " intelligence-center--compact" : ""}`} aria-labelledby="intelligence-center-title">
      <div className="intelligence-center__heading">
        <span className="intelligence-center__orb" aria-hidden="true">✦</span>
        <div><span>IA executiva</span><h2 id="intelligence-center-title">Central de Inteligência</h2><p>Análises geradas exclusivamente a partir dos registros disponíveis.</p></div>
      </div>
      {loading ? <p className="intelligence-center__empty">Carregando análises…</p> : insufficient ? <p className="intelligence-center__empty">Sem informações suficientes para gerar recomendações.</p> : (
        <div className="intelligence-center__content">
          <IntelligenceCard eyebrow="Alertas executivos" title="Pontos de atenção"><div className="intelligence-alerts">{alerts.map((alert) => <ExecutiveAlert key={`${alert.category}-${alert.title}`} alert={alert} />)}</div></IntelligenceCard>
          <IntelligenceCard eyebrow="Recomendações" title="Próximas ações" className="intelligence-card--recommendations">{recommendations.length ? <ul>{recommendations.map((item) => <DashboardRecommendation key={item.text} tone={item.tone}>{item.text}</DashboardRecommendation>)}</ul> : <p className="intelligence-recommendations__empty">Sem recomendações no momento.</p>}</IntelligenceCard>
        </div>
      )}
    </section>
  );
}
