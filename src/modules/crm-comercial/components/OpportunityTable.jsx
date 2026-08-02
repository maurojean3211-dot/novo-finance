import { EmptyState } from "../../../components/operations/OperationsUI";
import { FUNNEL_STAGES } from "../types/crm";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function OpportunityTable({ opportunities, onSelect, onMove }) {
  return <section className="ops-panel"><div className="ops-panel__header"><h2>Oportunidades comerciais</h2><span>{opportunities.length} resultado(s)</span></div>{!opportunities.length ? <EmptyState title="Nenhuma oportunidade encontrada" /> : <div className="ops-table-wrap"><table className="ops-table crm-table"><thead><tr><th>Empresa</th><th>Contato</th><th>Interesse</th><th>Valor</th><th>Probabilidade</th><th>Responsável</th><th>Próximo retorno</th><th>Etapa</th></tr></thead><tbody>{opportunities.map((item) => <tr key={item.id} onClick={() => onSelect(item)}><td><strong>{item.empresa}</strong><small>{item.cidade}/{item.estado}</small></td><td>{item.contatoPrincipal}</td><td>{item.produtoInteresse}</td><td>{money(item.valorEstimado)}</td><td>{item.probabilidade}%</td><td>{item.vendedorResponsavel}</td><td>{item.proximoContato || "—"}</td><td><select value={item.etapa} onClick={(event) => event.stopPropagation()} onChange={(event) => onMove(item.id, event.target.value)}>{FUNNEL_STAGES.map((value) => <option key={value}>{value}</option>)}</select></td></tr>)}</tbody></table></div>}</section>;
}
