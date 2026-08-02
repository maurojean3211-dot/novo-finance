import { StatusPanel } from "../../../components/operations/OperationsUI";

const quotes = [
  { id: "ORC-2026-0142", empresa: "Metalúrgica Horizonte", oportunidade: "Tarugo de alumínio", status: "Em negociação", valor: "R$ 286.400" },
  { id: "ORC-2026-0140", empresa: "Fundição Vale Verde", oportunidade: "Lingote e sucata", status: "Enviado ao cliente", valor: "R$ 98.500" },
];

export default function CrmLinkedQuotes() {
  return <section className="ops-panel"><div className="ops-panel__header"><h2>Orçamentos vinculados</h2><span>Base arquitetural local</span></div><StatusPanel>A vinculação persistente CRM → Orçamento permanece preparada para uma etapa futura. Nenhuma consulta ou gravação nova é executada aqui.</StatusPanel><div className="crm-linked-quotes">{quotes.map((quote) => <article key={quote.id}><div><small>{quote.id}</small><strong>{quote.empresa}</strong><span>{quote.oportunidade}</span></div><div><b>{quote.valor}</b><span>{quote.status}</span></div></article>)}</div></section>;
}
