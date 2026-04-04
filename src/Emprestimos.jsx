import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista({ empresaId }) {

  const [dados, setDados] = useState([]);
  const [aba, setAba] = useState("lista");

  const [editandoId, setEditandoId] = useState(null);

  // FORM
  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [valor, setValor] = useState("");
  const [total, setTotal] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  useEffect(()=>{
    if(empresaId){
      carregar();
    }
  },[empresaId]);

  async function carregar(){
    const { data, error } = await supabase
      .from("emprestimos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data_vencimento", { ascending: true });

    if(error){
      alert("Erro ao carregar");
      return;
    }

    setDados(data || []);
  }

  // ✅ CORREÇÃO DO ATRASO (FUSO BRASIL)
  function calcularAtraso(data_vencimento){

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const partes = data_vencimento.split("-");
    const venc = new Date(partes[0], partes[1]-1, partes[2]);

    venc.setHours(0,0,0,0);

    const dias = Math.floor((hoje - venc) / (1000*60*60*24));

    return dias > 0 ? dias : 0;
  }

  // ✅ FORMATAR DATA CORRETA
  function formatarData(data){
    const partes = data.split("-");
    return new Date(partes[0], partes[1]-1, partes[2]).toLocaleDateString();
  }

  async function togglePago(p){
    const novoStatus = p.status === "pago" ? "pendente" : "pago";

    const { error } = await supabase
      .from("emprestimos")
      .update({ status: novoStatus })
      .eq("id", p.id);

    if(error){
      alert("Erro ao atualizar");
      return;
    }

    carregar();
  }

  async function excluir(id){
    if(!confirm("Deseja excluir esse empréstimo?")) return;

    const { error } = await supabase
      .from("emprestimos")
      .delete()
      .eq("id", id);

    if(error){
      alert("Erro ao excluir: " + error.message);
      return;
    }

    alert("Excluído!");
    carregar();
  }

  // ✅ PIX CORRIGIDO
  function cobrar(p){
    if(!p.telefone){
      alert("Cliente sem telefone!");
      return;
    }

    let telefone = p.telefone.replace(/\D/g, "");

    if(telefone.length === 11 || telefone.length === 10){
      telefone = "55" + telefone;
    }

    const mensagem = `Olá ${p.cliente},

Você tem um pagamento pendente.

Valor: R$ ${p.total}
Vencimento: ${formatarData(p.data_vencimento)}

PIX: SUA_CHAVE_AQUI`;

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  // ✅ EDITAR
  function editar(p){
    setCliente(p.cliente);
    setTelefone(p.telefone);
    setCpf(p.cpf);
    setEndereco(p.endereco);
    setValor(p.valor);
    setTotal(p.total);
    setDataVencimento(p.data_vencimento);

    setEditandoId(p.id);
    setAba("novo");
  }

  // ✅ SALVAR / EDITAR
  async function salvar(){

    if(!cliente || !valor || !dataVencimento){
      alert("Preencha os campos obrigatórios");
      return;
    }

    const totalFinal = total ? Number(total) : Number(valor);

    let error;

    if(editandoId){

      const res = await supabase
        .from("emprestimos")
        .update({
          cliente,
          telefone,
          cpf,
          endereco,
          valor: Number(valor),
          total: totalFinal,
          data_vencimento: dataVencimento
        })
        .eq("id", editandoId);

      error = res.error;

    } else {

      const res = await supabase
        .from("emprestimos")
        .insert([{
          empresa_id: empresaId,
          cliente,
          telefone,
          cpf,
          endereco,
          valor: Number(valor),
          total: totalFinal,
          data_vencimento: dataVencimento,
          status: "pendente"
        }]);

      error = res.error;
    }

    if(error){
      alert("Erro: " + error.message);
      return;
    }

    alert("Salvo com sucesso!");

    setEditandoId(null);
    setCliente("");
    setTelefone("");
    setCpf("");
    setEndereco("");
    setValor("");
    setTotal("");
    setDataVencimento("");

    setAba("lista");
    carregar();
  }

  return (
    <div>

      <h2>💰 Empréstimos</h2>

      <div style={{display:"flex", gap:10, marginBottom:20}}>
        <button onClick={()=>setAba("lista")}>📋 Lista</button>
        <button onClick={()=>setAba("novo")}>➕ Novo</button>
        <button onClick={()=>setAba("atrasados")}>⚠️ Atrasos</button>
      </div>

      {aba === "novo" && (
        <div style={{background:"#111827", padding:15, borderRadius:8}}>

          <h3>{editandoId ? "Editar" : "Novo"} Empréstimo</h3>

          <input placeholder="Cliente" value={cliente} onChange={e=>setCliente(e.target.value)} />
          <input placeholder="Telefone" value={telefone} onChange={e=>setTelefone(e.target.value)} />
          <input placeholder="CPF" value={cpf} onChange={e=>setCpf(e.target.value)} />
          <input placeholder="Endereço" value={endereco} onChange={e=>setEndereco(e.target.value)} />

          <input placeholder="Valor" value={valor} onChange={e=>setValor(e.target.value)} />
          <input placeholder="Total com juros" value={total} onChange={e=>setTotal(e.target.value)} />

          <input type="date" value={dataVencimento} onChange={e=>setDataVencimento(e.target.value)} />

          <button onClick={salvar}>💾 Salvar</button>

        </div>
      )}

      {aba === "lista" && dados.map(p=>{

        const atraso = calcularAtraso(p.data_vencimento);

        let cor = "#22c55e";
        if(atraso > 5) cor = "#f59e0b";
        if(atraso > 10) cor = "#ef4444";

        return (
          <div key={p.id} style={{
            background:"#111827",
            padding:15,
            marginTop:10,
            borderLeft:`5px solid ${cor}`,
            borderRadius:8
          }}>

            <p><b>Cliente:</b> {p.cliente}</p>
            <p><b>Telefone:</b> {p.telefone || "-"}</p>

            <p><b>Valor:</b> R$ {p.valor}</p>
            <p><b>Total:</b> R$ {p.total}</p>
            <p><b>Vencimento:</b> {formatarData(p.data_vencimento)}</p>

            {p.status === "pago" ? (
              <p style={{color:"#22c55e"}}>✅ Pago</p>
            ) : atraso > 0 ? (
              <p style={{color:"#ef4444"}}>🔴 Atrasado {atraso} dias</p>
            ) : (
              <p style={{color:"#22c55e"}}>🟢 Em dia</p>
            )}

            <div style={{marginTop:10, display:"flex", gap:10}}>
              <button onClick={()=>cobrar(p)}>💰 PIX</button>
              <button onClick={()=>editar(p)}>✏️</button>
              <button onClick={()=>togglePago(p)}>
                {p.status === "pago" ? "↩️" : "✅"}
              </button>
              <button onClick={()=>excluir(p.id)}>🗑️</button>
            </div>

          </div>
        );
      })}

      {aba === "atrasados" && dados
        .filter(p => calcularAtraso(p.data_vencimento) > 0)
        .map(p=>{

          const atraso = calcularAtraso(p.data_vencimento);

          return (
            <div key={p.id} style={{
              background:"#111827",
              padding:15,
              marginTop:10,
              borderLeft:`5px solid red`,
              borderRadius:8
            }}>
              <p><b>{p.cliente}</b></p>
              <p>🔴 {atraso} dias de atraso</p>
            </div>
          );
        })}

    </div>
  );
}