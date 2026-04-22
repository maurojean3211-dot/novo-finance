import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// FORMATADOR DEFINITIVO
function formatarData(data) {
  if (!data) return "";

  const limpa = String(data).slice(0, 10);
  const [ano, mes, dia] = limpa.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function Vendas() {
  const hoje = new Date();

  const dataHoje = `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1
  ).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const [vendas, setVendas] = useState([]);
  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [kilos, setKilos] = useState("");
  const [dataVenda, setDataVenda] = useState(dataHoje);

  const [empresaId, setEmpresaId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return alert("Usuário não logado");

    setUserId(user.id);

    const { data, error } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("email", user.email)
      .single();

    if (error || !data?.empresa_id) {
      return alert("Empresa não encontrada");
    }

    setEmpresaId(data.empresa_id);
    carregarVendas(data.empresa_id);
  }

  async function carregarVendas(empId) {
    const { data, error } = await supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empId)
      .order("data_venda", { ascending: false });

    if (!error) setVendas(data || []);
  }

  async function excluirVenda(id) {
    if (!window.confirm("Excluir venda?")) return;

    await supabase.from("recebimentos").delete().eq("venda_id", id);

    await supabase
      .from("vendas")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    carregarVendas(empresaId);
  }

  function editarVenda(v) {
    setEditandoId(v.id);
    setCliente(v.cliente_nome || "");
    setProduto(v.produto || "");
    setKilos(v.kilos || "");
    setDataVenda(String(v.data_venda).slice(0, 10));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const kg = Number(kilos || 0);
  const comissao = kg * 0.05;

  async function salvarVenda() {
    if (!empresaId) return alert("Empresa não carregada");
    if (!produto.trim()) return alert("Informe o produto");
    if (kg <= 0) return alert("Kilos inválido");

    const payload = {
      cliente_nome: cliente,
      produto,
      kilos: kg,
      comissao,
      data_venda: dataVenda,
    };

    let error = null;

    if (editandoId) {
      const res = await supabase
        .from("vendas")
        .update(payload)
        .eq("id", editandoId);

      error = res.error;
    } else {
      const res = await supabase.from("vendas").insert([
        {
          ...payload,
          empresa_id: empresaId,
          user_id: userId,
        },
      ]);

      error = res.error;
    }

    if (error) return alert(error.message);

    alert(editandoId ? "✅ Atualizado!" : "✅ Venda salva!");

    setCliente("");
    setProduto("");
    setKilos("");
    setDataVenda(dataHoje);
    setEditandoId(null);

    carregarVendas(empresaId);
  }

  const vendasFiltradas = vendas.filter((v) =>
    (v.cliente_nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1>🔥 VENDAS</h1>

      <input
        type="date"
        value={dataVenda}
        onChange={(e) => setDataVenda(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <br /><br />

      <input
        placeholder="Cliente"
        value={cliente}
        onChange={(e) => setCliente(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <br /><br />

      <input
        placeholder="Produto"
        value={produto}
        onChange={(e) => setProduto(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <br /><br />

      <input
        type="number"
        placeholder="Kilos"
        value={kilos}
        onChange={(e) => setKilos(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <br /><br />

      <p>
        <strong>💸 Comissão:</strong> R$ {comissao.toFixed(2)}
      </p>

      <button
        onClick={salvarVenda}
        style={{
          padding: 12,
          width: "100%",
          background: editandoId ? "orange" : "green",
          color: "#fff",
          border: "none",
          borderRadius: 8,
        }}
      >
        {editandoId ? "Atualizar Venda" : "Salvar Venda"}
      </button>

      <hr />

      <h3>🔍 Buscar Cliente</h3>

      <input
        placeholder="Digite o nome"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <hr />

      {vendasFiltradas.map((v) => (
        <div
          key={v.id}
          style={{
            border: "1px solid #ddd",
            padding: 15,
            marginBottom: 12,
            borderRadius: 10,
            background: "#f9f9f9",
          }}
        >
          📅 {formatarData(v.data_venda)}
          <br />
          👤 {v.cliente_nome || "-"}
          <br />
          📦 {v.produto}
          <br />
          ⚖️ {Number(v.kilos).toLocaleString("pt-BR")} kg
          <br />
          💸 Comissão: R$ {Number(v.comissao || 0).toFixed(2)}

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