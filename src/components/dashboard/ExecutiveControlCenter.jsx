import useAgendaActivities from "../../modules/agenda-comercial/hooks/useAgendaActivities";
import CommercialOverview from "./CommercialOverview";
import CompanyOverview from "./CompanyOverview";
import ExecutiveAssistant from "./ExecutiveAssistant";
import MarketOverview from "./MarketOverview";
import OperationalOverview from "./OperationalOverview";
import ExecutivePanel from "./ExecutivePanel";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function FinancialOverview({ data }) {
  const revenues = data.lancamentos.filter((item) => item.tipo === "receita").reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const expenses = data.lancamentos.filter((item) => item.tipo !== "receita").reduce((sum, item) => sum + Number(item.valor || 0), 0);
  return <ExecutivePanel title="Financeiro" eyebrow="Fluxo consolidado" icon="$">{data.lancamentos.length ? <div className="financial-command"><article><span>Entradas</span><strong>{currency.format(revenues)}</strong></article><article><span>Saídas</span><strong>{currency.format(expenses)}</strong></article><article><span>Saldo</span><strong>{currency.format(revenues - expenses)}</strong></article></div> : <p className="command-empty">Sem dados disponíveis</p>}</ExecutivePanel>;
}

export default function ExecutiveControlCenter({ data, empresaId, userId, onNavigate }) {
  const agenda = useAgendaActivities({ empresaId, userId });
  return <section className="control-center" aria-labelledby="control-center-title"><header className="control-center__heading"><span>Visão integrada</span><h2 id="control-center-title">Centro de Comando</h2></header><div className="control-center__grid"><CompanyOverview data={data} /><CommercialOverview data={data} agenda={agenda} onNavigate={onNavigate} /><OperationalOverview data={data} onNavigate={onNavigate} /><FinancialOverview data={data} /><MarketOverview /><ExecutiveAssistant data={data} agenda={agenda} /></div></section>;
}
