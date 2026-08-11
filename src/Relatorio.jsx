import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { FilterBar, MetricGrid, ModuleHeader } from "./components/operations/OperationsUI";
import { getPurchaseCommissionData, getStoredOrCalculatedCommission } from "./services/commissionEngine";

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

  const buscar = useCallback(async () => {
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

      const com = getStoredOrCalculatedCommission(item);

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

      const com = getPurchaseCommissionData(item).commission;

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
  }, [dataFim, dataInicio, empresaId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (empresaId) void buscar(); }, 0);
    return () => window.clearTimeout(timer);
  }, [buscar, empresaId]);

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
    <div className="ops-page">
      <ModuleHeader eyebrow="Inteligência gerencial" title="Central de Relatórios" description="Consolide indicadores operacionais e financeiros sem alterar os cálculos atuais." />
      <section className="report-hub">
        <article><span>◫</span><strong>Relatório Comercial</strong><small>Visão consolidada das operações.</small></article>
        <article><span>R$</span><strong>Relatório Financeiro</strong><small>Resultados e comissões atuais.</small></article>
        <article><span>↗</span><strong>Relatório de Vendas</strong><small>Volumes e clientes atendidos.</small></article>
        <article><span>↙</span><strong>Relatório de Compras</strong><small>Volumes e fornecedores.</small></article>
        <article><span>▦</span><strong>Relatório de Estoque</strong><small>Central preparada para o módulo.</small></article>
        <article><span>◎</span><strong>Relatório de Clientes</strong><small>Central preparada para o módulo.</small></article>
        <article><span>◇</span><strong>Relatório de Fornecedores</strong><small>Central preparada para o módulo.</small></article>
        <article className="planned"><span>✦</span><strong>Relatório de IA</strong><small>Módulo em planejamento.</small></article>
      </section>

      <FilterBar>
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
          Gerar relatório
        </button>
        <button onClick={() => { setDataInicio(""); setDataFim(""); }}>Limpar filtros</button>
      </FilterBar>

      <MetricGrid items={[{ label: "Recebido hoje", value: `R$ ${dinheiro(recebidoHoje)}`, detail: "resultado diário", icon: "R$", tone: "green" }, { label: "Comissão hoje", value: `R$ ${dinheiro(comissaoHoje)}`, detail: "comissão diária", icon: "%" }, { label: "Recebido no mês", value: `R$ ${dinheiro(recebidoMes)}`, detail: "resultado mensal", icon: "↗", tone: "green" }, { label: "Comissão no mês", value: `R$ ${dinheiro(comissaoMes)}`, detail: "comissão mensal", icon: "%", tone: "amber" }, { label: "KG vendidos", value: Number(totalVendas).toLocaleString("pt-BR"), detail: `R$ ${dinheiro(totalComissao)} em comissões`, icon: "⚖" }]} />

      <section className="ops-panel"><div className="ops-panel__header"><h2>Resultado consolidado</h2><span>{dados.length} registro(s)</span></div><div className="ops-table-wrap"><table className="ops-table">
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
      </table></div></section>
    </div>
  );
}
