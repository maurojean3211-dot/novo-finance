import { useMemo, useState } from "react";
import CustomerModal from "../../../components/customers/CustomerModal";
import useCompanyScope from "../../../app/providers/useCompanyScope";
import useCustomers from "../../../hooks/useCustomers";
import { createCustomerSnapshot, customerMatchesSearch, isCustomerInCompany } from "../../../services/customer.service";

const show = (value) => value || "Não informado";

export default function CustomerSelector({ selectedId, snapshot, onSelect }) {
  const { empresaId, ready } = useCompanyScope();
  const { customers, loading, error, save } = useCustomers(empresaId);
  const [search, setSearch] = useState("");
  const [modalCustomer, setModalCustomer] = useState(undefined);
  const filtered = useMemo(() => customers.filter((customer) => customerMatchesSearch(customer, search)), [customers, search]);
  const selected = customers.find((customer) => String(customer.id) === String(selectedId));
  const details = snapshot || createCustomerSnapshot(selected);

  function selectCustomer(customer) {
    if (!isCustomerInCompany(customer, empresaId)) return;
    onSelect(customer);
  }

  async function saveAndSelect(form, customerId) {
    const saved = await save(form, customerId);
    selectCustomer(saved);
  }

  return <section className="quote-customer-selector ops-panel">
    <div className="ops-panel__header"><div><h2>Cliente do orçamento</h2><span>Base central do CRM</span></div><button type="button" onClick={() => setModalCustomer(null)} disabled={!ready}>＋ Cadastrar novo cliente</button></div>
    <div className="quote-customer-selector__search"><input placeholder="Pesquisar nome, telefone, e-mail ou CPF/CNPJ" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={selectedId || ""} onChange={(event) => { const customer = customers.find((item) => String(item.id) === event.target.value); if (customer) selectCustomer(customer); }} disabled={loading || !ready}><option value="">Selecione um cliente</option>{filtered.map((customer) => <option key={customer.id} value={customer.id}>{customer.nome} · {customer.telefone || customer.email || "sem contato"}</option>)}</select></div>
    {error && <div className="quote-customer-selector__message">{error}</div>}
    {loading && <div className="quote-customer-selector__message">Carregando clientes da empresa...</div>}
    {details ? <div className="quote-customer-card"><div><small>Cliente</small><strong>{show(details.nome)}</strong><span>ID {show(details.clienteId)}</span></div><div><small>CPF/CNPJ</small><strong>{show(details.cpfCnpj)}</strong><span>{show(details.endereco)}</span></div><div><small>Contato</small><strong>{show(details.telefone)}</strong><span>{show(details.whatsapp)}</span></div><div><small>E-mail</small><strong>{show(details.email)}</strong><span>{[details.cidade, details.estado].filter(Boolean).join("/") || "Não informado"}</span></div><div><small>Responsáveis</small><strong>{show(details.contatoResponsavel)}</strong><span>Vendedor: {show(details.vendedorResponsavel)}</span></div>{selected && <button type="button" onClick={() => setModalCustomer(selected)}>Editar cliente</button>}</div> : <div className="quote-customer-selector__message">Pesquise e selecione um cliente cadastrado no CRM.</div>}
    {modalCustomer !== undefined && <CustomerModal customer={modalCustomer} onClose={() => setModalCustomer(undefined)} onSave={saveAndSelect} />}
  </section>;
}
