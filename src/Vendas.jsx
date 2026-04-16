import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { formatarData } from "./utils";

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
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarEmpresa();
  }, []);

  // ================= EMPRESA
  async function carregarEmpresa() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não logado");
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("email", user.email)
      .single();

    if (error) {
      alert("Erro ao buscar empresa");
      return;
    }

    if (!data?.empresa_id) {
      alert("Empresa não encontrada");
      return;
    }

    setEmpresaId(data.empresa_id);
    carregarVendas(data.empresa_id);
  }

  // ================= LISTAR
  async function carregarVendas(empId) {
    if (!empId) return;

    const { data, error } = await supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empId)
      .order("id", { ascending: false });

    if (error) {
      alert("Erro ao carregar vendas");
      return;
    }

    setVendas(data || []);
  }

  // ================= EXCLUIR
  async function excluirVenda(id) {
    if (!id) return;

    const confirmar = window.confirm("Excluir venda?");
    if (!confirmar) return;

    await supabase.from("recebimentos").delete().eq("venda_id", id);

    const { error } = await supabase
      .from("vendas")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert(error.message);
      return;
    }

    carregarVendas(empresaId);
  }

  // ================= EDITAR
  function editarVenda(v) {
    setEditandoId(v.id);
    setCliente(v.cliente_nome || "");
    setProduto(v.produto || "");
    setKilos(v.kilos || "");
    setDataVenda((v.data_venda || "").substring(0, 10));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ================= CALCULO
  const kg = Number(kilos || 0);
  const comissao = kg * 0.05;

  // ================= SALVAR
  async function salvarVenda() {
    if (!empresaId) {
      alert("Empresa não carregada");
      return;
    }

    if (!produto.trim()) {
      alert("Informe o produto");
      return;
    }

    if (kg <= 0) {
      alert("Kilos inválido");
      return;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("vendas")
        .update({
          cliente_nome: cliente,
          produto,
          kilos: kg,
          comissao,
          data_venda: dataVenda,
        })
        .eq("id", editandoId);

      if (error) {
        alert(error.message);
        return;
      }

      alert("✅ Atualizado!");
      setEditandoId(null);
    } else {
      const { error } = await supabase.from("vendas").insert([
        {
          empresa_id: empresaId,
          cliente_nome: cliente,
          produto,
          kilos: kg,
          comissao,
          data_venda: dataVenda,
          user_id: userId,
        },
      ]);

      if (error) {
        alert(error.message);
        return;
      }

      alert("✅ Venda salva!");
    }

    setCliente("");
    setProduto("");
    setKilos("");
    setDataVenda(new Date().toISOString().split("T")[0]);

    carregarVendas(empresaId);
  }

  // ================= BUSCA
  const vendasFiltradas = vendas.filter((v) =>
    (v.cliente_nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  // ================= TELA
  return (
    <div style={{ padding: 20 }}>
      <h1>🔥 VENDAS NOVA</h1>

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
        <strong>Comissão:</strong> R$ {comissao.toFixed(2)}
      </p>

      <button
        onClick={salvarVenda}
        style={{
          padding: 10,
          background: editandoId ? "orange" : "green",
          color: "#fff",
          border: "none",
        }}
      >
        {editandoId ? "Atualizar" : "Salvar Venda"}
      </button>

      <hr />

      <h3>🔍 Buscar Cliente</h3>

      <input
        placeholder="Digite o nome"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <hr />

      {vendasFiltradas.map((v) => (
        <div
          key={v.id}
          style={{
            border: "1px solid #ccc",
            padding: 12,
            marginBottom: 10,
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
          ⚖️ {v.kilos} kg
          <br />
          💸 Comissão: R$ {Number(v.comissao || 0).toFixed(2)}

          <br /><br />

          <button onClick={() => editarVenda(v)}>✏️ Editar</button>

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