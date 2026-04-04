import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista() {

  const [dados, setDados] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  const [pixChave, setPixChave] = useState("");
  const [pixEdit, setPixEdit] = useState("");
  const [empresaRealId, setEmpresaRealId] = useState(null);

  const [pixCobranca, setPixCobranca] = useState("");

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [valor, setValor] = useState("");
  const [juros, setJuros] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  useEffect(()=>{
    carregarEmpresa();
  },[]);

  // ================= EMPRESA CORRIGIDO
  async function carregarEmpresa(){

    try{

      const { data:{ user } } = await supabase.auth.getUser();

      if(!user){
        console.log("Sem usuário");
        return;
      }

      const { data:usuario, error } = await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("id", user.id)
        .single();

      if(error){
        console.error("Erro usuario:", error);
        return;
      }

      if(!usuario?.empresa_id){
        alert("Usuário sem empresa");
        return;
      }

      const empresaId = usuario.empresa_id;
      setEmpresaRealId(empresaId);

      console.log("EMPRESA:", empresaId);

      carregarDados(empresaId);
      carregarPix(empresaId);

    }catch(err){
      console.error("Erro geral:", err);
    }

  }

  // ================= DADOS
  async function carregarDados(empresa_id){

    const { data, error } = await supabase
      .from("emprestimos")
      .select("*")
      .eq("empresa_id", empresa_id)
      .order("data_vencimento", { ascending: true });

    if(error){
      console.error("Erro dados:", error);
    }

    setDados(data || []);
  }

  // ================= PIX
  async function carregarPix(empresa_id){

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresa_id)
      .single();

    if(error){
      console.error("Erro empresa:", error);
      return;
    }

    if(data){
      setPixChave(data.pix_chave || "");
      setPixEdit(data.pix_chave || "");
    }

  }

  async function salvarPix(){

    if(!empresaRealId){
      alert("Empresa não carregada");
      return;
    }

    const { data, error } = await supabase
      .from("empresas")
      .update({ pix_chave: pixEdit })
      .eq("id", empresaRealId)
      .select();

    if(error){
      alert("Erro PIX: " + error.message);
      return;
    }

    if(!data || data.length === 0){
      alert("RLS bloqueando PIX");
      return;
    }

    alert("PIX salvo!");
    carregarPix(empresaRealId);
  }

  // ================= FUNÇÕES
  function calcularAtraso(data_vencimento){
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const partes = data_vencimento.split("-");
    const venc = new Date(partes[0], partes[1]-1, partes[2]);

    const dias = Math.floor((hoje - venc) / (1000*60*60*24));
    return dias > 0 ? dias : 0;
  }

  function formatarData(data){
    const partes = data.split("-");
    return new Date(partes[0], partes[1]-1, partes[2]).toLocaleDateString();
  }

  async function excluir(id){
    if(!confirm("Excluir?")) return;

    const { error } = await supabase
      .from("emprestimos")
      .delete()
      .eq("id", id);

    if(error){
      alert(error.message);
      return;
    }

    carregarDados(empresaRealId);
  }

  function editar(p){
    setCliente(p.cliente || "");
    setTelefone(p.telefone || "");
    setCpf(p.cpf || "");
    setEndereco(p.endereco || "");
    setValor(p.valor || "");
    setJuros(p.juros || "");
    setDataVencimento(p.data_vencimento || "");
    setPixCobranca(p.pix_cobranca || "");

    setEditandoId(p.id);
  }

  // ================= SALVAR CORRIGIDO
  async function salvar(){

    try{

      if(!empresaRealId){
        alert("Empresa não carregada");
        return;
      }

      if(!cliente || !valor || !dataVencimento){
        alert("Preencha os campos");
        return;
      }

      const valorBase = Number(valor);
      const jurosPercentual = Number(juros || 0);
      const totalFinal = valorBase + (valorBase * jurosPercentual / 100);

      console.log("SALVANDO:", {
        empresa_id: empresaRealId,
        cliente
      });

      let resposta;

      if(editandoId){

        resposta = await supabase
          .from("emprestimos")
          .update({
            cliente,
            telefone,
            cpf,
            endereco,
            valor: valorBase,
            juros: jurosPercentual,
            total: totalFinal,
            data_vencimento: dataVencimento,
            pix_cobranca: pixCobranca
          })
          .eq("id", editandoId)
          .select();

      } else {

        resposta = await supabase
          .from("emprestimos")
          .insert([{
            empresa_id: empresaRealId,
            cliente,
            telefone,
            cpf,
            endereco,
            valor: valorBase,
            juros: jurosPercentual,
            total: totalFinal,
            data_vencimento: dataVencimento,
            pix_cobranca: pixCobranca,
            status: "pendente"
          }])
          .select();

      }

      const { data, error } = resposta;

      if(error){
        console.error("ERRO:", error);
        alert(error.message);
        return;
      }

      if(!data || data.length === 0){
        alert("RLS bloqueando");
        return;
      }

      alert("Salvo!");

      setCliente("");
      setTelefone("");
      setCpf("");
      setEndereco("");
      setValor("");
      setJuros("");
      setDataVencimento("");
      setPixCobranca("");
      setEditandoId(null);

      carregarDados(empresaRealId);

    }catch(err){
      console.error(err);
      alert(err.message);
    }

  }

  // ================= TELA
  return (
    <div style={{padding:20}}>

      <h2>💰 Empréstimos</h2>

      <input placeholder="Cliente" value={cliente} onChange={e=>setCliente(e.target.value)} />
      <br/><br/>

      <input placeholder="Telefone" value={telefone} onChange={e=>setTelefone(e.target.value)} />
      <br/><br/>

      <input placeholder="Valor" value={valor} onChange={e=>setValor(e.target.value)} />
      <br/><br/>

      <input placeholder="Juros %" value={juros} onChange={e=>setJuros(e.target.value)} />
      <br/><br/>

      <input type="date" value={dataVencimento} onChange={e=>setDataVencimento(e.target.value)} />
      <br/><br/>

      <button onClick={salvar}>
        {editandoId ? "Atualizar" : "Salvar"}
      </button>

      <hr/>

      {dados.map(p=>{

        const atraso = calcularAtraso(p.data_vencimento);

        return (
          <div key={p.id} style={{marginBottom:10}}>

            <strong>{p.cliente}</strong><br/>
            R$ {p.total}

            {atraso > 0 && <div style={{color:"red"}}>Atrasado {atraso} dias</div>}

            <br/>

            <button onClick={()=>editar(p)}>Editar</button>
            <button onClick={()=>excluir(p.id)}>Excluir</button>

          </div>
        );
      })}

    </div>
  );
}