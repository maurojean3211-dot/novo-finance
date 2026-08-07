import { useMemo, useState } from "react";

function detailRows(item, type) {
  if (!item) return [];
  if (type === "prospect") return [["Identificação", item.nomeFantasia || item.razaoSocial], ["Contato", item.contatoNome], ["Telefone", item.telefone || item.whatsapp], ["E-mail", item.email], ["Origem", item.origem], ["Responsável", item.responsavel], ["Próximo retorno", item.proximoRetornoEm], ["Interações", item.interacoes?.length], ["Observações", item.observacoes || item.retornoObservacao]];
  return [["Identificação", item.nome], ["Telefone", item.telefone || item.whatsapp], ["E-mail", item.email], ["Cadastro", item.created_at]];
}

export default function CommercialContextPanel({ context }) {
  const choices = useMemo(() => [...context.customers.map((item) => ({ key: `client:${item.id}`, label: item.nome, type: "client", item })), ...context.prospects.map((item) => ({ key: `prospect:${item.id}`, label: item.nomeFantasia || item.razaoSocial || item.contatoNome, type: "prospect", item }))], [context.customers, context.prospects]);
  const [selectedKey, setSelectedKey] = useState("");
  const selected = choices.find((item) => item.key === selectedKey);
  const rows = detailRows(selected?.item, selected?.type).filter(([, value]) => value !== undefined && value !== null && value !== "");
  return <section className="commercial-context"><header><div><span>Contexto comercial</span><h2>Cliente ou prospect</h2></div><select aria-label="Selecionar cliente ou prospect" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}><option value="">Selecione para analisar</option>{choices.map((choice) => <option value={choice.key} key={choice.key}>{choice.type === "prospect" ? "Prospect" : "Cliente"} · {choice.label}</option>)}</select></header>{selected ? <><div className="commercial-context__grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{String(value)}</strong></div>)}</div>{rows.length < 5 && <p>Cadastre mais interações para obter uma análise comercial mais completa.</p>}</> : <div className="commercial-context__empty">Selecione um registro para visualizar apenas os dados disponíveis.</div>}</section>;
}
