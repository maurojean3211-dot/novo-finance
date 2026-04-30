import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// 🔥 FORMATA DATA
function formatarData(data) {
  if (!data) return "-";

  const limpa = String(data).slice(0, 10);
  const [ano, mes, dia] = limpa.split("-");

  return `${dia}/${mes}/${ano}`;
}

// 🔥 FORMATA DINHEIRO
function dinheiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Vendas() {
  const [vendas, setVendas] = useState([]);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [kilos, setKilos] = useState("");

  const [dataVenda, setDataVenda] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [empresaId, setEmpresaId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return alert("Usuário não logado");

    setUserId(user.id);

    const { data } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("email", user.email)
      .single();

    setEmpresaId(data.empresa_id);
    carregarVendas(data.empresa_id);
  }

  // 🔥 ORDEM CORRETA POR DATA
  async function carregarVendas(empId) {
    const { data } = await supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empId)
      .order("data_venda", { ascending: true }) // 👈 antigo → recente
      .order("id", { ascending: true });

    setVendas(data || []);
  }

  function calcularComissao() {
    return Number(kilos || 0) * 0.05;
  }

  async function salvarVenda() {
    if (!empresaId) return alert("Empresa não carregada");

    const payload = {
      cliente_nome: cliente.trim().toUpperCase(),
      produto,
      kilos: Number(kilos),
      comissao: calcularComissao(),
      data_venda: dataVenda,
    };

    if (editandoId) {
      await supabase
        .from("vendas")
        .update(payload)
        .eq("id", editandoId);

      alert("Atualizado!");
      setEditandoId(null);
    } else {
      await supabase.from("vendas").insert([
        {
          ...payload,
          empresa_id: empresaId,
          user_id: userId,
        },
      ]);

      alert("Venda salva!");
    }

    setCliente("");
    setProduto("");
    setKilos("");

    carregarVendas(empresaId);
  }

  function editarVenda(v) {
    setEditandoId(v.id);
    setCliente(v.cliente_nome || "");
    setProduto(v.produto || "");
    setKilos(v.kilos || "");
    setDataVenda(v.data_venda || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirVenda(id) {
    if (!confirm("Excluir?")) return;

    await supabase.from("vendas").delete().eq("id", id);
    carregarVendas(empresaId);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>
        🔥 {editandoId ? "Editar Venda" : "Vendas"}
      </h1>

      <input
        type="date"
        value={dataVenda}
        onChange={(e) => setDataVenda(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Cliente"
        value={cliente}
        onChange={(e) => setCliente(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Produto"
        value={produto}
        onChange={(e) => setProduto(e.target.value)}
      />

      <br /><br />

      <input
        type="number"
        placeholder="Kilos"
        value={kilos}
        onChange={(e) => setKilos(e.target.value)}
      />

      <br /><br />

      <p>
        <strong>💸 Comissão:</strong> R$ {dinheiro(calcularComissao())}
      </p>

      <button
        onClick={salvarVenda}
        style={{
          padding: 10,
          background: editandoId ? "orange" : "green",
          color: "#fff",
          border: "none",
          borderRadius: 5,
        }}
      >
        {editandoId ? "Atualizar" : "Salvar"}
      </button>

      <hr />

      {vendas.map((v) => (
        <div
          key={v.id}
          style={{
            border: "1px solid #ccc",
            padding: 12,
            marginBottom: 10,
            borderRadius: 8,
            background: "#fff",
            color: "#000",
          }}
        >
          📅 {formatarData(v.data_venda)} <br />
          👤 {v.cliente_nome || "-"} <br />
          📦 {v.produto || "-"} <br />
          ⚖️ {Number(v.kilos || 0).toLocaleString("pt-BR")} kg <br />
          💸 R$ {dinheiro(v.comissao)}

          <br /><br />

          <button onClick={() => editarVenda(v)}>
            ✏️ Editar
          </button>

          <button
            onClick={() => excluirVenda(v.id)}
            style={{
              marginLeft: 10,
              background: "red",
              color: "#fff",
            }}
          >
            🗑️ Excluir
          </button>
        </div>
      ))}
    </div>
  );
}