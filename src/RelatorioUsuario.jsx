import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { MetricGrid, ModuleHeader } from "./components/operations/OperationsUI";

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function RelatorioUsuario({ empresaId }) {
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalCompras, setTotalCompras] = useState(0);

  const [qtdVendas, setQtdVendas] = useState(0);
  const [qtdCompras, setQtdCompras] = useState(0);

  useEffect(() => {
    if (empresaId) carregarDados();
  }, [empresaId]);

  async function carregarDados() {
    await Promise.all([
      carregarVendas(),
      carregarCompras(),
    ]);
  }

  async function carregarVendas() {
    const { data } = await supabase
      .from("vendas")
      .select("valor")
      .eq("empresa_id", empresaId);

    const total = (data || []).reduce(
      (soma, item) => soma + Number(item.valor || 0),
      0
    );

    setTotalVendas(total);
    setQtdVendas((data || []).length);
  }

  async function carregarCompras() {
    const { data } = await supabase
      .from("compras")
      .select("valor")
      .eq("empresa_id", empresaId);

    const total = (data || []).reduce(
      (soma, item) => soma + Number(item.valor || 0),
      0
    );

    setTotalCompras(total);
    setQtdCompras((data || []).length);
  }

  const saldo = totalVendas - totalCompras;

  return (
    <div className="ops-page">
      <ModuleHeader eyebrow="Inteligência gerencial" title="Central de Relatórios" description="Resumo financeiro consolidado da empresa." />
      <section className="report-hub"><article><span>◫</span><strong>Relatório Comercial</strong><small>Visão consolidada.</small></article><article><span>R$</span><strong>Relatório Financeiro</strong><small>Resultados atuais.</small></article><article><span>↗</span><strong>Relatório de Vendas</strong><small>Operações comerciais.</small></article><article><span>↙</span><strong>Relatório de Compras</strong><small>Aquisições registradas.</small></article><article><span>▦</span><strong>Relatório de Estoque</strong><small>Central preparada.</small></article><article><span>◎</span><strong>Relatório de Clientes</strong><small>Central preparada.</small></article><article><span>◇</span><strong>Relatório de Fornecedores</strong><small>Central preparada.</small></article><article className="planned"><span>✦</span><strong>Relatório de IA</strong><small>Módulo em planejamento.</small></article></section>
      <MetricGrid items={[{ label: "Total de vendas", value: `R$ ${dinheiro(totalVendas)}`, detail: `${qtdVendas} venda(s)`, icon: "↗", tone: "green" }, { label: "Total de compras", value: `R$ ${dinheiro(totalCompras)}`, detail: `${qtdCompras} compra(s)`, icon: "↙", tone: "amber" }, { label: "Resultado", value: `R$ ${dinheiro(saldo)}`, detail: saldo >= 0 ? "saldo positivo" : "saldo negativo", icon: "R$", tone: saldo >= 0 ? "green" : "rose" }]} />
      <div className="ops-status-panel">Os cálculos e consultas deste relatório permanecem inalterados. Novos filtros serão conectados quando houver suporte na lógica existente.</div>
    </div>
  );
}
