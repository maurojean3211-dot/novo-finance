import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista() {
  const [dados, setDados] = useState([]);
  const [empresaRealId, setEmpresaRealId] = useState(null);
  const [, setCarregandoId] = useState(null);

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState("");
  const [juros, setJuros] = useState("");
  const [prazo, setPrazo] = useState("30");
  const [dataVencimento, setDataVencimento] = useState("");
  const [busca, setBusca] = useState("");

  const [pixChave, setPixChave] = useState(
    () => localStorage.getItem("chave_pix") || ""
  );

  const [pixEdit, setPixEdit] = useState(
    () => localStorage.getItem("chave_pix") || ""
  );

  async function carregarEmpresa() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("email", user.email)
      .maybeSingle();

    if (!data?.empresa_id) return;

    setEmpresaRealId(data.empresa_id);
    carregarDados(data.empresa_id);
  }

  async function carregarDados(id) {
    const { data } = await supabase
      .from("emprestimos")
      .select("*")
      .eq("empresa_id", id)
      .order("data_vencimento", { ascending: true });

    setDados(data || []);
  }

  useEffect(() => {
    const timer = window.setTimeout(carregarEmpresa, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function salvarPix() {
    setPixChave(pixEdit);
    localStorage.setItem("chave_pix", pixEdit);
    alert("PIX salvo!");
  }

  async function salvar() {
    if (!cliente || !valor || !dataVencimento) {
      alert("Preencha os campos");
      return;
    }

    const valorBase = Number(valor);
    const jurosPct = Number(juros || 0);

    const total =
      valorBase + (valorBase * jurosPct) / 100;

    await supabase.from("emprestimos").insert([
      {
        empresa_id: empresaRealId,
        cliente,
        telefone,
        valor: valorBase,
        juros: jurosPct,
        prazo,
        total,
        data_vencimento: dataVencimento,
        status: "pendente",
      },
    ]);

    setCliente("");
    setTelefone("");
    setValor("");
    setJuros("");
    setPrazo("30");
    setDataVencimento("");

    carregarDados(empresaRealId);
  }

  async function pagarJuros(p) {
    setCarregandoId(p.id);

    const valorJuros =
      (Number(p.valor) * Number(p.juros)) / 100;

    const hoje = new Date();

    const novaData = new Date(
      p.data_vencimento
    );

    novaData.setMonth(
      novaData.getMonth() + 1
    );

    const vencimento = novaData
      .toISOString()
      .slice(0, 10);

    await supabase
      .from("emprestimos")
      .update({
        data_vencimento: vencimento,
        ultimo_pagamento: hoje
          .toISOString()
          .slice(0, 10),
      })
      .eq("id", p.id);

    await carregarDados(empresaRealId);

    setCarregandoId(null);

    alert(
      `✅ Juros recebido R$ ${valorJuros.toFixed(
        2
      )}\nNovo vencimento: ${novaData.toLocaleDateString(
        "pt-BR"
      )}`
    );
  }

  async function marcarPago(id) {
    setCarregandoId(id);

    await supabase
      .from("emprestimos")
      .update({
        status: "pago",
      })
      .eq("id", id);

    await carregarDados(empresaRealId);

    setCarregandoId(null);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir?")) return;

    await supabase
      .from("emprestimos")
      .delete()
      .eq("id", id);

    carregarDados(empresaRealId);
  }

  function cobrar(p) {
    let numero = String(
      p.telefone || ""
    ).replace(/\D/g, "");

    if (!numero) return;

    if (!numero.startsWith("55")) {
      numero = "55" + numero;
    }

    const msg = `Olá ${
      p.cliente
    }, seu pagamento venceu.\nValor total: R$ ${Number(
      p.total
    ).toFixed(
      2
    )}\nPIX: ${pixChave}`;

    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(
        msg
      )}`,
      "_blank"
    );
  }

  function formatarData(data) {
    if (!data) return "";

    const [a, m, d] =
      data.split("-");

    return `${d}/${m}/${a}`;
  }

  const dadosFiltrados =
    dados.filter((p) =>
      String(p.cliente || "")
        .toLowerCase()
        .includes(busca.toLowerCase())
    );

  const totalEmprestado = dados
    .filter((x) => x.status !== "pago")
    .reduce(
      (acc, item) =>
        acc + Number(item.valor || 0),
      0
    );

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 750,
        margin: "auto",
        color: "#fff",
      }}
    >
      <h2>
        💰 Empréstimos Profissional
      </h2>

      <h3>
        Carteira Ativa: R${" "}
        {totalEmprestado.toFixed(2)}
      </h3>

      <input
        placeholder="Buscar cliente"
        value={busca}
        onChange={(e) =>
          setBusca(e.target.value)
        }
        style={inputStyle}
      />

      <div style={box}>
        <h3>PIX</h3>

        <input
          value={pixEdit}
          onChange={(e) =>
            setPixEdit(e.target.value)
          }
          style={inputStyle}
        />

        <button
          onClick={salvarPix}
          style={greenBtn}
        >
          Salvar PIX
        </button>
      </div>

      <div style={box}>
        <h3>Novo Empréstimo</h3>

        <input
          placeholder="Cliente"
          value={cliente}
          onChange={(e) =>
            setCliente(e.target.value)
          }
          style={inputStyle}
        />

        <input
          placeholder="Telefone"
          value={telefone}
          onChange={(e) =>
            setTelefone(e.target.value)
          }
          style={inputStyle}
        />

        <input
          placeholder="Valor"
          type="number"
          value={valor}
          onChange={(e) =>
            setValor(e.target.value)
          }
          style={inputStyle}
        />

        <input
          placeholder="Juros %"
          type="number"
          value={juros}
          onChange={(e) =>
            setJuros(e.target.value)
          }
          style={inputStyle}
        />

        <input
          placeholder="Prazo dias"
          type="number"
          value={prazo}
          onChange={(e) =>
            setPrazo(e.target.value)
          }
          style={inputStyle}
        />

        <input
          type="date"
          value={dataVencimento}
          onChange={(e) =>
            setDataVencimento(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <button
          onClick={salvar}
          style={greenBtn}
        >
          Salvar
        </button>
      </div>

      {dadosFiltrados.map((p) => (
        <div
          key={p.id}
          style={{
            ...box,
            background:
              p.status === "pago"
                ? "#14532d"
                : "#374151",
          }}
        >
          <strong>{p.cliente}</strong>
          <br />
          💵 Valor: R${" "}
          {Number(p.valor).toFixed(2)}
          <br />
          💸 Total: R${" "}
          {Number(p.total).toFixed(2)}
          <br />
          📅 Vence:{" "}
          {formatarData(
            p.data_vencimento
          )}
          <br />
          📌 Status: {p.status}

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 5,
              flexWrap: "wrap",
            }}
          >
            {p.status !== "pago" && (
              <>
                <button
                  onClick={() =>
                    cobrar(p)
                  }
                  style={blueBtn}
                >
                  📲 Cobrar
                </button>

                <button
                  onClick={() =>
                    pagarJuros(p)
                  }
                  style={orangeBtn}
                >
                  🔁 Juros
                </button>

                <button
                  onClick={() =>
                    marcarPago(
                      p.id
                    )
                  }
                  style={greenBtnMini}
                >
                  💰 Quitou
                </button>
              </>
            )}

            <button
              onClick={() =>
                excluir(p.id)
              }
              style={redBtn}
            >
              ❌
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const box = {
  background: "#1f2937",
  padding: 15,
  borderRadius: 8,
  marginBottom: 15,
};

const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 10,
};

const blueBtn = {
  padding: "8px 10px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
};

const greenBtn = {
  width: "100%",
  padding: 12,
  background: "#059669",
  color: "#fff",
  border: "none",
};

const greenBtnMini = {
  padding: "8px 10px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
};

const orangeBtn = {
  padding: "8px 10px",
  background: "#d97706",
  color: "#fff",
  border: "none",
};

const redBtn = {
  padding: "8px 10px",
  background: "#991b1b",
  color: "#fff",
  border: "none",
};
