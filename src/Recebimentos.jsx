import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Recebimentos({ empresaId }) {

  const [lista, setLista] = useState([]);
  const [pix, setPix] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(()=>{
    carregarPix();
  },[]);

  useEffect(()=>{
    if(!empresaId) return;
    carregar();
  },[empresaId]);

  async function carregar(){

    if(!empresaId) return;

    const { data } = await supabase
      .from("recebimentos")
      .select("*")
      .eq("empresa_id", empresaId);

    const { data:clientes } = await supabase
      .from("clientes")
      .select("id, nome, telefone, whatsapp")
      .eq("empresa_id", empresaId);

    let listaCompleta = (data || []).map(r => {

      const cliente = clientes?.find(c => c.id === r.cliente_id);

      return {
        ...r,
        status_normalizado: String(r.status || "").toLowerCase().trim(),
        cliente_nome: cliente?.nome || "Cliente",
        cliente_tel: cliente?.telefone || cliente?.whatsapp || ""
      };

    });

    // 🔥 ORDEM ALFABÉTICA
    listaCompleta.sort((a,b)=>
      a.cliente_nome.localeCompare(b.cliente_nome)
    );

    setLista(listaCompleta);
  }

  async function carregarPix(){

    const { data: { user } } = await supabase.auth.getUser();
    if(!user) return;

    const { data } = await supabase
      .from("usuarios")
      .select("pix")
      .eq("id", user.id)
      .maybeSingle();

    setPix(data?.pix || "");
  }

  async function salvarPix(){

    const { data: { user } } = await supabase.auth.getUser();
    if(!user) return;

    const { error } = await supabase
      .from("usuarios")
      .update({ pix })
      .eq("id", user.id);

    if(error){
      alert("Erro ao salvar PIX");
      return;
    }

    alert("✅ PIX salvo!");
  }

  async function receber(id){

    const confirmar = window.confirm("Confirmar pagamento?");
    if(!confirmar) return;

    const { error } = await supabase
      .from("recebimentos")
      .update({ status: "pago" })
      .eq("id", id);

    if(error){
      alert("Erro ao confirmar pagamento");
      return;
    }

    await carregar();

    alert("✅ Pagamento confirmado!");
  }

  async function reabrir(id){

    const confirmar = window.confirm("Voltar para pendente?");
    if(!confirmar) return;

    const { error } = await supabase
      .from("recebimentos")
      .update({ status: "pendente" })
      .eq("id", id);

    if(error){
      alert("Erro ao reabrir");
      return;
    }

    await carregar();

    alert("🔄 Voltou para pendente!");
  }

  async function excluir(id){

    if(!window.confirm("Excluir recebimento?")) return;

    await supabase
      .from("recebimentos")
      .delete()
      .eq("id", id);

    setLista(prev => prev.filter(item => item.id !== id));
  }

  function enviarWhatsapp(r){

    if(!pix){
      alert("⚠ Cadastre o PIX primeiro!");
      return;
    }

    let telefone = (r.cliente_tel || "").replace(/\D/g,"");

    if(!telefone){
      alert("Cliente sem telefone");
      return;
    }

    if(!telefone.startsWith("55")){
      telefone = "55" + telefone;
    }

    const mensagem = `Olá ${r.cliente_nome} 👋

💰 Valor: R$ ${Number(r.valor).toFixed(2)}

PIX: ${pix}

Pode realizar o pagamento hoje?
Aguardo 👍`;

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  }

  return (
    <div style={{padding:20,color:"#fff"}}>

      <h2>💰 Recebimentos</h2>

      <div style={cardPix}>
        <h3>🔑 Minha chave PIX</h3>

        <input
          style={input}
          value={pix}
          onChange={(e)=>setPix(e.target.value)}
          placeholder="Digite sua chave PIX"
        />

        <button style={botaoSalvarPix} onClick={salvarPix}>
          💾 Salvar PIX
        </button>
      </div>

      <input
        style={input}
        placeholder="🔍 Buscar cliente..."
        value={busca}
        onChange={(e)=>setBusca(e.target.value)}
      />

      {lista.length === 0 && (
        <p style={{color:"#9ca3af"}}>Nenhum recebimento encontrado</p>
      )}

      {lista
        .filter(r =>
          r.cliente_nome.toLowerCase().includes(busca.toLowerCase())
        )
        .map(r => {

          // 🔥 AVISO AUTOMÁTICO
          const hoje = new Date();
          const venc = new Date(r.data_vencimento);

          let aviso = "";
          let cor = "#9ca3af";

          if(r.status_normalizado !== "pago"){

            const diff = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));

            if(diff < 0){
              aviso = "🔴 Atrasado";
              cor = "#ef4444";
            }
            else if(diff === 0){
              aviso = "🟡 Vence hoje";
              cor = "#facc15";
            }
            else if(diff <= 3){
              aviso = `🟠 Vence em ${diff} dia(s)`;
              cor = "#fb923c";
            } else {
              aviso = "🟢 Em dia";
              cor = "#22c55e";
            }
          }

          return (

        <div key={r.id} style={card}>

          <strong style={{fontSize:16}}>
            👤 {r.cliente_nome}
          </strong>

          <div style={{marginTop:5}}>
            📅 Vencimento: {new Date(r.data_vencimento).toLocaleDateString()}
          </div>

          <div>
            💵 Valor: R$ {Number(r.valor).toFixed(2)}
          </div>

          <div style={{color:cor, fontWeight:"bold", marginTop:5}}>
            {aviso}
          </div>

          <div style={{display:"flex",gap:10,marginTop:10}}>

            <button
              onClick={()=>enviarWhatsapp(r)}
              style={botaoWhats}
            >
              📲 WhatsApp
            </button>

            {r.status_normalizado === "pago" ? (
              <button onClick={()=>reabrir(r.id)} style={botaoPago}>
                ↩️ Reabrir
              </button>
            ) : (
              <button onClick={()=>receber(r.id)} style={botaoReceber}>
                ✔ Receber
              </button>
            )}

            <button onClick={()=>excluir(r.id)} style={botaoExcluir}>
              🗑 Excluir
            </button>

          </div>

        </div>

          );

        })}

    </div>
  );
}

// 🎨 estilos

const card={ background:"#111827", padding:15, borderRadius:10, marginBottom:10 };
const cardPix={ background:"#1f2937", padding:15, borderRadius:10, marginBottom:20 };
const input={ padding:10, width:"100%", borderRadius:6, border:"none", marginBottom:10 };

const botaoSalvarPix={ padding:"10px", width:"100%", background:"#22c55e", border:"none", borderRadius:6, color:"#fff" };

const botaoWhats={ padding:"10px 16px", background:"#16a34a", border:"none", borderRadius:6, color:"#fff", cursor:"pointer" };

const botaoReceber={ padding:"10px 16px", background:"#2563eb", border:"none", borderRadius:6, color:"#fff" };

const botaoPago={ padding:"10px 16px", background:"#f59e0b", border:"none", borderRadius:6, color:"#fff", fontWeight:"bold" };

const botaoExcluir={ padding:"10px 16px", background:"#dc2626", border:"none", borderRadius:6, color:"#fff" };