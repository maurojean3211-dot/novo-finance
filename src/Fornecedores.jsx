import { useCallback, useEffect, useMemo, useState } from "react";
import useCompanyScope from "./app/providers/useCompanyScope";
import { ActionButtons, EmptyState, FeedbackBanner, FilterBar, LoadingState, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import { supabase } from "./supabase";
import { confirmarAcao, dataAtualIso, formatarData } from "./utils";

export default function Fornecedores() {
  const { userId } = useCompanyScope();
  const [fornecedores, setFornecedores] = useState([]);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" });
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const carregarFornecedores = useCallback(async () => {
    if (!userId) { setCarregando(false); return; }
    const { data, error } = await supabase.from("fornecedores").select("*").eq("user_id", userId).order("data_cadastro", { ascending: false });
    if (error) setFeedback({ type: "error", message: "Erro ao carregar fornecedores." }); else setFornecedores(data || []);
    setCarregando(false);
  }, [userId]);

  useEffect(() => { const timer = window.setTimeout(() => carregarFornecedores(), 0); return () => window.clearTimeout(timer); }, [carregarFornecedores]);

  async function salvarFornecedor() {
    if (!form.nome.trim()) return setFeedback({ type: "error", message: "Informe o nome do fornecedor." });
    if (!userId) return setFeedback({ type: "error", message: "Usuário não carregado." });
    const { error } = await supabase.from("fornecedores").insert([{ nome: form.nome, telefone: form.telefone, email: form.email, data_cadastro: dataAtualIso(), user_id: userId }]);
    if (error) return setFeedback({ type: "error", message: "Erro ao salvar fornecedor." });
    setForm({ nome: "", telefone: "", email: "" }); setModalAberto(false); setFeedback({ type: "success", message: "Fornecedor salvo com sucesso." }); carregarFornecedores();
  }

  async function excluirFornecedor(id) {
    if (!confirmarAcao("Deseja excluir este fornecedor?")) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", id).eq("user_id", userId);
    if (error) return setFeedback({ type: "error", message: "Erro ao excluir fornecedor." });
    setFeedback({ type: "success", message: "Fornecedor excluído." }); carregarFornecedores();
  }

  const filtrados = useMemo(() => fornecedores.filter((item) => [item.nome, item.telefone, item.email].some((value) => String(value || "").toLowerCase().includes(busca.toLowerCase()))), [busca, fornecedores]);
  const comTelefone = fornecedores.filter((item) => item.telefone).length;
  const comEmail = fornecedores.filter((item) => item.email).length;

  return <main className="ops-page"><ModuleHeader eyebrow="Materiais e operações" title="Fornecedores" description="Rede de fornecimento vinculada ao usuário atual." actionLabel="Novo Fornecedor" onAction={() => setModalAberto(true)} />
    <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
    <MetricGrid items={[{ label: "Fornecedores", value: fornecedores.length, detail: "registros carregados", icon: "▦" }, { label: "Com telefone", value: comTelefone, detail: "contato disponível", icon: "☎", tone: "green" }, { label: "Com e-mail", value: comEmail, detail: "canal disponível", icon: "@" }]} />
    <FilterBar><input placeholder="Pesquisar nome, telefone ou e-mail" value={busca} onChange={(event) => setBusca(event.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Base de fornecedores</h2><span>{filtrados.length} resultado(s)</span></div>{carregando ? <LoadingState>Carregando fornecedores...</LoadingState> : filtrados.length === 0 ? <EmptyState title="Nenhum fornecedor encontrado" /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Fornecedor</th><th>Telefone</th><th>E-mail</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>{filtrados.map((item) => <tr key={item.id}><td><strong>{item.nome}</strong></td><td>{item.telefone || "—"}</td><td>{item.email || "—"}</td><td>{formatarData(item.data_cadastro)}</td><td><ActionButtons onDelete={() => excluirFornecedor(item.id)} /></td></tr>)}</tbody></table></div>}</section>
    {modalAberto && <OperationModal title="Novo fornecedor" onClose={() => setModalAberto(false)} onSubmit={salvarFornecedor} submitLabel="Salvar fornecedor" disabled={!userId}><label className="ops-field ops-field--wide"><span>Nome</span><input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></label><label className="ops-field"><span>Telefone</span><input value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} /></label><label className="ops-field"><span>E-mail</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></OperationModal>}
  </main>;
}
