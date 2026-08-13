import { useEffect, useMemo, useState } from "react";
import { ActionButtons, EmptyState, FilterBar, MetricGrid } from "../../../components/operations/OperationsUI";
import CustomerModal from "../../../components/customers/CustomerModal";
import useCustomers from "../../../hooks/useCustomers";
import { customerMatchesSearch } from "../../../services/customer.service";
import CustomerDetails from "./CustomerDetails";

export default function CrmCustomerBase({ empresaId, initialCustomerId, onInitialCustomerOpen, onOpenOpportunity }) {
  const data = useCustomers(empresaId);
  const [busca, setBusca] = useState("");
  const [modalCustomer, setModalCustomer] = useState(undefined);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (!initialCustomerId || data.loading) return;
    const customer=data.customers.find((item)=>String(item.id)===String(initialCustomerId));
    if(customer) queueMicrotask(()=>{setSelected(customer);onInitialCustomerOpen?.();});
  }, [data.customers, data.loading, initialCustomerId, onInitialCustomerOpen]);

  async function salvarCliente(customer, customerId) {
    await data.save(customer, customerId);
  }

  async function excluirCliente(id) {
    if (!window.confirm("Excluir cliente?")) return;
    await data.remove(id);
  }

  function editarCliente(cliente) {
    setModalCustomer(cliente);
  }

  function abrirCadastro() {
    setModalCustomer(null);
  }

  const filtrados = useMemo(() => data.customers.filter((cliente) => customerMatchesSearch(cliente, busca)), [busca, data.customers]);
  if (data.loading) return <div className="ops-status-panel">Carregando clientes...</div>;
  return <section className="crm-customer-base"><div className="crm-subheader"><div><small>Cadastro permanente</small><h2>Clientes</h2><p>Dados cadastrais e relacionamento comercial, separados do funil de oportunidades.</p></div><button onClick={abrirCadastro}>＋ Novo cliente</button></div>
    {data.error && <div className="ops-status-panel">{data.error}</div>}
    <MetricGrid items={[{ label: "Clientes cadastrados", value: data.customers.length, detail: "base permanente", icon: "◎" }, { label: "Com telefone", value: data.customers.filter((item) => item.telefone).length, detail: "contato disponível", icon: "☎", tone: "green" }, { label: "Com e-mail", value: data.customers.filter((item) => item.email).length, detail: "canal disponível", icon: "@" }]} />
    <FilterBar><input placeholder="Pesquisar nome, telefone ou e-mail" value={busca} onChange={(event) => setBusca(event.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Base de clientes</h2><span>{filtrados.length} resultado(s)</span></div>{filtrados.length === 0 ? <EmptyState title="Nenhum cliente encontrado" /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Cliente</th><th>Contato</th><th>Localidade</th><th>Ações</th></tr></thead><tbody>{filtrados.map((cliente) => <tr key={cliente.id}><td><strong>{cliente.nome}</strong><small>{cliente.cpf_cnpj || cliente.cpf || cliente.cnpj || "Documento não informado"}</small></td><td>{cliente.telefone || cliente.whatsapp || "—"}<small>{cliente.email || "E-mail não informado"}</small></td><td>{[cliente.cidade, cliente.estado].filter(Boolean).join("/") || cliente.endereco || "—"}</td><td><button type="button" onClick={() => setSelected(cliente)}>Visualizar</button> <ActionButtons onEdit={() => editarCliente(cliente)} onDelete={() => excluirCliente(cliente.id)} /></td></tr>)}</tbody></table></div>}</section>
    {modalCustomer !== undefined && <CustomerModal customer={modalCustomer} onClose={() => setModalCustomer(undefined)} onSave={salvarCliente} />}
    {selected && <CustomerDetails customer={selected} empresaId={empresaId} onClose={() => setSelected(null)} onEdit={() => { setModalCustomer(selected); setSelected(null); }} onOpenOpportunity={onOpenOpportunity} />}
  </section>;
}
