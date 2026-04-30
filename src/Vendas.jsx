import { useEffect, useState } from "react";
import { supabase } from "./supabase";

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

  async function carregarVendas(empId) {
    const { data } = await supabase
      .from("vendas")
      .select("*")
      .eq("empresa_id", empId)
      .order("id", { ascending: false });

    setVendas(data || []);
  }

  function calcularComissao() {
    return Number(kilos || 0) * 0.05;
  }

  async function salvarVenda() {
    if (!empresaId) return alert("Empresa não carregada");

    await supabase.from("vendas").insert([
      {
        empresa_id: empresaId,
        cliente_nome: cliente,
        produto,
        kilos: Number(kilos),
        comissao: calcularComissao(),
        data_venda: dataVenda,
        user_id: userId,
      },
    ]);

    alert("Venda salva!");

    setCliente("");
    setProduto("");
    setKilos("");

    carregarVendas(empresaId);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>🔥 Vendas</h1>

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
        Comissão: R$ {calcularComissao().toFixed(2)}
      </p>

      <button onClick={salvarVenda}>
        Salvar
      </button>

      <hr />

      {vendas.map((v) => (
        <div key={v.id}>
          {v.cliente_nome} - {v.kilos} kg
        </div>
      ))}
    </div>
  );
}