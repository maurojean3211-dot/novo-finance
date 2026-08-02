import { useState } from "react";
import { ACTIVITY_TYPES } from "../types/crm";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function OpportunityDetails({ opportunity, onClose, onEdit, onAddActivity }) {
  const [tipo, setTipo] = useState(ACTIVITY_TYPES[0]);
  const [descricao, setDescricao] = useState("");
  if (!opportunity) return null;
  function register() {
    if (!descricao.trim()) return;
    onAddActivity(opportunity.id, { tipo, descricao: descricao.trim(), data: new Date().toISOString().slice(0, 10) });
    setDescricao("");
  }
  return <div className="crm-details-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="crm-details"><header><div><small>{opportunity.etapa}</small><h2>{opportunity.empresa}</h2><p>{opportunity.produtoInteresse}</p></div><button onClick={onClose}>×</button></header><div className="crm-details__actions"><button onClick={() => onEdit(opportunity)}>Editar oportunidade</button></div><section className="crm-details__summary"><article><span>Valor estimado</span><strong>{money(opportunity.valorEstimado)}</strong></article><article><span>Probabilidade</span><strong>{opportunity.probabilidade}%</strong></article><article><span>Peso estimado</span><strong>{Number(opportunity.pesoEstimado || 0).toLocaleString("pt-BR")} kg</strong></article></section><section className="crm-detail-grid">{[["Contato", opportunity.contatoPrincipal], ["Telefone", opportunity.telefone], ["WhatsApp", opportunity.whatsapp], ["E-mail", opportunity.email], ["Localidade", `${opportunity.cidade}/${opportunity.estado}`], ["Segmento", opportunity.segmento], ["Origem", opportunity.origemLead], ["Responsável", opportunity.vendedorResponsavel], ["Próximo retorno", opportunity.proximoContato], ["Prioridade", opportunity.prioridade], ["Status", opportunity.status], ["Motivo de perda", opportunity.motivoPerda || "—"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}</section><section className="crm-notes"><h3>Observações</h3><p>{opportunity.observacoes || "Nenhuma observação registrada."}</p></section><section className="crm-activity"><div><h3>Histórico e atividades</h3><small>Dados mantidos somente em memória</small></div><div className="crm-activity__form"><select value={tipo} onChange={(event) => setTipo(event.target.value)}>{ACTIVITY_TYPES.map((value) => <option key={value}>{value}</option>)}</select><input placeholder="Descreva a interação" value={descricao} onChange={(event) => setDescricao(event.target.value)} /><button onClick={register}>Registrar</button></div><div className="crm-timeline">{opportunity.atividades.length ? opportunity.atividades.map((activity) => <article key={activity.id}><span>•</span><div><strong>{activity.tipo}</strong><p>{activity.descricao}</p><small>{activity.data}</small></div></article>) : <p className="crm-no-activity">Nenhuma interação registrada.</p>}</div></section></aside></div>;
}
