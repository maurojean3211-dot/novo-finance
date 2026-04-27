import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function RelatorioUsuario({ empresaId }) {
  const [totalRecebido, setTotalRecebido] = useState(0);
  const [totalCompras, setTotalCompras] = useState(0);
  const [totalPagar, setTotalPagar] = useState(0);

  useEffect(() => {
    if (empresaId) carregarDados();
  }, [empresaId]);

  async function carregarDados() {
    await Promise.all([
      carregarRecebimentos(),
      carregarCompras(),
      carregarContasPagar(),
    ]);
  }

  async function carregarRecebimentos() {
    const { data } = await supabase
      .from("recebimentos")
      .select("valor")
      .eq("empresa_id", empresaId);

    const total = (data || []).reduce(
      (soma, item) => soma + Number(item.valor || 0),
      0
    );

    setTotalRecebido(total);
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
  }

  async function carregarContasPagar() {
    const { data } = await supabase
      .from("contas_pagar")
      .select("valor,status")
      .eq("empresa_id", empresaId);

    const total = (data || [])
      .filter((item) => item.status !== "Pago")
      .reduce(
        (soma, item) => soma + Number(item.valor || 0),
        0
      );

    setTotalPagar(total);
  }

  const saldo =
    totalRecebido - totalCompras - totalPagar;

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
        <div
          style={{
            ...card,
            background:
              saldo >= 0
                ? "#14532d"
                : "#7f1d1d",
          }}
        >
          💰 <strong>Saldo Atual:</strong>
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