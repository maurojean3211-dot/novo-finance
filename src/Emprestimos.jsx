import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista({ empresaId }) {

  const [dados, setDados] = useState([]);
  const [aba, setAba] = useState("lista");

  const [editandoId, setEditandoId] = useState(null);

  // PIX EMPRESA
  const [pixChave, setPixChave] = useState("");
  const [pixEdit, setPixEdit] = useState("");

  // PIX DO EMPRÉSTIMO
  const [pixCobranca, setPixCobranca] = useState("");

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
      carregarPix();
    }
  },[empresaId]);

  async function carregar(){
    const { data } = await supabase
      .from("emprestimos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data_vencimento", { ascending: true });

    setDados(data || []);
  }

  async function carregarPix(){
    const { data } = await supabase
      .from("empresas")
      .select("pix_chave")
      .eq("id", empresaId)
      .single();

    if(data){
      setPixChave(data.pix_chave || "");
      setPixEdit(data.pix_chave || "");
    }
  }

  async function salvarPix(){
    const { error } = await supabase
      .from("empresas")
      .update({ pix_chave: pixEdit })
      .eq("id", empresaId);

    if(error){
      alert("Erro ao salvar PIX");
      return;
    }

    alert("PIX salvo!");
    carregarPix();
  }

  function calcularAtraso(data_vencimento){
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const partes = data_vencimento.split("-");
    const venc = new Date(partes[0], partes[1]-1, partes[2]);
    venc.setHours(0,0,0,0);

    const dias = Math.floor((hoje - venc) / (1000*60*60*24));
    return dias > 0 ? dias : 0;
  }

  function formatarData(data){
    const partes = data.split("-");
    return new Date(partes[0], partes[1]-1, partes[2]).toLocaleDateString();
  }

  async function togglePago(p){
    const novoStatus = p.status === "pago" ? "pendente" : "pago";

    await supabase
      .from("emprestimos")
      .update({ status: novoStatus })
      .eq("id", p.id);

    carregar();
  }

  async function excluir(id){
    if(!confirm("Deseja excluir?")) return;

    const { data, error } = await supabase
      .from("emprestimos")
      .delete()
      .eq("id", id)
      .select();

    if(error){
      alert("Erro ao excluir: " + error.message);
      return;
    }

    if(!data || data.length === 0){
      alert("Bloqueado pelo banco (RLS)");
      return;
    }

    alert("Excluído!");
    carregar();
  }

  // 🔥 COBRANÇA COM PIX INTELIGENTE
  function cobrar(p){
    if(!p.telefone){
      alert("Cliente sem telefone!");
      return;
    }

    const pixFinal = p.pix_cobranca || pixChave;

    if(!pixFinal){
      alert("Cadastre um PIX!");
      return;
    }

    let telefone = p.telefone.replace(/\D/g, "");

    if(telefone.length === 11 || telefone.length === 10){
      telefone = "55" + telefone;
    }

    const valorBase = Number(p.valor);
    const jurosPercentual = Number(p.juros || 0);

    const totalComJuros = valorBase + (valorBase * jurosPercentual / 100);

    const mensagem = `Olá ${p.cliente},

Valor: R$ ${totalComJuros.toFixed(2)}
Vencimento: ${formatarData(p.data_vencimento)}

PIX: ${pixFinal}`;

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  function editar(p){
    setCliente(p.cliente);
    setTelefone(p.telefone);
    setCpf(p.cpf);
    setEndereco(p.endereco);
    setValor(p.valor);
    setTotal(p.total);
    setDataVencimento(p.data_vencimento);
    setPixCobranca(p.pix_cobranca || "");

    setEditandoId(p.id);
    setAba("novo");
  }

  async function salvar(){

    if(!cliente || !valor || !dataVencimento){
      alert("Preencha os campos");
      return;
    }

    const totalFinal = total ? Number(total) : Number(valor);

    if(editandoId){
      await supabase
        .from("emprestimos")
        .update({
          cliente,
          telefone,
          cpf,
          endereco,
          valor: Number(valor),
          total: totalFinal,
          data_vencimento: dataVencimento,
          pix_cobranca: pixCobranca
        })
        .eq("id", editandoId);
    } else {
      await supabase
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
          pix_cobranca: pixCobranca,
          status: "pendente"
        }]);
    }

    setEditandoId(null);
    setCliente("");
    setTelefone("");
    setCpf("");
    setEndereco("");
    setValor("");
    setTotal("");
    setDataVencimento("");
    setPixCobranca("");

    setAba("lista");
    carregar();
  }

  return (
    <div>

      <h2>💰 Empréstimos</h2>

      {/* PIX EMPRESA */}
      <div style={{background:"#1f2937", padding:15, borderRadius:8, marginBottom:20}}>
        <h3>🔑 Minha chave PIX</h3>

        <div style={{background:"#111827", padding:10, borderRadius:6, marginBottom:10}}>
          {pixChave || "Nenhuma chave cadastrada"}
        </div>

        <input
          value={pixEdit}
          onChange={e=>setPixEdit(e.target.value)}
          style={{width:"100%", marginBottom:10}}
        />

        <button onClick={salvarPix}>💾 Salvar PIX</button>
      </div>

      {/* FORM */}
      {aba === "novo" && (
        <div style={{background:"#111827", padding:15}}>

          <input placeholder="Cliente" value={cliente} onChange={e=>setCliente(e.target.value)} />
          <input placeholder="Telefone" value={telefone} onChange={e=>setTelefone(e.target.value)} />

          <input placeholder="Valor" value={valor} onChange={e=>setValor(e.target.value)} />
          <input placeholder="Total" value={total} onChange={e=>setTotal(e.target.value)} />

          <input type="date" value={dataVencimento} onChange={e=>setDataVencimento(e.target.value)} />

          {/* 🔥 PIX DO EMPRÉSTIMO */}
          <input 
            placeholder="PIX cobrança (opcional)"
            value={pixCobranca}
            onChange={e=>setPixCobranca(e.target.value)}
          />

          <button onClick={salvar}>💾 Salvar</button>

        </div>
      )}

      {/* LISTA */}
      {dados.map(p=>{

        const atraso = calcularAtraso(p.data_vencimento);

        return (
          <div key={p.id} style={{background:"#111827", padding:15, marginTop:10}}>

            <p><b>{p.cliente}</b></p>
            <p>R$ {p.total}</p>
            <p>{formatarData(p.data_vencimento)}</p>

            {atraso > 0 && <p style={{color:"red"}}>Atrasado {atraso} dias</p>}

            <div style={{display:"flex", gap:10}}>
              <button onClick={()=>cobrar(p)}>💰 PIX</button>
              <button onClick={()=>editar(p)}>✏️</button>
              <button onClick={()=>togglePago(p)}>✅</button>
              <button onClick={()=>excluir(p.id)}>🗑️</button>
            </div>

          </div>
        );
      })}

    </div>
  );
}