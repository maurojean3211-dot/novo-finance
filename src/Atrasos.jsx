import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Atrasos({ empresaId }) {

  const [parcelas, setParcelas] = useState([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarParcelas();
  }, []);

  async function carregarParcelas(){
    const { data, error } = await supabase
      .from("parcelas")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("status", "pendente");

    if(error){
      console.log(error);
      return;
    }

    setParcelas(data);
  }

  function calcularAtraso(vencimento){
    const hoje = new Date();
    const venc = new Date(vencimento);

    const atraso = Math.floor(
      (hoje - venc) / (1000 * 60 * 60 * 24)
    );

    return atraso > 0 ? atraso : 0;
  }

  async function marcarPago(parcela){

    const hoje = new Date();

    await supabase
      .from("parcelas")
      .update({ 
        status: "pago",
        data_pagamento: hoje
      })
      .eq("id", parcela.id);

    carregarParcelas();
  }

  // 🔥 WHATSAPP PIX
  function cobrarPix(parcela){

    const numero = parcela.telefone?.replace(/\D/g, "");

    const mensagem = `Olá ${parcela.cliente},

Parcela ${parcela.numero_parcela} em atraso.

Valor: R$ ${parcela.valor}

PIX: SUA_CHAVE_AQUI`;

    const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  const filtradas = parcelas.filter(p =>
    !busca || (p.cliente?.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div>

      <h2>🚨 Atrasos</h2>

      <input
        placeholder="Buscar cliente..."
        value={busca}
        onChange={(e)=>setBusca(e.target.value)}
      />

      {filtradas.map(p => {

        const atraso = calcularAtraso(p.data_vencimento);

        if(atraso <= 0) return null;

        let cor = "#22c55e";
        if(atraso > 5) cor = "#f59e0b";
        if(atraso > 10) cor = "#ef4444";

        return (
          <div key={p.id} style={{
            background:"#111827",
            marginTop:10,
            padding:10,
            borderLeft:`5px solid ${cor}`
          }}>

            <p><b>Cliente:</b> {p.cliente}</p>
            <p><b>Parcela:</b> {p.numero_parcela}</p>
            <p><b>Valor:</b> R$ {p.valor}</p>
            <p><b>Atraso:</b> {atraso} dias</p>

            <button onClick={()=>marcarPago(p)}>
              ✅ Pago
            </button>

            <button onClick={()=>cobrarPix(p)}>
              💰 Cobrar PIX
            </button>

          </div>
        );
      })}

    </div>
  );
}