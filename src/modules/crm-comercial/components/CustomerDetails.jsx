import { useEffect, useState } from "react";
import { listCustomerOpportunities } from "../services/crm.service";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CustomerDetails({ customer, empresaId, onClose, onEdit, onOpenOpportunity }) {
  const [tab, setTab] = useState("general");
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listCustomerOpportunities({ empresaId, customerId: customer.id })
      .then((items) => { if (active) setOpportunities(items); })
      .catch((requestError) => { if (active) setError(requestError.message || "Não foi possível carregar as oportunidades."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customer.id, empresaId]);

  const general = [["Nome", customer.nome], ["CPF/CNPJ", customer.cpf_cnpj || customer.cpf || customer.cnpj], ["Responsável comercial", customer.vendedor_responsavel || customer.vendedor], ["Observações comerciais", customer.observacoes_comerciais || customer.observacoes]];
  const contacts = [["Contato responsável", customer.contato_responsavel || customer.contato], ["Telefone", customer.telefone], ["WhatsApp", customer.whatsapp], ["E-mail", customer.email], ["Endereço", customer.endereco], ["Cidade/UF", [customer.cidade, customer.estado].filter(Boolean).join("/")]];

  return <div className="crm-details-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="crm-details customer-details"><header><div><small>Cadastro permanente</small><h2>{customer.nome}</h2><p>{customer.email || customer.telefone || "Contato não informado"}</p></div><button onClick={onClose}>×</button></header>
    <div className="crm-details__actions"><button onClick={onEdit}>Editar cliente</button></div>
    <nav className="crm-workspace-tabs"><button className={tab === "general" ? "active" : ""} onClick={() => setTab("general")}>Dados gerais</button><button className={tab === "contacts" ? "active" : ""} onClick={() => setTab("contacts")}>Contatos</button><button className={tab === "opportunities" ? "active" : ""} onClick={() => setTab("opportunities")}>Oportunidades / CRM ({opportunities.length})</button></nav>
    {tab !== "opportunities" && <section className="crm-detail-grid">{(tab === "general" ? general : contacts).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}</section>}
    {tab === "opportunities" && <section className="customer-opportunities">{loading ? <p>Carregando oportunidades...</p> : error ? <p>{error}</p> : opportunities.length ? opportunities.map((item) => <article key={item.id}><button type="button" onClick={() => onOpenOpportunity(item.id)}><small>{item.etapa} · {item.prioridade}</small><strong>{item.produtoInteresse || item.empresa || "Oportunidade comercial"}</strong><span>{money(item.valorEstimado)} · {item.vendedorResponsavel || "Sem responsável"}</span><span>Próximo retorno: {item.proximoContato || "não informado"}</span></button></article>) : <p>Nenhuma oportunidade vinculada a este cliente.</p>}</section>}
  </aside></div>;
}
