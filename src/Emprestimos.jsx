import { useState } from "react";
import { supabase } from "./supabase";

export default function Emprestimos({ empresaId }) {

  const [cliente, setCliente] = useState("");
  const [valor, setValor] = useState(0);
  const [juros, setJuros] = useState(30);
  const [prazo, setPrazo] = useState(30);

  // 🔥 cálculo
  const total = valor + (valor * (juros / 100));

  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + prazo);

  async function salvar(){

    if(!cliente || !valor){
      alert("Preencha os campos!");
      return;
    }

    const { error } = await supabase
      .from("emprestimos")
      .insert([{
        empresa_id: empresaId,
        cliente,
        valor,
        juros,
        total,
        prazo,
        data_vencimento: dataVencimento,
        status: "pendente"
      }]);

    if(error){
      console.log(error);
      alert("Erro ao salvar");
      return;
    }

    alert("Empréstimo salvo com sucesso!");

    // limpar campos
    setCliente("");
    setValor(0);
    setJuros(30);
    setPrazo(30);
  }

  return (
    <div style={{
      maxWidth:500,
      background:"#020617",
      padding:20,
      borderRadius:10
    }}>

      <h2>💸 Empréstimo</h2>

      <label>Cliente</label>
      <input
        style={input}
        placeholder="Nome do cliente"
        value={cliente}
        onChange={(e)=>setCliente(e.target.value)}
      />

      <label>Valor (R$)</label>
      <input
        style={input}
        type="number"
        placeholder="Ex: 2000"
        value={valor}
        onChange={(e)=>setValor(Number(e.target.value))}
      />

      <label>Juros (%)</label>
      <input
        style={input}
        type="number"
        placeholder="Ex: 30"
        value={juros}
        onChange={(e)=>setJuros(Number(e.target.value))}
      />

      <label>Prazo (dias)</label>
      <input
        style={input}
        type="number"
        placeholder="Ex: 30"
        value={prazo}
        onChange={(e)=>setPrazo(Number(e.target.value))}
      />

      <div style={{
        marginTop:20,
        padding:15,
        background:"#111827",
        borderRadius:8
      }}>
        <p><b>Total a receber:</b> R$ {total.toFixed(2)}</p>
        <p><b>Vencimento:</b> {dataVencimento.toLocaleDateString()}</p>
      </div>

      <button style={botao} onClick={salvar}>
        💾 Salvar Empréstimo
      </button>

    </div>
  );
}

// 🔥 estilos
const input = {
  width:"100%",
  padding:10,
  marginTop:5,
  marginBottom:10,
  borderRadius:6,
  border:"none"
};

const botao = {
  marginTop:15,
  width:"100%",
  padding:12,
  background:"#2563eb",
  color:"#fff",
  border:"none",
  borderRadius:8,
  cursor:"pointer"
};