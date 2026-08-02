import { useCallback, useEffect, useMemo, useState } from "react";
import useCompanyScope from "./app/providers/useCompanyScope";
import { ActionButtons, EmptyState, FeedbackBanner, FilterBar, LoadingState, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import { supabase } from "./supabase";
import { confirmarAcao, dataAtualIso, formatarData, formatarMoeda } from "./utils";

export default function Produtos() {
  const { empresaId, userId, ready } = useCompanyScope();
  const [produtos, setProdutos] = useState([]);
  const [nome, setNome] = useState("");
  const [comissao, setComissao] = useState("0.05");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const carregarProdutos = useCallback(async () => {
    if (!empresaId) { setCarregando(false); return; }
    const { data, error } = await supabase.from("produtos").select("*").eq("empresa_id", empresaId).order("data_cadastro", { ascending: false });
    if (error) setFeedback({ type: "error", message: error.message }); else setProdutos(data || []);
    setCarregando(false);
  }, [empresaId]);

  useEffect(() => { const timer = window.setTimeout(() => carregarProdutos(), 0); return () => window.clearTimeout(timer); }, [carregarProdutos]);

  function alterarNome(valor) {
    setNome(valor);
    const texto = valor.toLowerCase();
    if (texto.includes("cavaco")) setComissao("0.07");
    else if (texto.includes("sucata")) setComissao("0.05");
  }

  async function salvarProduto() {
    if (!nome.trim()) return setFeedback({ type: "error", message: "Informe o nome do produto." });
    if (!ready) return setFeedback({ type: "error", message: "Empresa ou usuário não carregado." });
    const { error } = await supabase.from("produtos").insert([{ empresa_id: empresaId, nome: nome.trim(), comissao: Number(comissao), data_cadastro: dataAtualIso(), user_id: userId }]);
    if (error) return setFeedback({ type: "error", message: error.message });
    setNome(""); setComissao("0.05"); setModalAberto(false); setFeedback({ type: "success", message: "Produto salvo com sucesso." });
    carregarProdutos();
  }

  async function excluirProduto(id) {
    if (!confirmarAcao("Excluir produto?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id).eq("empresa_id", empresaId);
    if (error) return setFeedback({ type: "error", message: "Erro ao excluir produto." });
    setFeedback({ type: "success", message: "Produto excluído." }); carregarProdutos();
  }

  const filtrados = useMemo(() => produtos.filter((produto) => String(produto.nome || "").toLowerCase().includes(busca.toLowerCase())), [busca, produtos]);
  const cavaco = produtos.filter((produto) => Number(produto.comissao) === 0.07).length;

  return <main className="ops-page"><ModuleHeader eyebrow="Materiais e operações" title="Produtos" description="Cadastro de produtos e regras atuais de comissão." actionLabel="Novo Produto" onAction={() => setModalAberto(true)} />
    <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
    <MetricGrid items={[{ label: "Produtos cadastrados", value: produtos.length, detail: "base da empresa", icon: "▦" }, { label: "Produtos padrão", value: produtos.length - cavaco, detail: "R$ 0,05/kg", icon: "R$", tone: "green" }, { label: "Cavaco", value: cavaco, detail: "R$ 0,07/kg", icon: "%", tone: "amber" }]} />
    <FilterBar><input placeholder="Pesquisar produto" value={busca} onChange={(event) => setBusca(event.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Catálogo operacional</h2><span>{filtrados.length} resultado(s)</span></div>{carregando ? <LoadingState>Carregando produtos...</LoadingState> : filtrados.length === 0 ? <EmptyState title="Nenhum produto encontrado" /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Produto</th><th>Data de cadastro</th><th>Comissão</th><th>Ações</th></tr></thead><tbody>{filtrados.map((produto) => <tr key={produto.id}><td><strong>{produto.nome}</strong></td><td>{formatarData(produto.data_cadastro)}</td><td>{formatarMoeda(produto.comissao)} / kg</td><td><ActionButtons onDelete={() => excluirProduto(produto.id)} /></td></tr>)}</tbody></table></div>}</section>
    {modalAberto && <OperationModal title="Novo produto" onClose={() => setModalAberto(false)} onSubmit={salvarProduto} submitLabel="Salvar produto" disabled={!ready}><label className="ops-field ops-field--wide"><span>Nome do produto</span><input placeholder="Ex: Sucata Latinha ou Cavaco" value={nome} onChange={(event) => alterarNome(event.target.value)} /></label><label className="ops-field ops-field--wide"><span>Comissão atual</span><select value={comissao} onChange={(event) => setComissao(event.target.value)}><option value="0.05">Sucata — R$ 0,05/kg</option><option value="0.07">Cavaco — R$ 0,07/kg</option></select></label><div className="ops-preview">A seleção preserva exatamente a regra existente de comissão por quilo.</div></OperationModal>}
  </main>;
}
