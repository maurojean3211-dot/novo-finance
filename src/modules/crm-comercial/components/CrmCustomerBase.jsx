import { useEffect, useMemo, useState } from "react";
import { ActionButtons, EmptyState, FilterBar, MetricGrid, OperationModal } from "../../../components/operations/OperationsUI";
import { supabase } from "../../../supabase";

export default function CrmCustomerBase() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [empresaId, setEmpresaId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  async function carregarClientes(id) {
    const { data, error } = await supabase.from("clientes").select("*").eq("empresa_id", id).order("created_at", { ascending: false });
    if (error) return console.error("Erro ao carregar clientes:", error);
    setClientes(data || []);
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

  async function salvarCliente() {
    if (!empresaId) return alert("Empresa não carregada. Faça logout e login novamente.");
    if (!nome.trim()) return alert("Digite o nome do cliente");
    const payload = { nome: nome.trim(), telefone, email: email || null };
    const { error } = editandoId
      ? await supabase.from("clientes").update(payload).eq("id", editandoId).eq("empresa_id", empresaId)
      : await supabase.from("clientes").insert([{ ...payload, empresa_id: empresaId }]);
    if (error) return alert(`Erro ao salvar cliente:\n\n${error.message}`);
    setNome(""); setTelefone(""); setEmail(""); setEditandoId(null); setModalAberto(false);
    await carregarClientes(empresaId);
  }

  async function excluirCliente(id) {
    if (!window.confirm("Excluir cliente?")) return;
    await supabase.from("clientes").delete().eq("id", id).eq("empresa_id", empresaId);
    setClientes((current) => current.filter((cliente) => cliente.id !== id));
  }

  function editarCliente(cliente) {
    setEditandoId(cliente.id);
    setNome(cliente.nome || "");
    setTelefone(cliente.telefone || "");
    setEmail(cliente.email || "");
    setModalAberto(true);
  }

  function abrirCadastro() {
    setEditandoId(null); setNome(""); setTelefone(""); setEmail(""); setModalAberto(true);
  }

  const filtrados = useMemo(() => clientes.filter((cliente) => [cliente.nome, cliente.telefone, cliente.email].some((value) => String(value || "").toLowerCase().includes(busca.toLowerCase()))), [busca, clientes]);
  if (carregando) return <div className="ops-status-panel">Carregando empresas e contatos...</div>;
  return <section className="crm-customer-base"><div className="crm-subheader"><div><small>Relacionamentos persistentes</small><h2>Empresas e contatos</h2><p>Cadastro central incorporado ao CRM, preservando as consultas atuais.</p></div><button onClick={abrirCadastro}>＋ Novo cliente</button></div>
    <MetricGrid items={[{ label: "Clientes cadastrados", value: clientes.length, detail: "base comercial", icon: "◎" }, { label: "Com telefone", value: clientes.filter((item) => item.telefone).length, detail: "contato disponível", icon: "☎", tone: "green" }, { label: "Com e-mail", value: clientes.filter((item) => item.email).length, detail: "canal disponível", icon: "@" }]} />
    <FilterBar><input placeholder="Pesquisar nome, telefone ou e-mail" value={busca} onChange={(event) => setBusca(event.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Base de clientes</h2><span>{filtrados.length} resultado(s)</span></div>{filtrados.length === 0 ? <EmptyState title="Nenhum cliente encontrado" /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Empresa ou cliente</th><th>Telefone</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>{filtrados.map((cliente) => <tr key={cliente.id}><td><strong>{cliente.nome}</strong></td><td>{cliente.telefone || "—"}</td><td>{cliente.email || "—"}</td><td><ActionButtons onEdit={() => editarCliente(cliente)} onDelete={() => excluirCliente(cliente.id)} /></td></tr>)}</tbody></table></div>}</section>
    {modalAberto && <OperationModal title={editandoId ? "Editar cliente" : "Novo cliente"} editing={Boolean(editandoId)} onClose={() => setModalAberto(false)} onSubmit={salvarCliente} submitLabel={editandoId ? "Salvar alterações" : "Salvar cliente"}><label className="ops-field"><span>Nome</span><input value={nome} onChange={(event) => setNome(event.target.value)} /></label><label className="ops-field"><span>Telefone</span><input value={telefone} onChange={(event) => setTelefone(event.target.value)} /></label><label className="ops-field ops-field--wide"><span>E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></OperationModal>}
  </section>;
}
