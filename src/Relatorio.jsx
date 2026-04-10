import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Relatorio({ empresaId }) {

  const [dados, setDados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [totalGeral, setTotalGeral] = useState(0);
  const [totalComissao, setTotalComissao] = useState(0);

  useEffect(()=>{
    carregarClientes();
  },[]);

  async function carregarClientes(){
    const { data } = await supabase
      .from("clientes")
      .select("id, nome");

    setClientes(data || []);
  }

  async function buscar(){

    if(!empresaId){
      alert("Empresa não carregada");
      return;
    }

    // 🔵 BUSCAR VENDAS
    let queryVendas = supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empresaId);

    if(dataInicio){
      queryVendas = queryVendas.gte("data", dataInicio);
    }

    if(dataFim){
      queryVendas = queryVendas.lte("data", dataFim);
    }

    if(clienteFiltro){
      queryVendas = queryVendas.eq("cliente_id", clienteFiltro);
    }

    const { data: vendas } = await queryVendas;

    // 🟠 BUSCAR COMPRAS
    let queryCompras = supabase
      .from("compras")
      .select("*")
      .eq("empresa_id", empresaId);

    if(dataInicio){
      queryCompras = queryCompras.gte("data", dataInicio);
    }

    if(dataFim){
      queryCompras = queryCompras.lte("data", dataFim);
    }

    if(clienteFiltro){
      queryCompras = queryCompras.eq("cliente_id", clienteFiltro);
    }

    const { data: compras } = await queryCompras;

    let resumo = {};
    let total = 0;
    let comissao = 0;

    // 🔵 PROCESSAR VENDAS
    (vendas || []).forEach(item => {

      const cliente = item.cliente_nome || item.cliente || "Sem nome";

      if(!resumo[cliente]){
        resumo[cliente] = {
          cliente,
          vendas: 0,
          compras: 0,
          comissao: 0
        };
      }

      const valor = Number(item.valor) || 0;

      resumo[cliente].vendas += valor;
      total += valor;

      const com = valor * 0.05; // 🔥 comissão 5%
      resumo[cliente].comissao += com;
      comissao += com;

    });

    // 🟠 PROCESSAR COMPRAS
    (compras || []).forEach(item => {

      const cliente = item.cliente_nome || item.cliente || "Sem nome";

      if(!resumo[cliente]){
        resumo[cliente] = {
          cliente,
          vendas: 0,
          compras: 0,
          comissao: 0
        };
      }

      resumo[cliente].compras += Number(item.valor) || 0;

    });

    setDados(Object.values(resumo));
    setTotalGeral(total);
    setTotalComissao(comissao);
  }

  return (
    <div style={{padding: 20}}>

      <h2>📊 Relatório Financeiro</h2>

      {/* FILTROS */}
      <div style={{display:"flex", gap:10, marginBottom:20}}>

        <select onChange={(e)=>setClienteFiltro(e.target.value)}>
          <option value="">Todos clientes</option>
          {clientes.map(c=>(
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <input type="date" onChange={(e)=>setDataInicio(e.target.value)} />
        <input type="date" onChange={(e)=>setDataFim(e.target.value)} />

        <button onClick={buscar}>Buscar</button>
      </div>

      {/* DASHBOARD */}
      <div style={{display:"flex", gap:20, marginBottom:20}}>

        <div style={{background:"#111827", padding:15, borderRadius:8}}>
          <strong>Total Vendas</strong>
          <div>R$ {Number(totalGeral).toFixed(2)}</div>
        </div>

        <div style={{background:"#111827", padding:15, borderRadius:8}}>
          <strong>Comissão</strong>
          <div>R$ {Number(totalComissao).toFixed(2)}</div>
        </div>

      </div>

      {/* TABELA */}
      <table border="1" cellPadding="10" style={{width:"100%"}}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Vendas</th>
            <th>Compras</th>
            <th>Comissão</th>
          </tr>
        </thead>

        <tbody>
          {dados.map((item, i)=>(
            <tr key={i}>
              <td>{item.cliente}</td>
              <td>R$ {Number(item.vendas).toFixed(2)}</td>
              <td>R$ {Number(item.compras).toFixed(2)}</td>
              <td>R$ {Number(item.comissao).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}