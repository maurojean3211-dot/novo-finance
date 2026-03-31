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

    if(!empresaId){
      console.log("Empresa não carregada ainda");
      return;
    }

    const { data, error } = await supabase
      .from("recebimentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data_vencimento", { ascending:true });

    if(error){
      console.log("ERRO AO CARREGAR:", error);
      return;
    }

    const { data:clientes, error:erroClientes } = await supabase
      .from("clientes")
      .select("id, nome, telefone")
      .eq("empresa_id", empresaId);

    if(erroClientes){
      console.log("ERRO CLIENTES:", erroClientes);
      setLista(data || []);
      return;
    }

    const listaCompleta = (data || []).map(r => {

      const cliente = clientes?.find(c => c.id === r.cliente_id);

      return {
        ...r,
        cliente_nome: cliente?.nome || "Cliente",
        cliente_tel: cliente?.telefone || ""
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

    if(!user){
      alert("Usuário não encontrado");
      return;
    }

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

    await supabase
      .from("recebimentos")
      .update({ status: "pago" })
      .eq("id", id);

    carregar();
  }

  // 🔥 CORRIGIDO AQUI
  async function excluir(id){

    if(!window.confirm("Excluir recebimento?")) return;

    const { error } = await supabase
      .from("recebimentos")
      .delete()
      .eq("id", id);

    if(error){
      alert("Erro ao excluir");
      return;
    }

    // 🔥 REMOVE DA TELA NA HORA (SEM F5)
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

      {lista.length === 0 && (
        <p style={{color:"#9ca3af"}}>Nenhum recebimento encontrado</p>
      )}

      {lista.map(r => (

        <div key={r.id} style={card}>

          <div style={{display:"flex",justifyContent:"space-between"}}>
            <strong>{r.cliente_nome}</strong>

            <span style={{
              color: corStatus(r),
              fontWeight:"bold"
            }}>
              {r.status}
            </span>
          </div>

          <div style={{marginTop:5}}>
            💵 R$ {Number(r.valor).toFixed(2)}
          </div>

          <div style={{fontSize:13,color:"#9ca3af"}}>
            📅 {new Date(r.data_vencimento).toLocaleDateString()}
          </div>

          <div style={{display:"flex",gap:10,marginTop:10}}>

            <button
              onClick={()=>{

                let telefone = r.cliente_tel || "";
                telefone = telefone.replace(/\D/g, "");

                if(!telefone){
                  alert("Cliente sem telefone");
                  return;
                }

                if(!telefone.startsWith("55")){
                  telefone = "55" + telefone;
                }

                const mensagem = `
Olá ${r.cliente_nome} 😊

💰 Valor: R$ ${Number(r.valor).toFixed(2)}

PIX: ${pix}

Pode realizar o pagamento hoje?
Aguardo 👍
`;

                const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
                window.open(url, "_blank");

              }}
              style={botaoWhats}
            >
              📲 WhatsApp
            </button>

            {r.status !== "pago" && (
              <button
                onClick={()=>receber(r.id)}
                style={botaoReceber}
              >
                ✔ Receber
              </button>
            )}

            <button
              onClick={()=>excluir(r.id)}
              style={botaoExcluir}
            >
              🗑 Excluir
            </button>

          </div>

        </div>

      ))}

    </div>
  );
}

// 🎨 ESTILO

const card={
  background:"#111827",
  padding:15,
  borderRadius:10,
  marginBottom:10
};

const cardPix={
  background:"#1f2937",
  padding:15,
  borderRadius:10,
  marginBottom:20
};

const input={
  padding:10,
  width:"100%",
  borderRadius:6,
  border:"none",
  marginBottom:10
};

const botaoSalvarPix={
  padding:"10px",
  width:"100%",
  background:"#22c55e",
  border:"none",
  borderRadius:6,
  color:"#fff",
  cursor:"pointer"
};

const botaoWhats={
  padding:"10px 16px",
  fontSize:14,
  background:"#16a34a",
  border:"none",
  borderRadius:6,
  color:"#fff",
  cursor:"pointer"
};

const botaoReceber={
  padding:"10px 16px",
  fontSize:14,
  background:"#2563eb",
  border:"none",
  borderRadius:6,
  color:"#fff",
  cursor:"pointer"
};

const botaoExcluir={
  padding:"10px 16px",
  fontSize:14,
  background:"#dc2626",
  border:"none",
  borderRadius:6,
  color:"#fff",
  cursor:"pointer"
};