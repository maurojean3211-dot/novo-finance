import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function formatarData(data) {
  if (!data) return "";

  const limpa = String(data).slice(0, 10);
  const [ano, mes, dia] = limpa.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function ComprasUsuario() {
  const hoje = new Date();

  const dataHoje = `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1
  ).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const [compras, setCompras] = useState([]);

  const [fornecedor, setFornecedor] = useState("");
  const [produto, setProduto] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [tipo, setTipo] = useState("UN");
  const [valor, setValor] = useState("");
  const [dataCompra, setDataCompra] = useState(dataHoje);

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
    carregarCompras(data.empresa_id);
  }

  async function carregarCompras(empId) {
    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .eq("empresa_id", empId)
      .order("data_compra", { ascending: false })
      .order("id", { ascending: false });

    if (!error) setCompras(data || []);
  }

  async function salvarCompra() {
    if (!empresaId) return alert("Empresa não carregada");
    if (!fornecedor.trim()) return alert("Informe o fornecedor");
    if (!produto.trim()) return alert("Informe o produto");
    if (!quantidade) return alert("Informe a quantidade");
    if (!valor) return alert("Informe o valor");

    const payload = {
      fornecedor,
      produto,
      kilos: Number(quantidade),
      tipo_medida: tipo,
      valor: Number(valor),
      comissao: 0,
      data_compra: dataCompra,
    };

    let error = null;

    if (editandoId) {
      const res = await supabase
        .from("compras")
        .update(payload)
        .eq("id", editandoId)
        .eq("empresa_id", empresaId);

      error = res.error;
    } else {
      const res = await supabase.from("compras").insert([
        {
          ...payload,
          empresa_id: empresaId,
          user_id: userId,
        },
      ]);

      error = res.error;
    }

    if (error) return alert(error.message);

    alert(editandoId ? "Compra atualizada!" : "Compra salva!");

    limpar();
    carregarCompras(empresaId);
  }

  function limpar() {
    setFornecedor("");
    setProduto("");
    setQuantidade("");
    setTipo("UN");
    setValor("");
    setDataCompra(dataHoje);
    setEditandoId(null);
  }

  function editarCompra(c) {
    setEditandoId(c.id);
    setFornecedor(c.fornecedor || "");
    setProduto(c.produto || "");
    setQuantidade(c.kilos || "");
    setTipo(c.tipo_medida || "UN");
    setValor(c.valor || "");
    setDataCompra(String(c.data_compra).slice(0, 10));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirCompra(id) {
    if (!window.confirm("Excluir compra?")) return;

    await supabase
      .from("compras")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    carregarCompras(empresaId);
  }

  const comprasFiltradas = compras.filter((c) =>
    (c.fornecedor || "")
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 600,
        margin: "0 auto",
        color: "#fff",
      }}
    >
      <h1>🧱 COMPRAS</h1>

      <input
        type="date"
        value={dataCompra}
        onChange={(e) => setDataCompra(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <p style={{ color: "#cbd5e1" }}>
        📅 {formatarData(dataCompra)}
      </p>

      <br />

      <input
        placeholder="Fornecedor"
        value={fornecedor}
        onChange={(e) => setFornecedor(e.target.value)}
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
        placeholder="Quantidade"
        value={quantidade}
        onChange={(e) => setQuantidade(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <br /><br />

      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      >
        <option value="UN">Unidade</option>
        <option value="KG">Kilo</option>
      </select>

      <br /><br />

      <input
        type="number"
        placeholder="Valor"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <br /><br />

      <button
        onClick={salvarCompra}
        style={{
          width: "100%",
          padding: 12,
          background: editandoId ? "orange" : "green",
          color: "#fff",
          border: "none",
          borderRadius: 8,
        }}
      >
        {editandoId ? "Atualizar Compra" : "Salvar Compra"}
      </button>

      <hr />

      <h3>🔍 Buscar Fornecedor</h3>

      <input
        placeholder="Digite o nome"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <hr />

      {comprasFiltradas.map((c) => (
        <div
          key={c.id}
          style={{
            border: "1px solid #ddd",
            padding: 15,
            marginBottom: 12,
            borderRadius: 10,
            background: "#fff",
            color: "#111",
          }}
        >
          📅 {formatarData(c.data_compra)}
          <br />
          👤 {c.fornecedor}
          <br />
          📦 {c.produto}
          <br />
          🔢 {c.kilos} {c.tipo_medida || "UN"}
          <br />
          💵 R$ {Number(c.valor || 0).toFixed(2)}

          <br /><br />

          <button onClick={() => editarCompra(c)}>
            ✏️ Editar
          </button>

          <button
            onClick={() => excluirCompra(c.id)}
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