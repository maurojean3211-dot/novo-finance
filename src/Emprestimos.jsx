import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EmprestimosLista() {
  const [pixChave, setPixChave] = useState(() => {
    return localStorage.getItem("chave_pix") || "11963068079";
  });

  const [pixEdit, setPixEdit] = useState(() => {
    return localStorage.getItem("chave_pix") || "11963068079";
  });

  const [dados, setDados] = useState([]);
  const [empresaRealId, setEmpresaRealId] = useState(null);

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState("");
  const [juros, setJuros] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
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

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("email", user.email)
      .maybeSingle();

    if (error || !usuario?.empresa_id) {
      alert("Empresa não encontrada");
      return;
    }

    setEmpresaRealId(usuario.empresa_id);
    carregarDados(usuario.empresa_id);
  }

  async function carregarDados(idEmpresa) {
    const { data, error } = await supabase
      .from("emprestimos")
      .select("*")
      .eq("empresa_id", idEmpresa)
      .order("data_vencimento", { ascending: true });

    if (!error) setDados(data || []);
  }

  function salvarPix() {
    setPixChave(pixEdit);
    localStorage.setItem("chave_pix", pixEdit);
    alert("✅ PIX salvo!");
  }

  async function salvar() {
    if (!cliente || !valor || !dataVencimento) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    const valorBase = Number(valor);
    const jurosPct = Number(juros || 0);
    const total = valorBase + (valorBase * jurosPct) / 100;

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
      alert(error.message);
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
      .update({ status: "pago" })
      .eq("id", id);

    carregarDados(empresaRealId);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir empréstimo?")) return;

    await supabase
      .from("emprestimos")
      .delete()
      .eq("id", id);

    carregarDados(empresaRealId);
  }

  function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function cobrar(p) {
    let numero = String(p.telefone || "").replace(/\D/g, "");

    if (!numero) {
      alert("Cliente sem telefone");
      return;
    }

    if (!numero.startsWith("55")) {
      numero = "55" + numero;
    }

    const msg = `Olá ${p.cliente}%0A%0ASeu empréstimo está pendente.%0A%0AValor total: R$ ${Number(
      p.total
    ).toFixed(2)}%0AVencimento: ${formatarData(
      p.data_vencimento
    )}%0A%0A*PIX para pagamento:*%0A${pixChave}`;

    window.open(
      `https://wa.me/${numero}?text=${msg}`,
      "_blank"
    );
  }

  const dadosFiltrados = dados.filter((p) =>
    String(p.cliente || "")
      .toLowerCase()
      .includes(busca.toLowerCase())
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
      <h2>💰 Empréstimos</h2>

      <input
        placeholder="Buscar cliente"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={inputStyle}
      />

      <div style={box}>
        <h3>PIX</h3>

        <input
          value={pixEdit}
          onChange={(e) => setPixEdit(e.target.value)}
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
        <h3>Novo Empréstimo</h3>

        <input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} style={inputStyle} />
        <input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputStyle} />
        <input placeholder="Valor" type="number" value={valor} onChange={(e) => setValor(e.target.value)} style={inputStyle} />
        <input placeholder="Juros %" type="number" value={juros} onChange={(e) => setJuros(e.target.value)} style={inputStyle} />
        <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} style={inputStyle} />

        <button
          onClick={salvar}
          style={buttonGreen}
        >
          Salvar
        </button>
      </div>

      {dadosFiltrados.map((p) => (
        <div
          key={p.id}
          style={{
            background:
              p.status === "pago"
                ? "#065f46"
                : "#374151",
            padding: 15,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <strong>{p.cliente}</strong>
          <br />
          📅 {formatarData(p.data_vencimento)}
          <br />
          💰 R$ {Number(p.total).toFixed(2)}

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 5,
            }}
          >
            {p.status === "pendente" && (
              <>
                <button
                  onClick={() => cobrar(p)}
                  style={miniBtn}
                >
                  WhatsApp
                </button>

                <button
                  onClick={() =>
                    marcarPago(p.id)
                  }
                  style={miniBtn}
                >
                  Pago
                </button>
              </>
            )}

            <button
              onClick={() => excluir(p.id)}
              style={{
                ...miniBtn,
                background: "#991b1b",
              }}
            >
              Excluir
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
  borderRadius: 5,
  border: "1px solid #374151",
};

const buttonGreen = {
  width: "100%",
  padding: 12,
  background: "#059669",
  color: "#fff",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
};

const miniBtn = {
  padding: "6px 10px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
};