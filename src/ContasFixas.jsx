import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function ContasFixas({ empresaId }) {
  const [dados, setDados] = useState([]);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data } = await supabase
      .from("contas_fixas")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("dia_vencimento");

    setDados(data || []);
  }

  async function salvar() {
    await supabase.from("contas_fixas").insert([
      {
        empresa_id: empresaId,
        descricao,
        valor: Number(valor),
        dia_vencimento: Number(dia),
        frequencia: "Mensal"
      }
    ]);

    setDescricao("");
    setValor("");
    setDia("");

    carregar();
  }

  async function excluir(id) {
    await supabase.from("contas_fixas").delete().eq("id", id);
    carregar();
  }

  return (
    <div style={{color:"#fff",padding:20}}>
      <h2>🔁 Contas Fixas</h2>

      <input
        placeholder="Descrição"
        value={descricao}
        onChange={(e)=>setDescricao(e.target.value)}
      />

      <input
        placeholder="Valor"
        value={valor}
        onChange={(e)=>setValor(e.target.value)}
      />

      <input
        placeholder="Dia vencimento"
        value={dia}
        onChange={(e)=>setDia(e.target.value)}
      />

      <button onClick={salvar}>Salvar</button>

      <hr />

      {dados.map((item)=>(
        <div key={item.id}
        style={{
          padding:12,
          border:"1px solid #333",
          marginBottom:10,
          borderRadius:8
        }}>
          <strong>{item.descricao}</strong><br/>
          💰 R$ {item.valor}<br/>
          📅 Dia {item.dia_vencimento}

          <br/><br/>

          <button
            onClick={()=>excluir(item.id)}
            style={{background:"red",color:"#fff"}}
          >
            Excluir
          </button>
        </div>
      ))}
    </div>
  );
}