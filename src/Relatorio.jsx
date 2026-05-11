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

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    if (empresaId) buscar();
  }, [empresaId]);

  async function buscar() {
    if (!empresaId) return;

    const hoje = new Date();
    const dataHoje = hoje.toISOString().slice(0, 10);
    const mesAtual = dataHoje.slice(0, 7);

    // =========================
    // BUSCA SOMENTE VENDAS
    // =========================
    let queryVendas = supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empresaId);

    // =========================
    // BUSCA SOMENTE COMPRAS
    // =========================
    let queryCompras = supabase
      .from("compras")
      .select("*")
      .eq("empresa_id", empresaId);

    if (dataInicio) {
      queryVendas = queryVendas.gte(
        "created_at",
        dataInicio
      );

      queryCompras = queryCompras.gte(
        "created_at",
        dataInicio
      );
    }

    if (dataFim) {
      queryVendas = queryVendas.lte(
        "created_at",
        dataFim + "T23:59:59"
      );

      queryCompras = queryCompras.lte(
        "created_at",
        dataFim + "T23:59:59"
      );
    }

    const {
      data: vendas,
      error: erroVendas,
    } = await queryVendas;

    const {
      data: compras,
      error: erroCompras,
    } = await queryCompras;

    if (erroVendas) {
      console.error("Erro vendas:", erroVendas);
    }

    if (erroCompras) {
      console.error("Erro compras:", erroCompras);
    }

    let resumo = {};

    let totalKg = 0;
    let totalCom = 0;

    let hojeRecebido = 0;
    let hojeCom = 0;

    let mesRecebido = 0;
    let mesCom = 0;

    // ==================================
    // PROCESSA VENDAS
    // ==================================
    (vendas || []).forEach((item) => {
      const cliente =
        item.cliente_nome ||
        item.cliente ||
        item.nome_cliente;

      const kg = Number(item.kilos) || 0;

      const nomeProduto = String(
        item.produto || ""
      ).toUpperCase();

      // 🔥 IGNORA REGISTROS INVÁLIDOS
      if (!cliente || kg <= 0) {
        return;
      }

      // 🔥 BLOQUEIA PRODUTOS ERRADOS
      if (
        nomeProduto.includes("IPHONE") ||
        nomeProduto.includes("CELULAR") ||
        nomeProduto.includes("NOTEBOOK")
      ) {
        return;
      }

      if (!resumo[cliente]) {
        resumo[cliente] = {
          cliente,
          vendas: 0,
          compras: 0,
          comissao: 0,
        };
      }

      const valor = Number(
        item.valor_total || item.valor || 0
      );

      const com =
        Number(item.comissao) || kg * 0.05;

      resumo[cliente].vendas += kg;
      resumo[cliente].comissao += com;

      totalKg += kg;
      totalCom += com;

      const dataVenda = String(
        item.created_at || ""
      ).slice(0, 10);

      if (dataVenda === dataHoje) {
        hojeRecebido += valor;
        hojeCom += com;
      }

      if (dataVenda.slice(0, 7) === mesAtual) {
        mesRecebido += valor;
        mesCom += com;
      }
    });

    // ==================================
    // PROCESSA COMPRAS
    // ==================================
    (compras || []).forEach((item) => {
      const fornecedor =
        item.fornecedor ||
        item.cliente;

      const kg = Number(item.kilos) || 0;

      const nomeProduto = String(
        item.produto || ""
      ).toUpperCase();

      // 🔥 IGNORA REGISTROS INVÁLIDOS
      if (!fornecedor || kg <= 0) {
        return;
      }

      // 🔥 BLOQUEIA PRODUTOS ERRADOS
      if (
        nomeProduto.includes("IPHONE") ||
        nomeProduto.includes("CELULAR") ||
        nomeProduto.includes("NOTEBOOK")
      ) {
        return;
      }

      if (!resumo[fornecedor]) {
        resumo[fornecedor] = {
          cliente: fornecedor,
          vendas: 0,
          compras: 0,
          comissao: 0,
        };
      }

      resumo[fornecedor].compras += kg;

      let com =
        nomeProduto.includes("LIMALHA") ||
        nomeProduto.includes("CAVACO")
          ? kg * 0.07
          : kg * 0.05;

      resumo[fornecedor].comissao += com;

      totalCom += com;

      const dataCompra = String(
        item.created_at || ""
      ).slice(0, 10);

      if (dataCompra === dataHoje) {
        hojeCom += com;
      }

      if (dataCompra.slice(0, 7) === mesAtual) {
        mesCom += com;
      }
    });

    // 🔥 REMOVE LINHAS VAZIAS
    const filtrados = Object.values(resumo).filter(
      (item) =>
        item.cliente &&
        (
          Number(item.vendas) > 0 ||
          Number(item.compras) > 0 ||
          Number(item.comissao) > 0
        )
    );

    setDados(filtrados);

    setTotalVendas(totalKg);

    setTotalComissao(totalCom);

    setRecebidoHoje(hojeRecebido);
    setComissaoHoje(hojeCom);

    setRecebidoMes(mesRecebido);
    setComissaoMes(mesCom);
  }

  function dinheiro(valor) {
    return Number(valor || 0).toLocaleString(
      "pt-BR",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  return (
    <div style={{ padding: 20, color: "#fff" }}>
      <h2>📊 Relatório Financeiro</h2>

      <div style={{ marginBottom: 15 }}>
        <input
          type="date"
          value={dataInicio}
          onChange={(e) =>
            setDataInicio(e.target.value)
          }
        />

        <input
          type="date"
          value={dataFim}
          onChange={(e) =>
            setDataFim(e.target.value)
          }
        />

        <button onClick={buscar}>
          🔍 Filtrar
        </button>
      </div>

      <button onClick={buscar}>
        🔄 Atualizar
      </button>

      <div style={{ marginTop: 20 }}>
        <p>
          💰 Hoje: R$ {dinheiro(recebidoHoje)}
        </p>

        <p>
          📊 Comissão Hoje: R${" "}
          {dinheiro(comissaoHoje)}
        </p>

        <p>
          📅 Mês: R$ {dinheiro(recebidoMes)}
        </p>

        <p>
          📈 Comissão Mês: R${" "}
          {dinheiro(comissaoMes)}
        </p>

        <p>
          ⚖️ Total KG Vendido:{" "}
          {Number(totalVendas).toLocaleString(
            "pt-BR"
          )}{" "}
          kg
        </p>

        <p>
          💵 Total Comissão: R${" "}
          {dinheiro(totalComissao)}
        </p>
      </div>

      <table
        border="1"
        style={{
          marginTop: 20,
          width: "100%",
          background: "#fff",
          color: "#000",
        }}
      >
        <thead>
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

              <td>
                {Number(item.vendas).toLocaleString(
                  "pt-BR"
                )}
              </td>

              <td>
                {Number(item.compras).toLocaleString(
                  "pt-BR"
                )}
              </td>

              <td>
                R$ {dinheiro(item.comissao)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}