import { useEffect, useState } from "react";
import { supabase } from "./supabase";

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
    <div
      style={{
        padding: 20,
        color: "#fff",
        maxWidth: 700,
        margin: "0 auto",
      }}
    >
      <h1>📄 Relatório Financeiro</h1>

      <div
        style={{
          display: "grid",
          gap: 15,
          marginTop: 20,
        }}
      >
        <div style={card}>
          📦 <strong>Total de Vendas:</strong>
          <br />
          R$ {dinheiro(totalVendas)}
          <br />
          {qtdVendas} venda(s)
        </div>

        <div style={card}>
          🧱 <strong>Total de Compras:</strong>
          <br />
          R$ {dinheiro(totalCompras)}
          <br />
          {qtdCompras} compra(s)
        </div>

        <div
          style={{
            ...card,
            background:
              saldo >= 0
                ? "#14532d"
                : "#7f1d1d",
          }}
        >
          💰 <strong>Resultado:</strong>
          <br />
          R$ {dinheiro(saldo)}
        </div>
      </div>
    </div>
  );
}

const card = {
  background: "#111827",
  padding: 18,
  borderRadius: 10,
  fontSize: 18,
};