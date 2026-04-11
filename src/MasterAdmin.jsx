import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function MasterAdmin() {
  const [clientes, setClientes] = useState([]);
  const [usuario, setUsuario] = useState(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [valor, setValor] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState("");

  const [editandoPermissoesId, setEditandoPermissoesId] = useState(null);
  const [permissoes, setPermissoes] = useState({});

  const [pixSistema, setPixSistema] = useState("");

  useEffect(() => {
    verificarUsuario();
  }, []);

  async function verificarUsuario() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) return;

    const { data } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", userData.user.email)
      .single();

    if (!data || data.role !== "master") {
      alert("Acesso negado");
      return;
    }

    setUsuario(data);

    await carregarClientes();
    await buscarPix();
  }

  async function carregarClientes() {
    const { data } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", { ascending: false });

    setClientes(data || []);
  }

  async function buscarPix() {
    const { data } = await supabase
      .from("configuracoes")
      .select("*")
      .eq("chave", "pix_sistema")
      .single();

    if (data) setPixSistema(data.valor);
  }

  async function salvarPix() {
    await supabase.from("configuracoes").upsert({
      chave: "pix_sistema",
      valor: pixSistema,
    });

    alert("PIX salvo!");
  }

  async function cadastrarCliente() {
    if (!nome) return alert("Nome obrigatório");

    if (editandoId) {
      await supabase
        .from("empresas")
        .update({
          name: nome,
          email,
          cpf,
          whatsapp,
          valor: Number(valor),
        })
        .eq("id", editandoId);

      setEditandoId(null);
    } else {
      await supabase.from("empresas").insert([
        {
          name: nome,
          email,
          cpf,
          whatsapp,
          valor: Number(valor),
          status: "Ativo",
          pagou: false,
          isento: false,
        },
      ]);
    }

    limpar();
    carregarClientes();
  }

  function limpar() {
    setNome("");
    setEmail("");
    setCpf("");
    setWhatsapp("");
    setValor("");
    setEditandoId(null);
  }

  function editarCliente(c) {
    setEditandoId(c.id);
    setNome(c.name || "");
    setEmail(c.email || "");
    setCpf(c.cpf || "");
    setWhatsapp(c.whatsapp || "");
    setValor(c.valor || "");
  }

  async function abrirPermissoes(c) {
    const { data } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", c.email);

    if (!data || data.length === 0) {
      alert("Cliente sem login");
      return;
    }

    const user = data[0];

    setEditandoPermissoesId(c.email);

    setPermissoes({
      dashboard: true,
      financeiro: true,
      recebimentos: true,
      clientes: true,
      emprestimos: true,
      vendas: true,
      compras: true,
      contas_pagar: true,
      relatorio: true,
      ...user.permissoes,
    });
  }

  async function salvarPermissoes() {
    await supabase
      .from("usuarios")
      .update({ permissoes })
      .eq("email", editandoPermissoesId);

    alert("Permissões salvas");
    setEditandoPermissoesId(null);
  }

  async function excluirCliente(id) {
    if (!window.confirm("Excluir cliente?")) return;

    await supabase.from("empresas").delete().eq("id", id);
    carregarClientes();
  }

  async function marcarPago(c) {
    await supabase.from("empresas").update({ pagou: true }).eq("id", c.id);
    carregarClientes();
  }

  async function marcarPendente(c) {
    await supabase.from("empresas").update({ pagou: false }).eq("id", c.id);
    carregarClientes();
  }

  async function alterarStatus(c) {
    const novo = c.status === "Ativo" ? "Bloqueado" : "Ativo";

    await supabase.from("empresas").update({ status: novo }).eq("id", c.id);
    carregarClientes();
  }

  async function alternarIsencao(c) {
    await supabase
      .from("empresas")
      .update({ isento: !c.isento })
      .eq("id", c.id);

    carregarClientes();
  }

  function enviarPix(cliente) {
    if (!pixSistema) return alert("Cadastre PIX");

    const numero = (cliente.whatsapp || "").replace(/\D/g, "");

    const msg = `Olá ${cliente.name}
Valor: ${cliente.isento ? "ISENTO" : "R$ " + cliente.valor}
PIX: ${pixSistema}`;

    window.open(
      `https://wa.me/55${numero}?text=${encodeURIComponent(msg)}`
    );
  }

  if (!usuario) {
    return <div style={{ color: "#fff", padding: 20 }}>Carregando...</div>;
  }

  const clientesFiltrados = clientes.filter((c) =>
    (c.name || "").toLowerCase().includes(busca.toLowerCase())
  );

  const totalRecebido = clientes
    .filter((c) => c.pagou)
    .reduce((soma, item) => soma + Number(item.valor || 0), 0);

  const totalPendente = clientes
    .filter((c) => !c.pagou)
    .reduce((soma, item) => soma + Number(item.valor || 0), 0);

  return (
    <div style={{ padding: 20, color: "#fff" }}>
      <h2>👑 MASTER ADMIN</h2>

      <div style={{ marginBottom: 20 }}>
        <strong>Total Recebido:</strong> R$ {totalRecebido}
        <br />
        <strong>Total Pendente:</strong> R$ {totalPendente}
      </div>

      <input
        placeholder="PIX Sistema"
        value={pixSistema}
        onChange={(e) => setPixSistema(e.target.value)}
      />
      <button onClick={salvarPix}>Salvar PIX</button>

      <br /><br />

      <input
        placeholder="Pesquisar cliente"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="CPF"
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
      />
      <input
        placeholder="WhatsApp"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
      />
      <input
        placeholder="Valor"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />

      <button onClick={cadastrarCliente}>
        {editandoId ? "Salvar" : "Cadastrar"}
      </button>

      <hr />

      {clientesFiltrados.map((c) => (
        <div
          key={c.id}
          style={{
            borderBottom: "1px solid #333",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <strong>{c.name}</strong> | R$ {c.valor} | {c.status} |{" "}
          {c.pagou ? "Pago" : "Pendente"}

          <div style={{ marginTop: 10, display: "flex", gap: 5, flexWrap: "wrap" }}>
            <button onClick={() => editarCliente(c)}>Editar</button>
            <button onClick={() => abrirPermissoes(c)}>Permissões</button>
            <button onClick={() => enviarPix(c)}>PIX</button>
            <button onClick={() => marcarPago(c)}>Pago</button>
            <button onClick={() => marcarPendente(c)}>Pend.</button>
            <button onClick={() => alterarStatus(c)}>Status</button>
            <button onClick={() => alternarIsencao(c)}>Isentar</button>

            <button
              onClick={() => excluirCliente(c.id)}
              style={{ background: "red", color: "#fff" }}
            >
              Excluir
            </button>
          </div>

          {editandoPermissoesId === c.email && (
            <div style={{ marginTop: 10 }}>
              <h4>Permissões</h4>

              {Object.keys(permissoes).map((modulo) => (
                <label
                  key={modulo}
                  style={{ display: "block", marginBottom: 5 }}
                >
                  <input
                    type="checkbox"
                    checked={!!permissoes[modulo]}
                    onChange={(e) =>
                      setPermissoes({
                        ...permissoes,
                        [modulo]: e.target.checked,
                      })
                    }
                  />{" "}
                  {modulo}
                </label>
              ))}

              <button onClick={salvarPermissoes}>
                Salvar Permissões
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}