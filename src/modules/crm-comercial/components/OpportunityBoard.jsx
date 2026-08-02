import { EmptyState } from "../../../components/operations/OperationsUI";
import { FUNNEL_STAGES } from "../types/crm";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function OpportunityBoard({ opportunities, onSelect, onMove }) {
  if (!opportunities.length) return <section className="ops-panel"><EmptyState title="Nenhuma oportunidade encontrada" /></section>;
  return <div className="crm-board">{FUNNEL_STAGES.map((stage) => {
    const cards = opportunities.filter((item) => item.etapa === stage);
    return <section className="crm-column" key={stage}><header><div><span className="crm-stage-dot" /><strong>{stage}</strong></div><b>{cards.length}</b></header><div className="crm-column__body">{cards.map((item) => <article className="crm-card" key={item.id}><button className="crm-card__main" onClick={() => onSelect(item)}><small>{item.segmento}</small><strong>{item.empresa}</strong><span>{item.produtoInteresse}</span><div><b>{money(item.valorEstimado)}</b><em>{item.probabilidade}%</em></div></button><footer><span className={`crm-priority crm-priority--${item.prioridade.toLowerCase().replace("é", "e")}`}>{item.prioridade}</span><select aria-label={`Mover ${item.empresa}`} value={item.etapa} onChange={(event) => onMove(item.id, event.target.value)}>{FUNNEL_STAGES.map((value) => <option key={value}>{value}</option>)}</select></footer></article>)}</div></section>;
  })}</div>;
}
