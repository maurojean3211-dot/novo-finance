import { QUOTE_STATUSES } from "../types/orcamento";

const DECISION_STATUSES = ["Aprovado", "Rejeitado"];

export default function OrcamentoStatus({ status, onChange }) {
  const current = QUOTE_STATUSES.indexOf(status);
  const selectable = QUOTE_STATUSES.filter((value) => !DECISION_STATUSES.includes(value) || value === status);
  return <section className="quote-workflow"><div className="quote-workflow__summary"><div><small>Etapa atual</small><strong>{status}</strong></div><select value={status} onChange={(event) => onChange(event.target.value)}>{selectable.map((value) => <option value={value} key={value}>{value}</option>)}</select></div><div className="quote-workflow__track">{QUOTE_STATUSES.map((value, index) => <div className={index < current ? "done" : index === current ? "active" : ""} key={value}><span>{index < current ? "✓" : index + 1}</span><small>{value}</small></div>)}</div><footer><span>Aprovação e rejeição são registradas pela tela de decisão.</span></footer></section>;
}
