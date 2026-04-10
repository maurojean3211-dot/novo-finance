import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Relatorio({ empresaId }) {

  const [dados, setDados] = useState([]);
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalComissao, setTotalComissao] = useState(0);

  useEffect(()=>{
    if(empresaId){
      buscar();
    }
  },[empresaId]);

  async function buscar(){

    if(!empresaId){
      alert("Empresa não carregada");
      return;
    }

    // 🔵 VENDAS
    const { data: vendas } = await supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empresaId);

    // 🟠 COMPRAS
    const { data: compras } = await supabase
      .from("compras")
      .select("*")
      .eq("empresa_id", empresaId);

    console.log("VENDAS:", vendas);
    console.log("COMPRAS:", compras);

    let resumo = {};
    let total = 0;
    let comissao = 0;

    // 🔵 VENDAS
    (vendas || []).forEach(item => {

      const cliente = item.cliente_nome || "Sem nome";

      if(!resumo[cliente]){
        resumo[cliente] = {
          cliente,
          vendas: 0,
          compras: 0,
          comissao: 0
        };
      }

      const valor = Number(item.kilos) || 0;

      resumo[cliente].vendas += valor;
      total += valor;

      const com = Number(item.comissao) || (valor * 0.05);

      resumo[cliente].comissao += com;
      comissao += com;
    });

    // 🟠 COMPRAS
    (compras || []).forEach(item => {

      const cliente = item.fornecedor || "Sem nome";

      if(!resumo[cliente]){
        resumo[cliente] = {
          cliente,
          vendas: 0,
          compras: 0,
          comissao: 0
        };
      }

      const valor = Number(item.kilos) || 0;

      resumo[cliente].compras += valor;
    });

    setDados(Object.values(resumo));
    setTotalVendas(total);
    setTotalComissao(comissao);
  }

  return (
    <div style={{padding: 20}}>

      <h2>📊 Relatório Financeiro</h2>

      <button onClick={buscar} style={{marginBottom:20}}>
        🔍 Atualizar
      </button>

      <div style={{display:"flex", gap:20, marginBottom:20}}>

        <div style={{background:"#111827", padding:15, borderRadius:8}}>
          <strong>Total Vendas</strong>
          <div>R$ {totalVendas.toFixed(2)}</div>
        </div>

        <div style={{background:"#111827", padding:15, borderRadius:8}}>
          <strong>Comissão</strong>
          <div>R$ {totalComissao.toFixed(2)}</div>
        </div>

      </div>

      <table border="1" cellPadding="10" style={{width:"100%"}}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Vendas (kg)</th>
            <th>Compras (kg)</th>
            <th>Comissão</th>
          </tr>
        </thead>

        <tbody>
          {dados.map((item, i)=>(
            <tr key={i}>
              <td>{item.cliente}</td>
              <td>{item.vendas}</td>
              <td>{item.compras}</td>
              <td>R$ {item.comissao.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}