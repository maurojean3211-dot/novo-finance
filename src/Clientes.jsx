import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Clientes() {

  const [clientes, setClientes] = useState([]);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const [produto, setProduto] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [valor, setValor] = useState("");
  const [dataVenda, setDataVenda] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [intervalo, setIntervalo] = useState(0); // 0 = à vista

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
      await carregarClientes(data.empresa_id);
    }

    setCarregando(false);
  }

  async function carregarClientes(empId) {

    const { data } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empId)
      .order("created_at", { ascending: false });

    setClientes(data || []);
  }

  async function salvarCliente(){

    if(!empresaId) return alert("Empresa não carregada");
    if(!nome) return alert("Digite o nome do cliente");

    if(valor && !dataVenda){
      return alert("Informe a data da venda");
    }

    const qtd = Number(quantidade) || 1;
    const valorUnitario = Number(valor) || 0;

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

    if(error) return alert("Erro cliente");

    if(valorUnitario > 0){

      const valorTotal = valorUnitario * qtd;

      const { data:venda } = await supabase
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

      let listaParcelas = [];

      const qtdParcelas = Number(parcelas) || 1;
      const intervaloDias = Number(intervalo) || 0;

      // 🔥 CORREÇÃO TOTAL DAS DATAS
      const [ano, mes, dia] = dataVenda.split("-");

      let dataBase = new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia)
      );

      for(let i=1;i<=qtdParcelas;i++){

        let dataParcela = new Date(dataBase);

        if(qtdParcelas === 1 || intervaloDias === 0){
          // À vista
          dataParcela = dataBase;
        } else {
          // Parcelado começa depois
          dataParcela.setDate(
            dataBase.getDate() + (i * intervaloDias)
          );
        }

        const anoF = dataParcela.getFullYear();
        const mesF = String(dataParcela.getMonth() + 1).padStart(2, "0");
        const diaF = String(dataParcela.getDate()).padStart(2, "0");

        const dataFormatada = `${anoF}-${mesF}-${diaF}`;

        listaParcelas.push({
          empresa_id: empresaId,
          venda_id: venda.id,
          cliente_id: cliente.id,
          numero_parcela: i,
          valor: Number((valorTotal / qtdParcelas).toFixed(2)),
          data_vencimento: dataFormatada,
          status: "pendente"
        });
      }

      await supabase.from("parcelas").insert(listaParcelas);

      const recebimentos = listaParcelas.map(p => ({
        empresa_id: empresaId,
        venda_id: p.venda_id,
        cliente_id: p.cliente_id,
        valor: Number(p.valor),
        data_vencimento: p.data_vencimento,
        status: "pendente"
      }));

      await supabase.from("recebimentos").insert(recebimentos);
    }

    setClientes(prev => [cliente, ...prev]);

    setNome("");
    setTelefone("");
    setEmail("");
    setProduto("");
    setQuantidade(1);
    setValor("");
    setDataVenda("");
    setParcelas(1);
    setIntervalo(0);

    alert("✅ Salvo com sucesso!");
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

        <input style={inputStyle} type="number" placeholder="Intervalo (dias) - 0 = à vista"
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

const card={ background:"#111827", padding:15, borderRadius:10, marginBottom:15 };
const cardLista={ background:"#1f2937", padding:10, borderRadius:8, marginBottom:10, display:"flex", justifyContent:"space-between" };
const inputStyle={ display:"block", marginBottom:10, padding:10, width:"100%", borderRadius:6, border:"none" };
const buttonStyle={ padding:12, width:"100%", borderRadius:8, border:"none", background:"#2563eb", color:"#fff" };
const deleteStyle={ padding:6, borderRadius:6, border:"none", background:"#dc2626", color:"#fff" };