import { useEffect, useMemo, useState } from "react";
import { EmptyState, FilterBar, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import { supabase } from "./supabase";
import "./consolidation.css";

export default function ContasReceber({ empresaId }) {
  const [lista, setLista] = useState([]);
  const [pix, setPix] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [configurandoPix, setConfigurandoPix] = useState(false);

  function normalizarData(dataTexto) {
    if (!dataTexto) return new Date();
    const somenteData = dataTexto.toString().slice(0, 10);
    const partes = somenteData.split("-");
    if (partes.length === 3) return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return new Date(dataTexto);
  }

  async function carregar() {
    if (!empresaId) return;
    const { data } = await supabase.from("recebimentos").select("*").eq("empresa_id", empresaId);
    const { data: clientes } = await supabase.from("clientes").select("id, nome, telefone, whatsapp").eq("empresa_id", empresaId);
    const listaCompleta = (data || []).map((recebimento) => {
      const cliente = clientes?.find((item) => item.id === recebimento.cliente_id);
      return { ...recebimento, status_normalizado: String(recebimento.status || "").toLowerCase().trim(), cliente_nome: cliente?.nome || "Cliente", cliente_tel: cliente?.telefone || cliente?.whatsapp || "" };
    }).sort((a, b) => normalizarData(a.data_vencimento) - normalizarData(b.data_vencimento));
    setLista(listaCompleta);
  }

  async function carregarPix() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("usuarios").select("pix").eq("id", user.id).maybeSingle();
    setPix(data?.pix || "");
  }

  async function salvarPix() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("usuarios").update({ pix }).eq("id", user.id);
    if (error) return alert("Erro ao salvar PIX");
    setConfigurandoPix(false);
    alert("✅ PIX salvo!");
  }

  async function receber(recebimento) {
    if (!window.confirm("Confirmar pagamento?")) return;
    const { error } = await supabase.from("recebimentos").update({ status: "pago" }).eq("id", recebimento.id);
    if (error) return alert("Erro ao confirmar pagamento");
    const { data: existente } = await supabase.from("lancamentos").select("id").eq("recebimento_id", recebimento.id).maybeSingle();
    if (!existente) await supabase.from("lancamentos").insert([{ empresa_id: empresaId, cliente_id: recebimento.cliente_id, recebimento_id: recebimento.id, tipo: "receita", descricao: `Recebimento - ${recebimento.cliente_nome}`, valor: recebimento.valor, data: new Date(), status: "recebido" }]);
    await carregar();
    alert("✅ Pagamento confirmado!");
  }

  async function reabrir(id) {
    if (!window.confirm("Voltar para pendente?")) return;
    const { error } = await supabase.from("recebimentos").update({ status: "pendente" }).eq("id", id);
    if (error) return alert("Erro ao reabrir");
    await carregar();
    alert("🔄 Voltou para pendente!");
  }

  async function excluir(id) {
    if (!window.confirm("Excluir recebimento?")) return;
    await supabase.from("recebimentos").delete().eq("id", id);
    setLista((current) => current.filter((item) => item.id !== id));
  }

  function enviarWhatsapp(recebimento) {
    if (!pix) return alert("⚠ Cadastre o PIX primeiro!");
    let telefone = (recebimento.cliente_tel || "").replace(/\D/g, "");
    if (!telefone) return alert("Cliente sem telefone");
    if (!telefone.startsWith("55")) telefone = `55${telefone}`;
    const mensagem = `Olá ${recebimento.cliente_nome} 👋\n\n💰 Valor: R$ ${Number(recebimento.valor).toFixed(2)}\n\nPIX: ${pix}\n\nPode realizar o pagamento hoje?\nAguardo 👍`;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => carregarPix(), 0);
    return () => window.clearTimeout(timer);
  }, []); // A carga permanece vinculada à montagem, como no componente legado.
  useEffect(() => {
    if (!empresaId) return undefined;
    const timer = window.setTimeout(() => carregar(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]); // Recarrega somente quando a empresa ativa muda.

  const filtrados = useMemo(() => lista.filter((item) => item.cliente_nome.toLowerCase().includes(busca.toLowerCase())).filter((item) => { const vencimento = item.data_vencimento?.toString().slice(0, 10); return (!dataInicio || vencimento >= dataInicio) && (!dataFim || vencimento <= dataFim); }), [busca, dataFim, dataInicio, lista]);
  const pendentes = lista.filter((item) => item.status_normalizado !== "pago");
  const recebidos = lista.filter((item) => item.status_normalizado === "pago");
  const total = (items) => items.reduce((sum, item) => sum + Number(item.valor || 0), 0);

  return <main className="ops-page"><ModuleHeader eyebrow="Financeiro empresarial" title="Contas a Receber" description="Títulos, vencimentos, baixas e comunicação de cobrança." actionLabel="Configurações Financeiras" onAction={() => setConfigurandoPix(true)} />
    <MetricGrid items={[{ label: "Títulos pendentes", value: pendentes.length, detail: "aguardando baixa", icon: "▤", tone: "amber" }, { label: "Valor pendente", value: total(pendentes).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), detail: "saldo em aberto", icon: "R$" }, { label: "Títulos recebidos", value: recebidos.length, detail: "baixados", icon: "✓", tone: "green" }, { label: "Valor recebido", value: total(recebidos).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), detail: "total confirmado", icon: "R$", tone: "green" }]} />
    <FilterBar><input placeholder="Pesquisar cliente" value={busca} onChange={(event) => setBusca(event.target.value)} /><input type="date" aria-label="Data inicial" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} /><input type="date" aria-label="Data final" value={dataFim} onChange={(event) => setDataFim(event.target.value)} /></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Títulos e recebimentos</h2><span>{filtrados.length} resultado(s)</span></div>{filtrados.length === 0 ? <EmptyState title="Nenhum título encontrado" /> : <div className="ops-table-wrap"><table className="ops-table receivables-table"><thead><tr><th>Cliente</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtrados.map((item) => { const hoje = new Date(); hoje.setHours(0, 0, 0, 0); const vencimento = normalizarData(item.data_vencimento); vencimento.setHours(0, 0, 0, 0); const diff = Math.ceil((vencimento - hoje) / 86400000); const aviso = item.status_normalizado === "pago" ? "Pago" : diff < 0 ? "Atrasado" : diff === 0 ? "Vence hoje" : diff <= 3 ? `Vence em ${diff} dia(s)` : `Faltam ${diff} dia(s)`; return <tr key={item.id}><td><strong>{item.cliente_nome}</strong><small>{item.cliente_tel || "Sem telefone"}</small></td><td>{vencimento.toLocaleDateString("pt-BR")}</td><td>{Number(item.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td><span className={`receivable-status ${item.status_normalizado === "pago" ? "paid" : diff < 0 ? "late" : "pending"}`}>{aviso}</span></td><td><div className="receivable-actions"><button onClick={() => enviarWhatsapp(item)}>WhatsApp</button>{item.status_normalizado === "pago" ? <button onClick={() => reabrir(item.id)}>Reabrir</button> : <button onClick={() => receber(item)}>Receber</button>}<button className="danger" onClick={() => excluir(item.id)}>Excluir</button></div></td></tr>; })}</tbody></table></div>}</section>
    {configurandoPix && <OperationModal title="Configurações Financeiras" onClose={() => setConfigurandoPix(false)} onSubmit={salvarPix} submitLabel="Salvar PIX"><label className="ops-field ops-field--wide"><span>Chave PIX da empresa</span><input value={pix} onChange={(event) => setPix(event.target.value)} placeholder="Informe a chave PIX" /></label><div className="ops-preview">A chave permanece armazenada no mesmo campo e é usada nas mensagens de cobrança por WhatsApp.</div></OperationModal>}
  </main>;
}
