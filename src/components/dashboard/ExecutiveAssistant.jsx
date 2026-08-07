import IntelligenceCenter from "./IntelligenceCenter";
import ExecutivePanel from "./ExecutivePanel";

export default function ExecutiveAssistant({ data, agenda }) {
  const today = new Date().toISOString().slice(0, 10);
  const pending = data.recebimentos.filter((item) => !["pago", "recebido"].includes(String(item.status || "").toLowerCase())).length;
  const todayActivities = agenda.activities.filter((item) => item.date === today).length;
  const hasLimitedData = data.vendas.length + data.compras.length + data.clientes.length < 3;
  return <ExecutivePanel title="Assistente Executivo" eyebrow="IA executiva" icon="✦" className="command-panel--assistant"><div className="assistant-summary"><article><span>Resumo do dia</span><strong>{todayActivities ? `${todayActivities} atividade(s)` : "Sem dados disponíveis"}</strong></article><article><span>Pendências financeiras</span><strong>{pending || "Sem dados disponíveis"}</strong></article><article><span>Movimentações recentes</span><strong>{data.recent.length || "Sem dados disponíveis"}</strong></article></div>{hasLimitedData && <p className="assistant-guidance">Continue cadastrando vendas, compras e clientes para desbloquear análises mais completas.</p>}<IntelligenceCenter loading={data.loading || agenda.loading} recebimentos={data.recebimentos} vendas={data.vendas} compact /></ExecutivePanel>;
}
