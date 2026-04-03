import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Clientes() {

  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);

  const [busca, setBusca] = useState("");

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const [produto, setProduto] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [valor, setValor] = useState("");
  const [dataVenda, setDataVenda] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [intervalo, setIntervalo] = useState(30);

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

    const { data } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.empresa_id) {
      setEmpresaId(data.empresa_id);
      await carregarTudo(data.empresa_id);
    }

    setCarregando(false);
  }

  async function carregarTudo(empId) {

    const { data:clientesData } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empId)
      .order("created_at", { ascending: false });

    const { data:vendasData } = await supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empId);

    setClientes(clientesData || []);
    setVendas(vendasData || []);
  }

  async function salvarCliente(){

    if(!empresaId) return alert("Empresa não carregada");
    if(!nome) return alert("Digite o nome do cliente");

    const qtd = Number(quantidade) || 1;
    const valorUnitario = Number(valor) || 0;

    // 🔥 SALVA CLIENTE
    const { data:cliente, error:erroCliente } = await supabase
      .from("clientes")
      .insert([{
        nome: nome.trim(),
        telefone,
        email: email || null,
        empresa_id: empresaId
      }])
      .select()
      .single();

    if(erroCliente){
      console.error(erroCliente);
      alert("Erro ao salvar cliente");
      return;
    }

    // 🔥 SE TEM VENDA
    if(valorUnitario > 0){

      const valorTotal = valorUnitario * qtd;
      const parcelasNum = Number(parcelas) || 1;

      const dataVendaFormatada = dataVenda
        ? new Date(dataVenda).toISOString()
        : new Date().toISOString();

      // 🔥 SALVA VENDA (CORRIGIDO)
      const { data:venda, error:erroVenda } = await supabase
        .from("vendas")
        .insert([{
          empresa_id: empresaId,
          cliente_id: cliente.id,
          produto: produto || "",
          quantidade: qtd,
          valor_total: Number(valorTotal),
          parcelas: parcelasNum,
          data_venda: dataVendaFormatada
        }])
        .select()
        .single();

      if(erroVenda){
        console.error("ERRO VENDA 👉", erroVenda);
        alert("Erro ao salvar venda");
        return;
      }

      // 🔒 INTERVALO SEGURO
      let intervaloSeguro = Number(intervalo) || 1;
      if(intervaloSeguro < 1) intervaloSeguro = 1;
      if(intervaloSeguro > 30) intervaloSeguro = 30;

      const listaRecebimentos = [];

      const valorParcela = valorTotal / parcelasNum;
      const dataBase = new Date(dataVendaFormatada);

      for(let i = 0; i < parcelasNum; i++){

        const vencimento = new Date(dataBase);
        vencimento.setDate(vencimento.getDate() + (i * intervaloSeguro));

        listaRecebimentos.push({
          empresa_id: empresaId,
          cliente_id: cliente.id,
          venda_id: venda.id,
          valor: Number(valorParcela),
          data_vencimento: vencimento.toISOString(),
          status: "pendente"
        });
      }

      const { error:erroReceb } = await supabase
        .from("recebimentos")
        .insert(listaRecebimentos);

      if(erroReceb){
        console.error("ERRO RECEBIMENTOS 👉", erroReceb);
      }
    }

    // 🔥 LIMPA
    setNome("");
    setTelefone("");
    setEmail("");
    setProduto("");
    setQuantidade(1);
    setValor("");
    setDataVenda("");
    setParcelas(1);
    setIntervalo(30);

    await carregarTudo(empresaId);

    alert("✅ Cliente + Venda + Recebimentos salvos!");
  }

  async function excluirCliente(id) {

    if (!window.confirm("Excluir cliente?")) return;

    await supabase
      .from("clientes")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    setClientes(prev => prev.filter(c => c.id !== id));
  }

  if(carregando){
    return <div style={{padding:20,color:"#fff"}}>Carregando...</div>;
  }

  return (
    <div style={{ padding:20, color:"#fff", maxWidth:600 }}>

      <h2>👥 Cliente + Venda</h2>

      <div style={card}>

        <input style={inputStyle} placeholder="Nome" value={nome} onChange={(e)=>setNome(e.target.value)} />
        <input style={inputStyle} placeholder="Telefone" value={telefone} onChange={(e)=>setTelefone(e.target.value)} />
        <input style={inputStyle} placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />

        <input style={inputStyle} placeholder="Produto" value={produto} onChange={(e)=>setProduto(e.target.value)} />

        <input style={inputStyle} type="number" placeholder="Quantidade"
          value={quantidade}
          onChange={(e)=>setQuantidade(e.target.value)}
        />

        <input style={inputStyle} type="number" placeholder="Valor"
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

        <input 
          style={inputStyle} 
          type="number" 
          placeholder="Intervalo (1 a 30 dias)"
          value={intervalo}
          min={1}
          max={30}
          onChange={(e)=>{
            let valor = Number(e.target.value);
            if(valor < 1) valor = 1;
            if(valor > 30) valor = 30;
            setIntervalo(valor);
          }}
        />

        <button style={buttonStyle} onClick={salvarCliente}>
          💾 Salvar
        </button>

      </div>

      <input
        style={inputStyle}
        placeholder="🔍 Buscar cliente..."
        value={busca}
        onChange={(e)=>setBusca(e.target.value)}
      />

      <h3>📋 Clientes</h3>

      {clientes
        .filter(c =>
          c.nome.toLowerCase().includes(busca.toLowerCase())
        )
        .map(c => {

          const venda = vendas.find(v => v.cliente_id === c.id);

          return (
            <div key={c.id} style={cardLista}>

              <div>
                <strong>{c.nome}</strong><br/>
                📞 {c.telefone}<br/>

                {venda && (
                  <>
                    💰 R$ {Number(venda.valor_total).toFixed(2)}<br/>
                    📦 {venda.parcelas || 1}x
                  </>
                )}
              </div>

              <button onClick={()=>excluirCliente(c.id)} style={deleteStyle}>
                🗑
              </button>

            </div>
          );
        })}

    </div>
  );
}

const card={ background:"#111827", padding:15, borderRadius:10, marginBottom:15 };
const cardLista={ background:"#1f2937", padding:10, borderRadius:8, marginBottom:10, display:"flex", justifyContent:"space-between" };
const inputStyle={ display:"block", marginBottom:10, padding:10, width:"100%", borderRadius:6, border:"none" };
const buttonStyle={ padding:12, width:"100%", borderRadius:8, border:"none", background:"#2563eb", color:"#fff" };
const deleteStyle={ padding:6, borderRadius:6, border:"none", background:"#dc2626", color:"#fff" };