import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Recebimentos({ empresaId }) {

  const [lista, setLista] = useState([]);
  const [pix, setPix] = useState("");

  useEffect(()=>{
    if(!empresaId) return;
    carregar();
    carregarPix();
  },[empresaId]);

  async function carregar(){

    if(!empresaId) return;

    const { data, error } = await supabase
      .from("recebimentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data_vencimento", { ascending:true });

    if(error){
      console.log("ERRO AO CARREGAR:", error);
      return;
    }

    const { data:clientes } = await supabase
      .from("clientes")
      .select("id, nome, telefone, whatsapp")
      .eq("empresa_id", empresaId);

    const listaCompleta = (data || []).map(r => {

      const cliente = clientes?.find(c => c.id === r.cliente_id);

      return {
        ...r,
        cliente_nome: cliente?.nome || "Cliente",
        cliente_tel: cliente?.telefone || cliente?.whatsapp || ""
      };

    });

    setLista(listaCompleta);
  }

  async function carregarPix(){

    const { data: { user } } = await supabase.auth.getUser();
    if(!user) return;

    const { data } = await supabase
      .from("usuarios")
      .select("pix")
      .eq("id", user.id)
      .single();

    if(data?.pix){
      setPix(data.pix);
    }
  }

  async function salvarPix(){

    const { data: { user } } = await supabase.auth.getUser();

    if(!user) return;

    await supabase
      .from("usuarios")
      .update({ pix })
      .eq("id", user.id);

    alert("✅ PIX salvo!");
  }

  async function receber(id){
    await supabase
      .from("recebimentos")
      .update({ status: "pago" })
      .eq("id", id);

    carregar();
  }

  async function excluir(id){

    if(!window.confirm("Excluir recebimento?")) return;

    await supabase
      .from("recebimentos")
      .delete()
      .eq("id", id);

    setLista(prev => prev.filter(item => item.id !== id));
  }

  function corStatus(r){
    if(r.status === "pago") return "#22c55e";

    const hoje = new Date();
    const venc = new Date(r.data_vencimento);

    if(venc < hoje) return "#ef4444";

    return "#facc15";
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
        />

        <button style={botaoSalvarPix} onClick={salvarPix}>
          💾 Salvar PIX
        </button>
      </div>

      {lista.map(r => (

        <div key={r.id} style={card}>

          <strong>{r.cliente_nome}</strong>

          <div>💵 R$ {Number(r.valor).toFixed(2)}</div>

          <div>📅 {new Date(r.data_vencimento).toLocaleDateString()}</div>

          <div style={{display:"flex",gap:10,marginTop:10}}>

            <button onClick={()=>receber(r.id)} style={botaoReceber}>
              ✔ Receber
            </button>

            <button onClick={()=>excluir(r.id)} style={botaoExcluir}>
              🗑 Excluir
            </button>

          </div>

        </div>

      ))}

    </div>
  );
}

// estilos (mantidos)
const card={ background:"#111827", padding:15, borderRadius:10, marginBottom:10 };
const cardPix={ background:"#1f2937", padding:15, borderRadius:10, marginBottom:20 };
const input={ padding:10, width:"100%", borderRadius:6, border:"none", marginBottom:10 };
const botaoSalvarPix={ padding:"10px", width:"100%", background:"#22c55e", border:"none", borderRadius:6, color:"#fff" };
const botaoReceber={ padding:"10px 16px", background:"#2563eb", border:"none", borderRadius:6, color:"#fff" };
const botaoExcluir={ padding:"10px 16px", background:"#dc2626", border:"none", borderRadius:6, color:"#fff" };