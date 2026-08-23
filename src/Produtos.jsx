import { useCallback, useEffect, useMemo, useState } from "react";
import useCompanyScope from "./app/providers/useCompanyScope";
import { ActionButtons, EmptyState, FeedbackBanner, FilterBar, LoadingState, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import { supabase } from "./supabase";
import { confirmarAcao, dataAtualIso, formatarData } from "./utils";
import { COMMISSION_TYPES, getCommissionRule, getCommissionRuleLabel } from "./services/commissionEngine";

export default function Produtos() {
  const { empresaId, userId, ready } = useCompanyScope();
  const [produtos, setProdutos] = useState([]);
  const [nome, setNome] = useState("");
  const [comissao, setComissao] = useState("0.05");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
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
    const regra = getCommissionRule(valor);
    setComissao(regra.type === COMMISSION_TYPES.PERCENT_SALE ? "0" : String(regra.rate));
  }

  async function salvarProduto() {
    if (!nome.trim()) return setFeedback({ type: "error", message: "Informe o nome do produto." });
    if (!ready) return setFeedback({ type: "error", message: "Empresa ou usuário não carregado." });
    const payload = { nome: nome.trim(), comissao: Number(comissao) };
    const { error } = editandoId
      ? await supabase.from("produtos").update(payload).eq("id", editandoId).eq("empresa_id", empresaId)
      : await supabase.from("produtos").insert([{ empresa_id: empresaId, ...payload, preco: 0, data_cadastro: dataAtualIso(), user_id: userId }]);
    if (error) return setFeedback({ type: "error", message: error.message });
    setNome(""); setComissao("0.05"); setEditandoId(null); setModalAberto(false); setFeedback({ type: "success", message: editandoId ? "Produto atualizado com sucesso." : "Produto salvo com sucesso." });
    carregarProdutos();
  }

  function editarProduto(produto) {
    setEditandoId(produto.id);
    setNome(produto.nome || "");
    setComissao(String(produto.comissao ?? getCommissionRule(produto.nome).rate));
    setModalAberto(true);
  }

  async function excluirProduto(id) {
    if (!confirmarAcao("Excluir produto?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id).eq("empresa_id", empresaId);
    if (error) return setFeedback({ type: "error", message: "Erro ao excluir produto." });
    setFeedback({ type: "success", message: "Produto excluído." }); carregarProdutos();
  }

  const filtrados = useMemo(() => produtos.filter((produto) => String(produto.nome || "").toLowerCase().includes(busca.toLowerCase())), [busca, produtos]);
  const porKg = produtos.filter((produto) => getCommissionRule(produto.nome, produto.comissao).type === COMMISSION_TYPES.PER_KG).length;
  const percentuais = produtos.length - porKg;

  return <main className="ops-page"><ModuleHeader eyebrow="Materiais e operações" title="Produtos" description="Cadastro de produtos e regras atuais de comissão." actionLabel="Novo Produto" onAction={() => { setEditandoId(null); setNome(""); setComissao("0.05"); setModalAberto(true); }} />
    <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
    <MetricGrid items={[{ label: "Produtos cadastrados", value: produtos.length, detail: "base da empresa", icon: "▦" }, { label: "Comissão por kg", value: porKg, detail: "regra por peso", icon: "R$", tone: "green" }, { label: "Percentual", value: percentuais, detail: "sobre o valor da venda", icon: "%", tone: "amber" }]} />
    <FilterBar><input placeholder="Pesquisar produto" value={busca} onChange={(event) => setBusca(event.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Catálogo operacional</h2><span>{filtrados.length} resultado(s)</span></div>{carregando ? <LoadingState>Carregando produtos...</LoadingState> : filtrados.length === 0 ? <EmptyState title="Nenhum produto encontrado" /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Produto</th><th>Data de cadastro</th><th>Tipo da comissão</th><th>Regra</th><th>Ações</th></tr></thead><tbody>{filtrados.map((produto) => { const regra = getCommissionRule(produto.nome, produto.comissao); return <tr key={produto.id}><td><strong>{produto.nome}</strong></td><td>{formatarData(produto.data_cadastro)}</td><td>{regra.type === COMMISSION_TYPES.PERCENT_SALE ? "Percentual" : "Por kg"}</td><td>{getCommissionRuleLabel(produto.nome, produto.comissao)}</td><td><ActionButtons onEdit={() => editarProduto(produto)} onDelete={() => excluirProduto(produto.id)} /></td></tr>; })}</tbody></table></div>}</section>
    {modalAberto && <OperationModal title={editandoId ? "Editar produto" : "Novo produto"} editing={Boolean(editandoId)} onClose={() => setModalAberto(false)} onSubmit={salvarProduto} submitLabel={editandoId ? "Salvar alterações" : "Salvar produto"} disabled={!ready}><label className="ops-field ops-field--wide"><span>Nome do produto</span><input placeholder="Ex: Tarugo, Cavaco, Limalha ou Perfil" value={nome} onChange={(event) => alterarNome(event.target.value)} /></label>{getCommissionRule(nome).type === COMMISSION_TYPES.PER_KG ? <label className="ops-field ops-field--wide"><span>Valor por kg</span><input type="number" min="0" step="0.01" value={comissao} onChange={(event) => setComissao(event.target.value)} /></label> : <div className="ops-preview">Perfil utiliza percentual livre sobre o valor total, informado no momento da venda.</div>}<div className="ops-preview"><strong>Regra:</strong> {getCommissionRuleLabel(nome, comissao)}</div></OperationModal>}
  </main>;
}
