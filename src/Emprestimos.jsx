import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista() {
  const [dados, setDados] = useState([]);
  const [pixChave, setPixChave] = useState("");
  const [pixEdit, setPixEdit] = useState("");
  const [empresaRealId, setEmpresaRealId] = useState(null);

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState("");
  const [juros, setJuros] = useState("");
  const [dataVencimento, setDataVencimento] =
    useState("");

  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const {
      data: usuario,
      error,
    } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("id", user.id)
      .single();

    if (error || !usuario) return;

    setEmpresaRealId(usuario.empresa_id);

    carregarDados(usuario.empresa_id);
    carregarPix(usuario.empresa_id);
  }

  async function carregarDados(empresa_id) {
    const { data } = await supabase
      .from("emprestimos")
      .select("*")
      .eq("empresa_id", empresa_id)
      .order("data_vencimento", {
        ascending: true,
      });

    setDados(data || []);
  }

  async function carregarPix(empresa_id) {
    const { data } = await supabase
      .from("empresas")
      .select("pix_chave")
      .eq("id", empresa_id)
      .single();

    if (data) {
      setPixChave(data.pix_chave || "");
      setPixEdit(data.pix_chave || "");
    }
  }

  async function salvarPix() {
    if (!empresaRealId) {
      alert("Empresa não carregada");
      return;
    }

    const { error } = await supabase
      .from("empresas")
      .update({
        pix_chave: pixEdit,
      })
      .eq("id", empresaRealId);

    if (error) {
      alert("Erro PIX: " + error.message);
      return;
    }

    setPixChave(pixEdit);

    alert("✅ PIX salvo com sucesso!");
  }

  async function salvar() {
    if (
      !cliente ||
      !valor ||
      !dataVencimento
    ) {
      alert("Preencha os campos");
      return;
    }

    const valorBase = Number(valor);
    const jurosPct = Number(juros || 0);

    const total =
      valorBase +
      (valorBase * jurosPct) / 100;

    const { error } = await supabase
      .from("emprestimos")
      .insert([
        {
          empresa_id: empresaRealId,
          cliente,
          telefone,
          valor: valorBase,
          juros: jurosPct,
          total,
          data_vencimento: dataVencimento,
          status: "pendente",
        },
      ]);

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    setCliente("");
    setTelefone("");
    setValor("");
    setJuros("");
    setDataVencimento("");

    carregarDados(empresaRealId);
  }

  async function marcarPago(id) {
    await supabase
      .from("emprestimos")
      .update({
        status: "pago",
      })
      .eq("id", id);

    carregarDados(empresaRealId);
  }

  async function excluir(id) {
    if (
      !window.confirm(
        "Excluir empréstimo?"
      )
    )
      return;

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

    if (!numero) {
      alert("Cliente sem telefone");
      return;
    }

    if (!numero.startsWith("55")) {
      numero = "55" + numero;
    }

    const msg = `Olá ${p.cliente}

Seu empréstimo está pendente.

Valor total: R$ ${Number(
      p.total
    ).toFixed(2)}

Vencimento: ${formatarData(
      p.data_vencimento
    )}

PIX: ${
      pixChave ||
      "Informe sua chave PIX"
    }`;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(
      msg
    )}`;

    window.open(url, "_blank");
  }

  function normalizarData(data) {
    if (!data) return new Date();

    const txt = data
      .toString()
      .slice(0, 10);

    const partes = txt.split("-");

    if (partes.length === 3) {
      return new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2])
      );
    }

    return new Date(data);
  }

  function formatarData(data) {
    return normalizarData(
      data
    ).toLocaleDateString("pt-BR");
  }

  function diasAtraso(data) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const venc =
      normalizarData(data);

    venc.setHours(0, 0, 0, 0);

    return Math.floor(
      (hoje - venc) /
        (1000 *
          60 *
          60 *
          24)
    );
  }

  const dadosFiltrados =
    dados.filter((p) =>
      String(p.cliente || "")
        .toLowerCase()
        .includes(
          busca.toLowerCase()
        )
    );

  const totalCarteira =
    dados.reduce(
      (s, i) =>
        s +
        Number(i.total || 0),
      0
    );

  const totalPago =
    dados
      .filter(
        (i) =>
          i.status === "pago"
      )
      .reduce(
        (s, i) =>
          s +
          Number(i.total || 0),
        0
      );

  const totalPendente =
    totalCarteira - totalPago;

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
        maxWidth: 700,
        margin: "auto",
      }}
    >
      <h2>💰 Empréstimos</h2>

      <p>
        💵 Carteira: R${" "}
        {totalCarteira.toFixed(2)}
      </p>

      <p>
        ✅ Pago: R${" "}
        {totalPago.toFixed(2)}
      </p>

      <p>
        ⏳ Pendente: R${" "}
        {totalPendente.toFixed(2)}
      </p>

      <hr />

      <div
        style={{
          background: "#1f2937",
          padding: 15,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <h3>Minha chave PIX</h3>

        <input
          value={pixEdit}
          onChange={(e) =>
            setPixEdit(
              e.target.value
            )
          }
          style={{
            width: "100%",
            padding: 8,
          }}
        />

        <button
          onClick={salvarPix}
          style={{
            marginTop: 10,
          }}
        >
          Salvar PIX
        </button>
      </div>

      <div
        style={{
          background: "#111827",
          padding: 15,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <input
          placeholder="Cliente"
          value={cliente}
          onChange={(e) =>
            setCliente(
              e.target.value
            )
          }
        />
        <br />
        <br />

        <input
          placeholder="Telefone"
          value={telefone}
          onChange={(e) =>
            setTelefone(
              e.target.value
            )
          }
        />
        <br />
        <br />

        <input
          placeholder="Valor"
          value={valor}
          onChange={(e) =>
            setValor(
              e.target.value
            )
          }
        />
        <br />
        <br />

        <input
          placeholder="Juros %"
          value={juros}
          onChange={(e) =>
            setJuros(
              e.target.value
            )
          }
        />
        <br />
        <br />

        <input
          type="date"
          value={dataVencimento}
          onChange={(e) =>
            setDataVencimento(
              e.target.value
            )
          }
        />
        <br />
        <br />

        <button onClick={salvar}>
          Salvar
        </button>
      </div>

      <input
        placeholder="🔍 Buscar cliente"
        value={busca}
        onChange={(e) =>
          setBusca(e.target.value)
        }
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 20,
        }}
      />

      {dadosFiltrados.map((p) => {
        const atraso =
          diasAtraso(
            p.data_vencimento
          );

        let cor = "#22c55e";
        let texto = "🟢 Em dia";

        if (
          p.status === "pago"
        ) {
          cor = "#22c55e";
          texto = "✅ Pago";
        } else if (
          atraso === 0
        ) {
          cor = "#facc15";
          texto =
            "🟡 Vence hoje";
        } else if (
          atraso > 0
        ) {
          cor = "#ef4444";
          texto = `🔴 ${atraso} dia(s) atrasado`;
        }

        return (
          <div
            key={p.id}
            style={{
              background:
                "#1f2937",
              padding: 15,
              marginBottom: 10,
              borderLeft: `5px solid ${cor}`,
              borderRadius: 8,
            }}
          >
            <strong>
              {p.cliente}
            </strong>
            <br />
            📞 {p.telefone}
            <br />
            💵 R${" "}
            {Number(
              p.valor
            ).toFixed(2)}
            <br />
            📈 Juros: {p.juros}%
            <br />
            💰 Total: R${" "}
            {Number(
              p.total
            ).toFixed(2)}
            <br />
            📅{" "}
            {formatarData(
              p.data_vencimento
            )}
            <br />

            <span
              style={{
                color: cor,
              }}
            >
              {texto}
            </span>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {p.status !==
                "pago" && (
                <>
                  <button
                    onClick={() =>
                      cobrar(
                        p
                      )
                    }
                  >
                    📲 Cobrar
                  </button>

                  <button
                    onClick={() =>
                      marcarPago(
                        p.id
                      )
                    }
                  >
                    ✅ Pago
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
                  background:
                    "red",
                  color: "#fff",
                }}
              >
                🗑 Excluir
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}