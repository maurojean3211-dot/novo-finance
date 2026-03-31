import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Clientes() {

  const [clientes, setClientes] = useState([]);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // 🔥 VENDA
  const [produto, setProduto] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [valor, setValor] = useState("");
  const [dataVenda, setDataVenda] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [intervalo, setIntervalo] = useState(15);

  const [empresaId, setEmpresaId] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    iniciar();
  }, []);

  async function iniciar() {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.log(error);
      setCarregando(false);
      return;
    }

    if (data?.empresa_id) {
      setEmpresaId(data.empresa_id);
      await carregarClientes(data.empresa_id);
    }

    setCarregando(false);
  }

  async function carregarClientes(empId) {

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empId)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("ERRO CLIENTES:", error);
      return;
    }

    setClientes(data || []);
  }

  // 🔥 SALVAR CLIENTE + VENDA + PARCELAS + RECEBIMENTOS
  async function salvarCliente(){

    if(!empresaId){
      alert("Empresa ainda não carregou");
      return;
    }

    if(!nome){
      alert("Digite o nome do cliente");
      return;
    }

    // 1️⃣ CLIENTE
    const { data:cliente, error } = await supabase
      .from("clientes")
      .insert([{
        nome: nome.trim(),
        telefone,
        email: email || null,
        empresa_id: empresaId
      }])
      .select()
      .single();

    if(error){
      console.log("ERRO CLIENTE:", error);
      alert("Erro ao salvar cliente");
      return;
    }

    // 2️⃣ VENDA + PARCELAS
    if(valor && dataVenda){

      const valorUnitario = Number(valor);
      const qtd = Number(quantidade);
      const valorTotal = valorUnitario * qtd;
      const qtdParcelas = Number(parcelas);

      const { data:venda, error:erroVenda } = await supabase
        .from("vendas")
        .insert([{
          empresa_id: empresaId,
          cliente_id: cliente.id,
          produto: produto || null,
          quantidade: qtd,
          valor_total: valorTotal,
          data_venda: dataVenda
        }])
        .select()
        .single();

      if(erroVenda){
        console.log("ERRO VENDA:", erroVenda);
        alert("Erro ao salvar venda");
        return;
      }

      let listaParcelas = [];

      for(let i=1;i<=qtdParcelas;i++){

        let dataParcela = new Date(dataVenda);
        dataParcela.setDate(dataParcela.getDate() + ((i-1) * intervalo));

        listaParcelas.push({
          empresa_id: empresaId,
          venda_id: venda.id,
          cliente_id: cliente.id,
          numero_parcela: i,
          valor: Number((valorTotal / qtdParcelas).toFixed(2)), // 🔥 corrigido arredondamento
          data_vencimento: dataParcela.toISOString().split("T")[0],
          status: "pendente"
        });
      }

      const { error: erroParcelas } = await supabase
        .from("parcelas")
        .insert(listaParcelas);

      if(erroParcelas){
        console.log("ERRO PARCELAS:", erroParcelas);
        alert("Erro ao salvar parcelas");
        return;
      }

      const recebimentos = listaParcelas.map(p => ({
        empresa_id: p.empresa_id,
        venda_id: p.venda_id,
        cliente_id: p.cliente_id,
        valor: p.valor,
        data_vencimento: p.data_vencimento,
        status: "pendente"
      }));

      const { error: erroReceb } = await supabase
        .from("recebimentos")
        .insert(recebimentos);

      if(erroReceb){
        console.log("ERRO RECEBIMENTOS:", erroReceb);
        alert("Erro ao salvar recebimentos");
        return;
      }
    }

    // atualiza lista
    setClientes(prev => [cliente, ...prev]);

    // limpar campos
    setNome("");
    setTelefone("");
    setEmail("");
    setProduto("");
    setQuantidade(1);
    setValor("");
    setDataVenda("");
    setParcelas(1);

    alert("✅ Cliente + venda salvos!");
  }

  async function excluirCliente(id) {

    if (!window.confirm("Excluir cliente?")) return;

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      console.log("ERRO EXCLUIR:", error);
      alert("Erro ao excluir");
      return;
    }

    setClientes(prev => prev.filter(c => c.id !== id));
  }

  if(carregando){
    return <div style={{padding:20,color:"#fff"}}>Carregando...</div>;
  }

  return (
    <div style={{ padding:20, color:"#fff", maxWidth:600 }}>

      <h2>👥 Cliente + Venda</h2>

      <div style={card}>

        <h3>Cadastro</h3>

        <input style={inputStyle} placeholder="Nome" value={nome} onChange={(e)=>setNome(e.target.value)} />
        <input style={inputStyle} placeholder="Telefone" value={telefone} onChange={(e)=>setTelefone(e.target.value)} />
        <input style={inputStyle} placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />

        <hr />

        <h3>💰 Venda (opcional)</h3>

        <input style={inputStyle} placeholder="Produto" value={produto} onChange={(e)=>setProduto(e.target.value)} />

        <input style={inputStyle} type="number" placeholder="Quantidade"
          value={quantidade}
          onChange={(e)=>setQuantidade(e.target.value)}
        />

        <input style={inputStyle} type="number" placeholder="Valor unitário"
          value={valor}
          onChange={(e)=>setValor(e.target.value)}
        />

        <input style={inputStyle} type="date"
          value={dataVenda}
          onChange={(e)=>setDataVenda(e.target.value)}
        />

        <input style={inputStyle} type="number" placeholder="Parcelas"
          value={parcelas}
          onChange={(e)=>setParcelas(e.target.value)}
        />

        <input style={inputStyle} type="number" placeholder="Intervalo (dias)"
          value={intervalo}
          onChange={(e)=>setIntervalo(e.target.value)}
        />

        <button style={buttonStyle} onClick={salvarCliente}>
          💾 Salvar
        </button>

      </div>

      <h3 style={{marginTop:20}}>📋 Clientes</h3>

      {clientes.map(c => (
        <div key={c.id} style={cardLista}>
          <div>
            <strong>{c.nome}</strong><br/>
            {c.telefone}<br/>
            {c.email}
          </div>

          <button onClick={()=>excluirCliente(c.id)} style={deleteStyle}>
            🗑
          </button>
        </div>
      ))}

    </div>
  );
}

// 🎨 estilos

const card={
  background:"#111827",
  padding:15,
  borderRadius:10,
  marginBottom:15
};

const cardLista={
  background:"#1f2937",
  padding:10,
  borderRadius:8,
  marginBottom:10,
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center"
};

const inputStyle={
  display:"block",
  marginBottom:10,
  padding:10,
  width:"100%",
  borderRadius:6,
  border:"none"
};

const buttonStyle={
  padding:12,
  width:"100%",
  borderRadius:8,
  border:"none",
  background:"#2563eb",
  color:"#fff",
  fontWeight:"bold",
  cursor:"pointer"
};

const deleteStyle={
  padding:6,
  borderRadius:6,
  border:"none",
  background:"#dc2626",
  color:"#fff",
  cursor:"pointer"
};