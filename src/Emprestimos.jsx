import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista() {
  const [dados, setDados] = useState([]);
  const [carregandoId, setCarregandoId] = useState(null);

  const [empresaRealId, setEmpresaRealId] =
    useState(null);

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState("");
  const [juros, setJuros] = useState("");
  const [prazo, setPrazo] = useState("");
  const [dataVencimento, setDataVencimento] =
    useState("");

  const [busca, setBusca] = useState("");

  const [pixChave, setPixChave] = useState(
    () =>
      localStorage.getItem("chave_pix") ||
      "11963068079"
  );

  const [pixEdit, setPixEdit] = useState(
    () =>
      localStorage.getItem("chave_pix") ||
      "11963068079"
  );

  useEffect(() => {
    carregarEmpresa();
  }, []);

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
      .order("data_vencimento", {
        ascending: true,
      });

    setDados(data || []);
  }

  function salvarPix() {
    setPixChave(pixEdit);
    localStorage.setItem(
      "chave_pix",
      pixEdit
    );
    alert("PIX salvo!");
  }

  async function salvar() {
    const valorBase = Number(valor);
    const jurosPct = Number(juros || 0);

    const total =
      valorBase +
      (valorBase * jurosPct) / 100;

    await supabase
      .from("emprestimos")
      .insert([
        {
          empresa_id: empresaRealId,
          cliente,
          telefone,
          valor: valorBase,
          juros: jurosPct,
          prazo,
          total,
          data_vencimento:
            dataVencimento,
          status: "pendente",
        },
      ]);

    setCliente("");
    setTelefone("");
    setValor("");
    setJuros("");
    setPrazo("");
    setDataVencimento("");

    carregarDados(empresaRealId);
  }

  async function marcarPago(id) {
    setCarregandoId(id);

    await supabase
      .from("emprestimos")
      .update({
        status: "pago",
      })
      .eq("id", id);

    await carregarDados(
      empresaRealId
    );

    setCarregandoId(null);
  }

  async function pagarJuros(p) {
    setCarregandoId(p.id);

    const valorJuros =
      (Number(p.valor) *
        Number(p.juros)) /
      100;

    const hoje = new Date();

    const novaData =
      new Date();

    novaData.setDate(
      hoje.getDate() +
        Number(
          p.prazo || 30
        )
    );

    const vencimento =
      novaData
        .toISOString()
        .slice(0, 10);

    await supabase
      .from("emprestimos")
      .update({
        data_vencimento:
          vencimento,
        ultimo_pagamento:
          hoje
            .toISOString()
            .slice(0, 10),
        juros_recebido:
          valorJuros,
      })
      .eq("id", p.id);

    await carregarDados(
      empresaRealId
    );

    setCarregandoId(null);
  }

  async function excluir(id) {
    setCarregandoId(id);

    await supabase
      .from("emprestimos")
      .delete()
      .eq("id", id);

    await carregarDados(
      empresaRealId
    );

    setCarregandoId(null);
  }

  function cobrar(p) {
    let numero = String(
      p.telefone || ""
    ).replace(/\D/g, "");

    if (!numero) return;

    if (
      !numero.startsWith(
        "55"
      )
    ) {
      numero =
        "55" + numero;
    }

    const msg = `Olá ${
      p.cliente
    } seu empréstimo venceu. Valor R$ ${Number(
      p.total
    ).toFixed(
      2
    )}. PIX ${
      pixChave
    }`;

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
      String(
        p.cliente || ""
      )
        .toLowerCase()
        .includes(
          busca.toLowerCase()
        )
    );

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 700,
        margin: "auto",
        color: "#fff",
      }}
    >
      <h2>
        💰 Empréstimos
      </h2>

      <input
        placeholder="Buscar cliente"
        value={busca}
        onChange={(e) =>
          setBusca(
            e.target.value
          )
        }
        style={inputStyle}
      />

      <div style={box}>
        <h3>PIX</h3>

        <input
          value={pixEdit}
          onChange={(e) =>
            setPixEdit(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <button
          onClick={salvarPix}
          style={buttonGreen}
        >
          Salvar PIX
        </button>
      </div>

      <div style={box}>
        <h3>
          Novo Empréstimo
        </h3>

        <input
          placeholder="Cliente"
          value={cliente}
          onChange={(e) =>
            setCliente(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <input
          placeholder="Telefone"
          value={telefone}
          onChange={(e) =>
            setTelefone(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <input
          placeholder="Valor"
          type="number"
          value={valor}
          onChange={(e) =>
            setValor(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <input
          placeholder="Juros %"
          type="number"
          value={juros}
          onChange={(e) =>
            setJuros(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <input
          placeholder="Prazo"
          type="number"
          min="1"
          max="30"
          value={prazo}
          onChange={(e) =>
            setPrazo(
              e.target.value
            )
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
          style={buttonGreen}
        >
          Salvar
        </button>
      </div>

      {dadosFiltrados.map(
        (p) => (
          <div
            key={p.id}
            style={boxItem}
          >
            <strong>
              {p.cliente}
            </strong>
            <br />
            💰 R${" "}
            {Number(
              p.total
            ).toFixed(2)}
            <br />
            📅{" "}
            {formatarData(
              p.data_vencimento
            )}

            <div
              style={{
                marginTop: 10,
                display:
                  "flex",
                gap: 5,
                flexWrap:
                  "wrap",
              }}
            >
              <button
                onClick={() =>
                  cobrar(p)
                }
                style={miniBtn}
              >
                📲 Cobrar
              </button>

              <button
                disabled={
                  carregandoId ===
                  p.id
                }
                onClick={() =>
                  pagarJuros(
                    p
                  )
                }
                style={
                  miniBtnOrange
                }
              >
                {carregandoId ===
                p.id
                  ? "⏳"
                  : "🔁 Juros"}
              </button>

              <button
                disabled={
                  carregandoId ===
                  p.id
                }
                onClick={() =>
                  marcarPago(
                    p.id
                  )
                }
                style={
                  miniBtnGreen
                }
              >
                {carregandoId ===
                p.id
                  ? "⏳"
                  : "💰 Pago"}
              </button>

              <button
                disabled={
                  carregandoId ===
                  p.id
                }
                onClick={() =>
                  excluir(
                    p.id
                  )
                }
                style={
                  miniBtnRed
                }
              >
                ❌
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

const box = {
  background: "#1f2937",
  padding: 15,
  borderRadius: 8,
  marginBottom: 15,
};

const boxItem = {
  background: "#374151",
  padding: 15,
  borderRadius: 8,
  marginBottom: 10,
};

const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 10,
};

const buttonGreen = {
  width: "100%",
  padding: 12,
  background: "#059669",
  color: "#fff",
  border: "none",
};

const miniBtn = {
  padding: "6px 10px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
};

const miniBtnGreen = {
  padding: "6px 10px",
  background: "#059669",
  color: "#fff",
  border: "none",
};

const miniBtnOrange = {
  padding: "6px 10px",
  background: "#d97706",
  color: "#fff",
  border: "none",
};

const miniBtnRed = {
  padding: "6px 10px",
  background: "#991b1b",
  color: "#fff",
  border: "none",
};