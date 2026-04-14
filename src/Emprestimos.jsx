import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista() {
  const [dados, setDados] = useState([]);
  const [pixChave, setPixChave] = useState("");
  const [pixEdit, setPixEdit] = useState("");
  const [empresaRealId, setEmpresaRealId] =
    useState(null);

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

    if (!user) {
      alert("Usuário não logado");
      return;
    }

    const { data: usuario, error } =
      await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("email", user.email)
        .maybeSingle();

    if (error) {
      alert(
        "Erro usuário: " +
          error.message
      );
      return;
    }

    if (!usuario?.empresa_id) {
      alert("Empresa não encontrada");
      return;
    }

    const empresaId =
      usuario.empresa_id;

    setEmpresaRealId(empresaId);

    await carregarPix(empresaId);
    await carregarDados(empresaId);
  }

  async function carregarDados(
    empresa_id
  ) {
    const { data, error } =
      await supabase
        .from("emprestimos")
        .select("*")
        .eq(
          "empresa_id",
          empresa_id
        )
        .order(
          "data_vencimento",
          {
            ascending: true,
          }
        );

    if (error) {
      alert(
        "Erro empréstimos: " +
          error.message
      );
      return;
    }

    setDados(data || []);
  }

  async function carregarPix(
    empresa_id
  ) {
    const { data, error } =
      await supabase
        .from("empresas")
        .select(
          "id,pix_chave"
        )
        .eq("id", empresa_id)
        .maybeSingle();

    if (error) {
      alert(
        "Erro PIX: " +
          error.message
      );
      return;
    }

    if (!data) {
      setPixChave("");
      setPixEdit("");
      return;
    }

    setPixChave(
      data.pix_chave || ""
    );
    setPixEdit(
      data.pix_chave || ""
    );
  }

  async function salvarPix() {
    if (!empresaRealId) {
      alert(
        "Empresa não carregada"
      );
      return;
    }

    const { error } =
      await supabase
        .from("empresas")
        .update({
          pix_chave:
            pixEdit,
        })
        .eq(
          "id",
          empresaRealId
        );

    if (error) {
      alert(
        "Erro PIX: " +
          error.message
      );
      return;
    }

    setPixChave(pixEdit);

    alert("✅ PIX salvo!");
  }

  async function salvar() {
    if (
      !cliente ||
      !valor ||
      !dataVencimento
    ) {
      alert(
        "Preencha os campos"
      );
      return;
    }

    if (!empresaRealId) {
      alert(
        "Empresa não carregada"
      );
      return;
    }

    const valorBase =
      Number(valor);

    const jurosPct =
      Number(
        juros || 0
      );

    const total =
      valorBase +
      (valorBase *
        jurosPct) /
        100;

    const { error } =
      await supabase
        .from(
          "emprestimos"
        )
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
            total,
            data_vencimento:
              dataVencimento,
            status:
              "pendente",
          },
        ]);

    if (error) {
      alert(
        "Erro: " +
          error.message
      );
      return;
    }

    setCliente("");
    setTelefone("");
    setValor("");
    setJuros("");
    setDataVencimento("");

    carregarDados(
      empresaRealId
    );
  }

  async function marcarPago(
    id
  ) {
    await supabase
      .from(
        "emprestimos"
      )
      .update({
        status: "pago",
      })
      .eq("id", id);

    carregarDados(
      empresaRealId
    );
  }

  async function excluir(id) {
    if (
      !window.confirm(
        "Excluir empréstimo?"
      )
    )
      return;

    await supabase
      .from(
        "emprestimos"
      )
      .delete()
      .eq("id", id);

    carregarDados(
      empresaRealId
    );
  }

  function normalizarData(
    data
  ) {
    if (!data)
      return new Date();

    const txt = data
      .toString()
      .slice(0, 10);

    const partes =
      txt.split("-");

    return new Date(
      Number(partes[0]),
      Number(
        partes[1]
      ) - 1,
      Number(partes[2])
    );
  }

  function formatarData(
    data
  ) {
    return normalizarData(
      data
    ).toLocaleDateString(
      "pt-BR"
    );
  }

  function diasAtraso(
    data
  ) {
    const hoje =
      new Date();

    hoje.setHours(
      0,
      0,
      0,
      0
    );

    const venc =
      normalizarData(
        data
      );

    venc.setHours(
      0,
      0,
      0,
      0
    );

    return Math.floor(
      (hoje - venc) /
        (1000 *
          60 *
          60 *
          24)
    );
  }

  function cobrar(p) {
    let numero = String(
      p.telefone ||
        ""
    ).replace(/\D/g, "");

    if (!numero) {
      alert(
        "Cliente sem telefone"
      );
      return;
    }

    if (
      !numero.startsWith(
        "55"
      )
    ) {
      numero =
        "55" +
        numero;
    }

    const msg = `Olá ${
      p.cliente
    }

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

    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(
        msg
      )}`,
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

  const totalCarteira =
    dados.reduce(
      (s, i) =>
        s +
        Number(
          i.total || 0
        ),
      0
    );

  const totalPago =
    dados
      .filter(
        (i) =>
          i.status ===
          "pago"
      )
      .reduce(
        (s, i) =>
          s +
          Number(
            i.total || 0
          ),
        0
      );

  const totalPendente =
    totalCarteira -
    totalPago;

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
        maxWidth: 700,
        margin: "auto",
      }}
    >
      <h2>
        💰 Empréstimos
      </h2>

      <p>
        💵 Carteira: R${" "}
        {totalCarteira.toFixed(
          2
        )}
      </p>

      <p>
        ✅ Pago: R${" "}
        {totalPago.toFixed(
          2
        )}
      </p>

      <p>
        ⏳ Pendente:
        R${" "}
        {totalPendente.toFixed(
          2
        )}
      </p>

      <hr />

      <div
        style={{
          background:
            "#1f2937",
          padding: 15,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <h3>
          Minha chave PIX
        </h3>

        <input
          value={pixEdit}
          onChange={(e) =>
            setPixEdit(
              e.target
                .value
            )
          }
          style={{
            width: "100%",
            padding: 8,
          }}
        />

        <button
          onClick={
            salvarPix
          }
          style={{
            marginTop: 10,
          }}
        >
          Salvar PIX
        </button>
      </div>
    </div>
  );
}