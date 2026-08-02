import { useEffect, useState } from "react";
import { createSaleWithReceivables } from "../../services/commercialFlow.service";
import { supabase } from "../../supabase";
import { OperationModal } from "./OperationsUI";

export default function InstallmentSaleModal({ empresaId, onClose, onSaved, commissionNote }) {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [novoCliente, setNovoCliente] = useState(false);
  const [nome, setNome] = useState(""); const [telefone, setTelefone] = useState(""); const [email, setEmail] = useState("");
  const [produto, setProduto] = useState(""); const [quantidade, setQuantidade] = useState(1); const [valor, setValor] = useState("");
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().slice(0, 10)); const [parcelas, setParcelas] = useState(1); const [intervalo, setIntervalo] = useState(30); const [salvando, setSalvando] = useState(false);

  async function carregarClientes() { if (!empresaId) return; const { data, error } = await supabase.from("clientes").select("id, nome, telefone, email").eq("empresa_id", empresaId).order("created_at", { ascending: false }); if (error) return alert(`Erro ao carregar clientes: ${error.message}`); setClientes(data || []); }
  useEffect(() => {
    const timer = window.setTimeout(() => carregarClientes(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function obterClienteId() { if (!novoCliente) return clienteId; if (!nome.trim()) return null; const { data, error } = await supabase.from("clientes").insert([{ nome: nome.trim(), telefone, email: email || null, empresa_id: empresaId }]).select().single(); if (error) throw error; return data.id; }
  async function salvar() { if (!empresaId) return alert("Empresa não carregada"); if ((!novoCliente && !clienteId) || (novoCliente && !nome.trim())) return alert("Selecione ou cadastre o cliente"); if (!produto.trim()) return alert("Informe o produto"); if (Number(quantidade) <= 0 || Number(valor) <= 0) return alert("Informe quantidade e valor corretamente"); setSalvando(true); try { const id = await obterClienteId(); const result = await createSaleWithReceivables({ empresaId, clienteId: id, produto, quantidade, valor, dataVenda, parcelas, intervalo }); if (result.error) return alert(`Erro ao criar venda ou recebimentos: ${result.error.message}`); alert("✅ Venda parcelada e recebimentos criados!"); await onSaved?.(); onClose(); } catch (error) { alert(`Erro ao concluir fluxo parcelado: ${error.message}`); } finally { setSalvando(false); } }

  return <OperationModal title="Venda parcelada" onClose={onClose} onSubmit={salvar} submitLabel={salvando ? "Salvando..." : "Salvar venda e recebíveis"} disabled={salvando || !empresaId}>
    <label className="ops-field ops-field--wide"><span>Cliente</span><select value={novoCliente ? "__novo__" : clienteId} onChange={(event) => { setNovoCliente(event.target.value === "__novo__"); setClienteId(event.target.value === "__novo__" ? "" : event.target.value); }}><option value="">Selecione o cliente</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}<option value="__novo__">＋ Cadastrar novo cliente</option></select></label>
    {novoCliente && <><label className="ops-field"><span>Nome</span><input value={nome} onChange={(event) => setNome(event.target.value)} /></label><label className="ops-field"><span>Telefone</span><input value={telefone} onChange={(event) => setTelefone(event.target.value)} /></label><label className="ops-field ops-field--wide"><span>E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></>}
    <label className="ops-field"><span>Produto</span><input value={produto} onChange={(event) => setProduto(event.target.value)} /></label><label className="ops-field"><span>Quantidade</span><input type="number" value={quantidade} onChange={(event) => setQuantidade(event.target.value)} /></label><label className="ops-field"><span>Valor unitário</span><input type="number" value={valor} onChange={(event) => setValor(event.target.value)} /></label><label className="ops-field"><span>Data da venda</span><input type="date" value={dataVenda} onChange={(event) => setDataVenda(event.target.value)} /></label><label className="ops-field"><span>Número de parcelas</span><input type="number" min="1" value={parcelas} onChange={(event) => setParcelas(event.target.value)} /></label><label className="ops-field"><span>Intervalo entre vencimentos</span><input type="number" min="1" value={intervalo} onChange={(event) => setIntervalo(event.target.value)} /></label>
    <div className="ops-preview"><strong>Comissão:</strong> {commissionNote}<br/><strong>Recebíveis:</strong> {Number(parcelas) || 1} parcela(s), a cada {Number(intervalo) || 30} dias.</div>
  </OperationModal>;
}
