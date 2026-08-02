import { useEffect, useMemo, useState } from "react";
import { ActionButtons, EmptyState, FilterBar, MetricGrid } from "../../../components/operations/OperationsUI";
import { supabase } from "../../../supabase";
import CustomerModal from "../../../components/customers/CustomerModal";
import { customerMatchesSearch, deleteCustomer, listCustomers, saveCustomer } from "../../../services/customer.service";

export default function CrmCustomerBase() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [empresaId, setEmpresaId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modalCustomer, setModalCustomer] = useState(undefined);

  async function carregarClientes(id) {
    try { setClientes(await listCustomers(id)); } catch (error) { console.error("Erro ao carregar clientes:", error); }
  }

  async function iniciar() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: empresa, error } = await supabase.from("empresas").select("id, name, user_id").eq("user_id", user.id).maybeSingle();
      if (error || !empresa) return alert("Empresa não encontrada para este usuário.");
      setEmpresaId(empresa.id);
      await carregarClientes(empresa.id);
    } catch (error) {
      console.error("Erro ao iniciar clientes no CRM:", error);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => iniciar(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvarCliente(customer, customerId) {
    await saveCustomer({ empresaId, customerId, customer });
    await carregarClientes(empresaId);
  }

  async function excluirCliente(id) {
    if (!window.confirm("Excluir cliente?")) return;
    await deleteCustomer({ empresaId, customerId: id });
    setClientes((current) => current.filter((cliente) => cliente.id !== id));
  }

  function editarCliente(cliente) {
    setModalCustomer(cliente);
  }

  function abrirCadastro() {
    setModalCustomer(null);
  }

  const filtrados = useMemo(() => clientes.filter((cliente) => customerMatchesSearch(cliente, busca)), [busca, clientes]);
  if (carregando) return <div className="ops-status-panel">Carregando empresas e contatos...</div>;
  return <section className="crm-customer-base"><div className="crm-subheader"><div><small>Relacionamentos persistentes</small><h2>Empresas e contatos</h2><p>Cadastro central incorporado ao CRM, preservando as consultas atuais.</p></div><button onClick={abrirCadastro}>＋ Novo cliente</button></div>
    <MetricGrid items={[{ label: "Clientes cadastrados", value: clientes.length, detail: "base comercial", icon: "◎" }, { label: "Com telefone", value: clientes.filter((item) => item.telefone).length, detail: "contato disponível", icon: "☎", tone: "green" }, { label: "Com e-mail", value: clientes.filter((item) => item.email).length, detail: "canal disponível", icon: "@" }]} />
    <FilterBar><input placeholder="Pesquisar nome, telefone ou e-mail" value={busca} onChange={(event) => setBusca(event.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Base de clientes</h2><span>{filtrados.length} resultado(s)</span></div>{filtrados.length === 0 ? <EmptyState title="Nenhum cliente encontrado" /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Empresa ou cliente</th><th>Telefone</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>{filtrados.map((cliente) => <tr key={cliente.id}><td><strong>{cliente.nome}</strong></td><td>{cliente.telefone || "—"}</td><td>{cliente.email || "—"}</td><td><ActionButtons onEdit={() => editarCliente(cliente)} onDelete={() => excluirCliente(cliente.id)} /></td></tr>)}</tbody></table></div>}</section>
    {modalCustomer !== undefined && <CustomerModal customer={modalCustomer} onClose={() => setModalCustomer(undefined)} onSave={salvarCliente} />}
  </section>;
}
