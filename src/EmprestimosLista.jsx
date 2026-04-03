import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista({ empresaId }) {

  const [dados, setDados] = useState([]);

  useEffect(()=>{
    carregar();
  },[]);

  async function carregar(){
    const { data, error } = await supabase
      .from("emprestimos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data_vencimento", { ascending: true });

    if(error){
      console.log(error);
      return;
    }

    setDados(data || []);
  }

  function calcularAtraso(data_vencimento){
    const hoje = new Date();
    const venc = new Date(data_vencimento);

    const dias = Math.floor((hoje - venc) / (1000*60*60*24));
    return dias > 0 ? dias : 0;
  }

  async function marcarPago(id){
    await supabase
      .from("emprestimos")
      .update({ status:"pago" })
      .eq("id", id);

    carregar();
  }

  async function excluir(id){
    if(!confirm("Deseja excluir esse empréstimo?")) return;

    await supabase
      .from("emprestimos")
      .delete()
      .eq("id", id);

    carregar();
  }

  function cobrar(p){

    const mensagem = `Olá ${p.cliente},

Você tem um pagamento pendente.

Valor: R$ ${p.total}

Vencimento: ${new Date(p.data_vencimento).toLocaleDateString()}

PIX: SUA_CHAVE_AQUI`;

    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  }

  return (
    <div>

      <h2>📋 Cobrança de Empréstimos</h2>

      {dados.map(p=>{

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
            <p><b>Valor:</b> R$ {p.valor}</p>
            <p><b>Total:</b> R$ {p.total}</p>
            <p><b>Vencimento:</b> {new Date(p.data_vencimento).toLocaleDateString()}</p>

            {p.status === "pago" ? (
              <p style={{color:"#22c55e"}}>✅ Pago</p>
            ) : atraso > 0 ? (
              <p style={{color:"#ef4444"}}>🔴 Atrasado {atraso} dias</p>
            ) : (
              <p style={{color:"#22c55e"}}>🟢 Em dia</p>
            )}

            <div style={{marginTop:10, display:"flex", gap:10}}>

              <button onClick={()=>cobrar(p)}>
                💰 PIX
              </button>

              <button onClick={()=>marcarPago(p.id)}>
                ✅ Pago
              </button>

              <button onClick={()=>excluir(p.id)}>
                🗑️ Excluir
              </button>

            </div>

          </div>
        );
      })}

    </div>
  );
}