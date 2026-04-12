import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Relatorio({ empresaId }) {
  const [dados, setDados] = useState([]);
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalComissao, setTotalComissao] = useState(0);

  const [recebidoHoje, setRecebidoHoje] = useState(0);
  const [comissaoHoje, setComissaoHoje] = useState(0);

  const [recebidoMes, setRecebidoMes] = useState(0);
  const [comissaoMes, setComissaoMes] = useState(0);

  useEffect(() => {
    if (empresaId) {
      buscar();
    }
  }, [empresaId]);

  async function buscar() {
    if (!empresaId) {
      alert("Empresa não carregada");
      return;
    }

    const hoje = new Date();
    const dataHoje = hoje.toISOString().slice(0, 10);
    const mesAtual = dataHoje.slice(0, 7);

    const { data: vendas } = await supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empresaId);

    const { data: compras } = await supabase
      .from("compras")
      .select("*")
      .eq("empresa_id", empresaId);

    let resumo = {};
    let total = 0;
    let comissao = 0;

    let hojeRecebido = 0;
    let hojeComissao = 0;

    let mesRecebido = 0;
    let mesComissao = 0;

    // ================= VENDAS =================
    (vendas || []).forEach((item) => {
      const cliente =
        item.cliente_nome ||
        item.cliente ||
        item.nome_cliente ||
        "Sem nome";

      if (!resumo[cliente]) {
        resumo[cliente] = {
          cliente,
          vendas: 0,
          compras: 0,
          comissao: 0,
        };
      }

      const kg = Number(item.kilos) || 0;
      const valor = Number(item.valor_total || item.valor || 0);

      resumo[cliente].vendas += kg;
      total += kg;

      const com = Number(item.comissao) || kg * 0.05;

      resumo[cliente].comissao += com;
      comissao += com;

      const dataVenda = (
        item.created_at ||
        item.data ||
        ""
      ).slice(0, 10);

      if (dataVenda === dataHoje) {
        hojeRecebido += valor;
        hojeComissao += com;
      }

      if (dataVenda.slice(0, 7) === mesAtual) {
        mesRecebido += valor;
        mesComissao += com;
      }
    });

    // ================= COMPRAS =================
    (compras || []).forEach((item) => {
      const fornecedor =
        item.fornecedor ||
        item.nome_fornecedor ||
        "Sem nome";

      if (!resumo[fornecedor]) {
        resumo[fornecedor] = {
          cliente: fornecedor,
          vendas: 0,
          compras: 0,
          comissao: 0,
        };
      }

      const kg = Number(item.kilos) || 0;

      resumo[fornecedor].compras += kg;

      const nomeProduto = (
        item.produto || ""
      ).toUpperCase();

      let com = 0;

      if (
        nomeProduto.includes("LIMALHA") ||
        nomeProduto.includes("CAVACO")
      ) {
        com = kg * 0.07;
      } else {
        com = kg * 0.05;
      }

      resumo[fornecedor].comissao += com;
      comissao += com;

      const dataCompra = (
        item.created_at ||
        item.data ||
        ""
      ).slice(0, 10);

      if (dataCompra === dataHoje) {
        hojeComissao += com;
      }

      if (dataCompra.slice(0, 7) === mesAtual) {
        mesComissao += com;
      }
    });

    setDados(Object.values(resumo));
    setTotalVendas(total);
    setTotalComissao(comissao);

    setRecebidoHoje(hojeRecebido);
    setComissaoHoje(hojeComissao);

    setRecebidoMes(mesRecebido);
    setComissaoMes(mesComissao);
  }

  function dinheiro(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <div style={{ padding: 20, color: "#fff" }}>
      <h2>📊 Relatório Financeiro</h2>

      <button
        onClick={buscar}
        style={{ marginBottom: 20 }}
      >
        🔍 Atualizar
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 15,
          marginBottom: 20,
        }}
      >
        <div style={card}>
          <strong>Recebido Hoje</strong>
          <div>R$ {dinheiro(recebidoHoje)}</div>
        </div>

        <div style={card}>
          <strong>Comissão Hoje</strong>
          <div>R$ {dinheiro(comissaoHoje)}</div>
        </div>

        <div style={card}>
          <strong>Recebido no Mês</strong>
          <div>R$ {dinheiro(recebidoMes)}</div>
        </div>

        <div style={card}>
          <strong>Comissão no Mês</strong>
          <div>R$ {dinheiro(comissaoMes)}</div>
        </div>

        <div style={card}>
          <strong>Total KG</strong>
          <div>{totalVendas.toFixed(2)}</div>
        </div>

        <div style={card}>
          <strong>Comissão Geral</strong>
          <div>R$ {dinheiro(totalComissao)}</div>
        </div>
      </div>

      <table
        border="1"
        cellPadding="10"
        style={{
          width: "100%",
          background: "#ffffff",
          color: "#000000",
          borderCollapse: "collapse",
        }}
      >
        <thead style={{ background: "#2563eb", color: "#fff" }}>
          <tr>
            <th>Cliente / Fornecedor</th>
            <th>Vendas (kg)</th>
            <th>Compras (kg)</th>
            <th>Comissão</th>
          </tr>
        </thead>

        <tbody>
          {dados.map((item, i) => (
            <tr key={i}>
              <td>{item.cliente}</td>
              <td>{item.vendas}</td>
              <td>{item.compras}</td>
              <td>
                R$ {dinheiro(item.comissao)}
              </td>
            </tr>
          ))}

          {dados.length === 0 && (
            <tr>
              <td colSpan="4" align="center">
                Nenhum registro encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const card = {
  background: "#111827",
  padding: 15,
  borderRadius: 8,
  color: "#fff",
};