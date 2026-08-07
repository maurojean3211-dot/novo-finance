import { useState } from "react";
import BudgetAssistant from "../components/BudgetAssistant";
import CommercialAnalysisResult from "../components/CommercialAnalysisResult";
import CommercialAssistant from "../components/CommercialAssistant";
import CommercialContextPanel from "../components/CommercialContextPanel";
import DailyCommercialSummary from "../components/DailyCommercialSummary";
import useCommercialAssistant from "../hooks/useCommercialAssistant";
import "../styles/ia-comercial.css";

export default function IAComercialPage({ empresaId, userId }) {
  const assistant = useCommercialAssistant({ empresaId, userId });
  const [result, setResult] = useState(null);
  const [dailyResult, setDailyResult] = useState(null);
  const analyze = (command) => setResult(assistant.analyze(command));
  const generateDaily = () => { const next = assistant.dailySummary(); setDailyResult(next); setResult(next); };
  const contextItems = [
    ["Clientes", assistant.context.customers.length, "Cliente"],
    ["Prospects", assistant.context.prospects.length, "Prospecção"],
    ["Agenda", assistant.context.agenda.length, "Agenda"],
    ["Catálogo", assistant.context.products.length, "Catálogo"],
    ["Vendas", assistant.context.sales.length, "Dashboard"],
    ["Compras", assistant.context.purchases.length, "Dashboard"],
  ];

  return <main className="ia-commercial-page"><header className="ia-commercial-header"><div><span>Inteligência Artificial</span><h1>IA Comercial</h1><p>Assistente local para organizar informações e apoiar decisões que permanecem sob conferência humana.</p></div><div><b>Modo seguro</b><small>Sem API externa · nenhuma ação automática</small></div></header><section className="ia-commercial-grid ia-commercial-grid--hero"><CommercialAssistant loading={assistant.loading} onAnalyze={analyze} /><CommercialAnalysisResult result={result} /></section><section className="commercial-source-strip">{contextItems.map(([label, value, source]) => <article key={label}><span>{label}</span><strong>{assistant.loading ? "…" : value || "Sem dados"}</strong><small>{source} · dado real</small></article>)}</section><section className="ia-commercial-grid"><CommercialContextPanel context={assistant.context} /><DailyCommercialSummary result={dailyResult} onGenerate={generateDaily} /></section><BudgetAssistant context={assistant.context} /><section className="commercial-session-history"><header><div><span>Sessão atual</span><h2>Histórico local</h2></div><small>Não será salvo ao encerrar a sessão.</small></header>{assistant.history.length ? <div>{assistant.history.map((item) => <article key={item.id}><span>{new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span><div><strong>{item.command}</strong><p>{item.result.message}</p></div><small>{item.result.source}</small></article>)}</div> : <p className="commercial-history-empty">Nenhuma análise realizada nesta sessão.</p>}</section></main>;
}
