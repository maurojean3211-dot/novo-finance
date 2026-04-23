import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista() {
  const [pixChave, setPixChave] = useState(
    () =>
      localStorage.getItem(
        "chave_pix"
      ) || "11963068079"
  );

  const [pixEdit, setPixEdit] =
    useState(
      () =>
        localStorage.getItem(
          "chave_pix"
        ) || "11963068079"
    );

  const [dados, setDados] =
    useState([]);
  const [empresaRealId, setEmpresaRealId] =
    useState(null);

  const [cliente, setCliente] =
    useState("");
  const [telefone, setTelefone] =
    useState("");
  const [valor, setValor] =
    useState("");
  const [juros, setJuros] =
    useState("");
  const [prazo, setPrazo] =
    useState("");
  const [
    dataVencimento,
    setDataVencimento,
  ] = useState("");
  const [busca, setBusca] =
    useState("");

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) return;

    const { data } =
      await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("email", user.email)
        .maybeSingle();

    if (!data?.empresa_id)
      return;

    setEmpresaRealId(
      data.empresa_id
    );
    carregarDados(
      data.empresa_id
    );
  }

  async function carregarDados(
    empresaId
  ) {
    const { data } =
      await supabase
        .from("emprestimos")
        .select("*")
        .eq(
          "empresa_id",
          empresaId
        )
        .order(
          "data_vencimento",
          {
            ascending: true,
          }
        );

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
    if (
      !cliente ||
      !valor ||
      !dataVencimento
    ) {
      alert(
        "Preencha os campos obrigatórios"
      );
      return;
    }

    if (
      Number(prazo) < 1 ||
      Number(prazo) > 30
    ) {
      alert(
        "Prazo deve ser entre 1 e 30 dias"
      );
      return;
    }

    const valorBase =
      Number(valor);

    const jurosPct =
      Number(juros || 0);

    const total =
      valorBase +
      (valorBase *
        jurosPct) /
        100;

    await supabase
      .from("emprestimos")
      .insert([
        {
          empresa_id:
            empresaRealId,
          cliente,
          telefone,
          valor:
            valorBase,
          juros:
            jurosPct,
          prazo,
          total,
          data_vencimento:
            dataVencimento,
          status:
            "pendente",
        },
      ]);

    setCliente("");
    setTelefone("");
    setValor("");
    setJuros("");
    setPrazo("");
    setDataVencimento("");

    carregarDados(
      empresaRealId
    );
  }

  async function marcarPago(id) {
    await supabase
      .from("emprestimos")
      .update({
        status: "pago",
      })
      .eq("id", id);

    carregarDados(
      empresaRealId
    );
  }

  async function excluir(id) {
    await supabase
      .from("emprestimos")
      .delete()
      .eq("id", id);

    carregarDados(
      empresaRealId
    );
  }

  function formatarData(data) {
    if (!data) return "";

    const [a, m, d] =
      data.split("-");

    return `${d}/${m}/${a}`;
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
    }%0ASeu empréstimo venceu.%0AValor: R$ ${Number(
      p.total
    ).toFixed(
      2
    )}%0AVencimento: ${formatarData(
      p.data_vencimento
    )}%0APIX: ${pixChave}`;

    window.open(
      `https://wa.me/${numero}?text=${msg}`,
      "_blank"
    );
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
        💰 Gestão de Empréstimos
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
        <h3>
          Configuração PIX
        </h3>

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
          style={
            buttonGreen
          }
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
          type="number"
          min="1"
          max="30"
          placeholder="Prazo (1 a 30 dias)"
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
          value={
            dataVencimento
          }
          onChange={(e) =>
            setDataVencimento(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <button
          onClick={salvar}
          style={
            buttonGreen
          }
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
            <br />
            ⏳{" "}
            {p.prazo} dias

            <div
              style={{
                marginTop: 10,
                display:
                  "flex",
                gap: 5,
              }}
            >
              {p.status ===
                "pendente" && (
                <>
                  <button
                    onClick={() =>
                      cobrar(
                        p
                      )
                    }
                    style={
                      miniBtn
                    }
                  >
                    WhatsApp
                  </button>

                  <button
                    onClick={() =>
                      marcarPago(
                        p.id
                      )
                    }
                    style={
                      miniBtn
                    }
                  >
                    Pago
                  </button>
                </>
              )}

              <button
                onClick={() =>
                  excluir(
                    p.id
                  )
                }
                style={{
                  ...miniBtn,
                  background:
                    "#991b1b",
                }}
              >
                Excluir
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
  borderRadius: 5,
};

const buttonGreen = {
  width: "100%",
  padding: 12,
  background: "#059669",
  color: "#fff",
  border: "none",
  borderRadius: 5,
};

const miniBtn = {
  padding: "6px 10px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 5,
};