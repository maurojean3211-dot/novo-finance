import { useState } from "react";
import { formatMoney } from "../utils/money-calculations";

function formatDate(value) {
  return value ? new Date(value).toLocaleString("pt-BR") : "Data não informada";
}

export default function ApprovalPanel({ quote, onDecision, saving }) {
  const [observation, setObservation] = useState("");
  const disabled = saving || !observation.trim();
  return <div className="approval-panel">
    <section className="approval-summary"><h2>Resumo para decisão</h2><div>
      <article><span>Orçamento</span><strong>{quote.numero}</strong></article>
      <article><span>Cliente</span><strong>{quote.cliente}</strong></article>
      <article><span>Valor</span><strong>{formatMoney(quote.valor)}</strong></article>
      <article><span>Status atual</span><strong>{quote.status}</strong></article>
    </div></section>
    <label className="approval-justification"><span>Observação obrigatória</span><textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Registre o motivo da decisão" disabled={saving} /></label>
    <section className="approval-roles"><article><div><strong>Decisão</strong><small>Será registrada com usuário e data/hora.</small></div><button disabled={disabled} onClick={() => onDecision("Aprovado", observation.trim())}>Aprovar</button><button className="reject" disabled={disabled} onClick={() => onDecision("Rejeitado", observation.trim())}>Reprovar</button></article></section>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Histórico de decisões</h2><span>{quote.aprovacoes?.length || 0} registro(s)</span></div>
      {(quote.aprovacoes || []).map((item) => <article key={item.id}><strong>{item.decisao}</strong><p>{item.observacao}</p><small>{formatDate(item.createdAt)} · usuário {item.userId}</small></article>)}
      {!quote.aprovacoes?.length && <p>Nenhuma decisão registrada.</p>}
    </section>
  </div>;
}
