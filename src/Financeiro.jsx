import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ActionButtons, EmptyState, FeedbackBanner, FilterBar, LoadingState, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import { supabase } from "./supabase";
import { confirmarAcao, formatarData, formatarMoeda } from "./utils";

export default function Financeiro({ empresaId }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pixAtual, setPixAtual] = useState(null);
  const [pixChave, setPixChave] = useState("");
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("Todos");
  const [feedback, setFeedback] = useState(null);

  const buscarPix = useCallback(async () => {
    if (!empresaId) return;
    const { data, error } = await supabase.from("empresas").select("pix_chave").eq("id", empresaId).single();
    if (error) setFeedback({ type: "error", message: "Não foi possível carregar a chave PIX." }); else setPixChave(String(data?.pix_chave || ""));
  }, [empresaId]);

  const carregarLancamentos = useCallback(async () => {
    if (!empresaId) { setCarregando(false); return; }
    const { data, error } = await supabase.from("lancamentos").select("*").eq("empresa_id", empresaId).order("data_lancamento", { ascending: false });
    if (error) setFeedback({ type: "error", message: "Erro ao carregar lançamentos." }); else setLancamentos(data || []);
    setCarregando(false);
  }, [empresaId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { buscarPix(); carregarLancamentos(); }, 0);
    return () => window.clearTimeout(timer);
  }, [buscarPix, carregarLancamentos]);

  async function excluir(id) {
    if (!confirmarAcao("Excluir lançamento?")) return;
    const { error } = await supabase.from("lancamentos").delete().eq("id", id).eq("empresa_id", empresaId);
    if (error) return setFeedback({ type: "error", message: "Erro ao excluir lançamento." });
    setFeedback({ type: "success", message: "Lançamento excluído." }); carregarLancamentos();
  }

  function gerarCodigoPix(valor) {
    if (!pixChave) return "";
    const campo = (id, value) => id + value.length.toString().padStart(2, "0") + value;
    let payload = "000201010212" + campo("26", campo("00", "BR.GOV.BCB.PIX") + campo("01", pixChave)) + campo("52", "0000") + campo("53", "986") + campo("54", Number(valor || 0).toFixed(2)) + campo("58", "BR") + campo("59", "CUNHA") + campo("60", "ITATIBA") + campo("62", campo("05", "***"));
    let crc = 0xFFFF;
    const source = payload + "6304";
    for (let c = 0; c < source.length; c += 1) { crc ^= source.charCodeAt(c) << 8; for (let i = 0; i < 8; i += 1) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1; }
    crc &= 0xFFFF;
    payload += "6304" + crc.toString(16).toUpperCase().padStart(4, "0");
    return payload;
  }

  async function copiarPix(valor) {
    const codigo = gerarCodigoPix(valor);
    if (!codigo) return setFeedback({ type: "error", message: "Chave PIX não configurada." });
    try { await navigator.clipboard.writeText(codigo); setFeedback({ type: "success", message: "Código PIX copiado." }); }
    catch { setFeedback({ type: "error", message: "Não foi possível copiar o código PIX." }); }
  }

  const filtrados = useMemo(() => lancamentos.filter((item) => [item.descricao, item.tipo].some((value) => String(value || "").toLowerCase().includes(busca.toLowerCase())) && (tipo === "Todos" || item.tipo === tipo)), [busca, lancamentos, tipo]);
  const receitas = lancamentos.filter((item) => item.tipo === "receita");
  const despesas = lancamentos.filter((item) => item.tipo !== "receita");
  const total = (items) => items.reduce((sum, item) => sum + Number(item.valor || 0), 0);

  return <main className="ops-page"><ModuleHeader eyebrow="Financeiro empresarial" title="Fluxo de Caixa" description="Entradas, saídas, saldo e cobrança PIX da empresa." />
    <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
    <MetricGrid items={[{ label: "Entradas", value: formatarMoeda(total(receitas)), detail: `${receitas.length} lançamento(s)`, icon: "↗", tone: "green" }, { label: "Saídas", value: formatarMoeda(total(despesas)), detail: `${despesas.length} lançamento(s)`, icon: "↘", tone: "amber" }, { label: "Saldo", value: formatarMoeda(total(receitas) - total(despesas)), detail: "resultado atual", icon: "R$", tone: total(receitas) >= total(despesas) ? "green" : "rose" }, { label: "Lançamentos", value: lancamentos.length, detail: "registros carregados", icon: "▤" }]} />
    <FilterBar><input placeholder="Pesquisar descrição ou tipo" value={busca} onChange={(event) => setBusca(event.target.value)} /><select value={tipo} onChange={(event) => setTipo(event.target.value)}><option>Todos</option><option value="receita">Receita</option><option value="despesa">Despesa</option></select></FilterBar>
    <section className="ops-panel"><div className="ops-panel__header"><h2>Lançamentos financeiros</h2><span>{filtrados.length} resultado(s)</span></div>{carregando ? <LoadingState>Carregando fluxo de caixa...</LoadingState> : filtrados.length === 0 ? <EmptyState title="Nenhum lançamento encontrado" /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>PIX</th><th>Ações</th></tr></thead><tbody>{filtrados.map((item) => <tr key={item.id}><td>{formatarData(item.data_lancamento)}</td><td><span className={`receivable-status ${item.tipo === "receita" ? "paid" : "pending"}`}>{item.tipo}</span></td><td><strong>{item.descricao || "—"}</strong></td><td>{formatarMoeda(item.valor)}</td><td>{item.tipo === "receita" ? <button onClick={() => setPixAtual(item)}>Gerar PIX</button> : "—"}</td><td><ActionButtons onDelete={() => excluir(item.id)} /></td></tr>)}</tbody></table></div>}</section>
    {pixAtual && <OperationModal title="Pagamento PIX" onClose={() => setPixAtual(null)} onSubmit={() => copiarPix(Number(pixAtual.valor))} submitLabel="Copiar código PIX"><div className="ops-preview"><strong>{pixAtual.descricao || "Recebimento"}</strong><br />{formatarMoeda(pixAtual.valor)}</div><div className="ops-field ops-field--wide" style={{ display: "grid", placeItems: "center" }}><QRCodeCanvas value={gerarCodigoPix(Number(pixAtual.valor)) || "PIX"} size={200} /></div><label className="ops-field ops-field--wide"><span>Código PIX</span><textarea value={gerarCodigoPix(Number(pixAtual.valor))} readOnly /></label></OperationModal>}
  </main>;
}
