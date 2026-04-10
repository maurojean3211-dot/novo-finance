import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Relatorio({ empresaId }) {

  const [dados, setDados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [totalVendas, setTotalVendas] = useState(0);
  const [totalComissao, setTotalComissao] = useState(0);

  useEffect(()=>{
    carregarClientes();
  },[]);

  // 🔥 BUSCA AUTOMÁTICA
  useEffect(()=>{
    if(empresaId) buscar();
  },[empresaId]);

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

    // 🔥 AGORA BUSCA DA TABELA CERTA
    let query = supabase
      .from("lancamentos")
      .select("*")
      .eq("empresa_id", empresaId);

    if(dataInicio) query = query.gte("data", dataInicio);
    if(dataFim) query = query.lte("data", dataFim);
    if(clienteFiltro) query = query.eq("cliente_id", clienteFiltro);

    const { data } = await query;

    console.log("LANCAMENTOS:", data);

    let resumo = {};
    let total = 0;
    let comissao = 0;

    (data || []).forEach(item => {

      const cliente =
        item.cliente_nome ||
        item.cliente ||
        item.nome ||
        "Sem nome";

      if(!resumo[cliente]){
        resumo[cliente] = {
          cliente,
          vendas: 0,
          compras: 0,
          comissao: 0
        };
      }

      const valor =
        Number(item.valor) ||
        Number(item.total) ||
        0;

      // 🔥 ENTRADA = VENDA
      if(item.tipo === "entrada"){
        resumo[cliente].vendas += valor;
        total += valor;

        const com = valor * 0.05;
        resumo[cliente].comissao += com;
        comissao += com;
      }

      // 🔥 SAÍDA = COMPRA
      if(item.tipo === "saida"){
        resumo[cliente].compras += valor;
      }

    });

    setDados(Object.values(resumo));
    setTotalVendas(total);
    setTotalComissao(comissao);
  }

  return (
    <div style={{padding: 20}}>

      <h2>📊 Relatório Financeiro</h2>

      {/* FILTROS */}
      <div style={{
        display:"flex",
        gap:10,
        marginBottom:20,
        flexWrap:"wrap"
      }}>

        <select onChange={(e)=>setClienteFiltro(e.target.value)}>
          <option value="">Todos clientes</option>
          {clientes.map(c=>(
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <input type="date" onChange={(e)=>setDataInicio(e.target.value)} />
        <input type="date" onChange={(e)=>setDataFim(e.target.value)} />

        <button onClick={buscar}>🔍 Buscar</button>
      </div>

      {/* DASHBOARD */}
      <div style={{display:"flex", gap:20, marginBottom:20, flexWrap:"wrap"}}>

        <div style={{background:"#111827", padding:15, borderRadius:8}}>
          <strong>📦 Total Vendas</strong>
          <div>R$ {Number(totalVendas).toFixed(2)}</div>
        </div>

        <div style={{background:"#111827", padding:15, borderRadius:8}}>
          <strong>💰 Comissão</strong>
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