import { useState } from "react";
import { supabase } from "./supabase";

export default function Emprestimos({ empresaId }) {

  const [cliente, setCliente] = useState("");
  const [valor, setValor] = useState(0);
  const [parcelas, setParcelas] = useState(1);
  const [prazo, setPrazo] = useState(1);
  const [juros, setJuros] = useState(30); // 🔥 NOVO

  // 🔥 CÁLCULO DINÂMICO
  const total = valor + (valor * (juros / 100));
  const valorParcela = parcelas > 0 ? total / parcelas : 0;

  async function salvarEmprestimo(){

    if(!cliente || !valor){
      alert("Preencha os campos!");
      return;
    }

    // 🔥 SALVA EMPRESTIMO
    const { data:emprestimo, error } = await supabase
      .from("emprestimos")
      .insert([{
        empresa_id: empresaId,
        cliente,
        valor,
        total,
        parcelas,
        valor_parcela: valorParcela,
        prazo,
        juros // 🔥 SALVA JUROS
      }])
      .select()
      .single();

    if(error){
      console.log(error);
      alert("Erro ao salvar");
      return;
    }

    // 🔥 GERAR PARCELAS AUTOMÁTICO (AJUSTADO PRO SEU BANCO)
    const parcelasArray = [];

    for(let i = 1; i <= parcelas; i++){

      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + prazo * i);

      parcelasArray.push({
        emprestimo_id: emprestimo.id,
        empresa_id: empresaId,
        valor: valorParcela,
        data_vencimento: vencimento,
        status: "pendente",
        numero_parcela: i
      });
    }

    const { error: erroParcelas } = await supabase
      .from("parcelas")
      .insert(parcelasArray);

    if(erroParcelas){
      console.log(erroParcelas);
      alert("Erro ao salvar parcelas");
      return;
    }

    alert("Empréstimo salvo com sucesso!");

    // 🔥 LIMPAR CAMPOS
    setCliente("");
    setValor(0);
    setParcelas(1);
    setPrazo(1);
    setJuros(30);
  }

  return (
    <div>
      <h2>💸 Empréstimos</h2>

      <input
        placeholder="Cliente"
        value={cliente}
        onChange={(e)=>setCliente(e.target.value)}
      />

      <input
        type="number"
        placeholder="Valor"
        value={valor}
        onChange={(e)=>setValor(Number(e.target.value))}
      />

      <input
        type="number"
        placeholder="Juros (%)"
        value={juros}
        onChange={(e)=>setJuros(Number(e.target.value))}
      />

      <input
        type="number"
        placeholder="Parcelas"
        value={parcelas}
        onChange={(e)=>setParcelas(Number(e.target.value))}
      />

      <input
        type="number"
        min="1"
        max="30"
        placeholder="Prazo (dias)"
        value={prazo}
        onChange={(e)=>setPrazo(Number(e.target.value))}
      />

      <h3>Total: R$ {total.toFixed(2)}</h3>
      <h3>Parcela: R$ {valorParcela.toFixed(2)}</h3>

      <button onClick={salvarEmprestimo}>
        💾 Salvar
      </button>
    </div>
  );
}