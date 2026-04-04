import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista({ empresaId }) {

  const [dados, setDados] = useState([]);
  const [aba, setAba] = useState("lista");

  const [editandoId, setEditandoId] = useState(null);

  // PIX EMPRESA
  const [pixChave, setPixChave] = useState("");
  const [pixEdit, setPixEdit] = useState("");
  const [empresaRealId, setEmpresaRealId] = useState(null);

  // PIX DO EMPRÉSTIMO
  const [pixCobranca, setPixCobranca] = useState("");

  // FORM
  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [valor, setValor] = useState("");
  const [juros, setJuros] = useState("");
  const [total, setTotal] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  useEffect(()=>{
    carregar();
    carregarPix();
  },[]);

  async function carregar(){
    const { data } = await supabase
      .from("emprestimos")
      .select("*")
      .order("data_vencimento", { ascending: true });

    setDados(data || []);
  }

  // 🔥 CARREGA EMPRESA REAL
  async function carregarPix(){
    const { data } = await supabase
      .from("empresas")
      .select("*")
      .limit(1);

    if(data && data.length > 0){
      setEmpresaRealId(data[0].id);
      setPixChave(data[0].pix_chave || "");
      setPixEdit(data[0].pix_chave || "");
    }
  }

  // 🔥 SALVA PIX
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
    await supabase
      .from("emprestimos")
      .update({ status: p.status === "pago" ? "pendente" : "pago" })
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
      alert("Erro: " + error.message);
      return;
    }

    if(!data || data.length === 0){
      alert("RLS bloqueando exclusão");
      return;
    }

    alert("Excluído!");
    carregar();
  }

  function cobrar(p){

    const pixFinal = p.pix_cobranca || pixChave;

    if(!pixFinal){
      alert("Cadastre um PIX!");
      return;
    }

    let telefone = p.telefone.replace(/\D/g, "");
    if(telefone.length >= 10){
      telefone = "55" + telefone;
    }

    const valorBase = Number(p.valor);
    const jurosPercentual = Number(p.juros || 0);

    const totalComJuros = valorBase + (valorBase * jurosPercentual / 100);

    const mensagem = `Olá ${p.cliente},

Valor: R$ ${totalComJuros.toFixed(2)}
Vencimento: ${formatarData(p.data_vencimento)}

PIX: ${pixFinal}`;

    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`);
  }

  function editar(p){
    setCliente(p.cliente || "");
    setTelefone(p.telefone || "");
    setCpf(p.cpf || "");
    setEndereco(p.endereco || "");
    setValor(p.valor || "");
    setJuros(p.juros || "");
    setTotal(p.total || "");
    setDataVencimento(p.data_vencimento || "");
    setPixCobranca(p.pix_cobranca || "");

    setEditandoId(p.id);
    setAba("novo");
  }

  async function salvar(){

    if(!cliente || !valor || !dataVencimento){
      alert("Preencha os campos");
      return;
    }

    if(!empresaRealId){
      alert("Empresa não carregada ainda");
      return;
    }

    const valorBase = Number(valor);
    const jurosPercentual = Number(juros || 0);

    const totalFinal = valorBase + (valorBase * jurosPercentual / 100);

    if(editandoId){
      await supabase
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
        .eq("id", editandoId);
    } else {
      await supabase
        .from("emprestimos")
        .insert([{
          empresa_id: empresaRealId, // 🔥 AQUI ESTA A CORREÇÃO
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
        }]);
    }

    alert("Salvo!");

    setEditandoId(null);
    setCliente("");
    setTelefone("");
    setCpf("");
    setEndereco("");
    setValor("");
    setJuros("");
    setTotal("");
    setDataVencimento("");
    setPixCobranca("");

    setAba("lista");
    carregar();
  }

  return (
    <div>

      <h2>💰 Empréstimos</h2>

      <div style={{background:"#1f2937", padding:15, marginBottom:20}}>
        <h3>Minha chave PIX</h3>

        <div>{pixChave || "Nenhuma chave cadastrada"}</div>

        <input value={pixEdit} onChange={e=>setPixEdit(e.target.value)} />
        <button onClick={salvarPix}>Salvar PIX</button>
      </div>

      {dados.map(p=>{

        const atraso = calcularAtraso(p.data_vencimento);

        return (
          <div key={p.id} style={{marginTop:10}}>

            <p>{p.cliente}</p>
            <p>R$ {p.total}</p>

            {atraso > 0 && <p style={{color:"red"}}>Atrasado {atraso}</p>}

            <button onClick={()=>cobrar(p)}>PIX</button>
            <button onClick={()=>editar(p)}>Editar</button>
            <button onClick={()=>togglePago(p)}>Pago</button>
            <button onClick={()=>excluir(p.id)}>Excluir</button>

          </div>
        );
      })}

    </div>
  );
}