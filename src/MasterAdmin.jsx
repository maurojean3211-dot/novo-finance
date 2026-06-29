import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function MasterAdmin() {
  const [clientes, setClientes] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [busca, setBusca] = useState("");
  const [pixSistema, setPixSistema] = useState("");

  const [editandoPermissoesId, setEditandoPermissoesId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    valor: "",
    whatsapp: "",
  });

  const [novoUsuario, setNovoUsuario] = useState({
    name: "",
    email: "",
    whatsapp: "",
    valor: "",
  });

  const permissoesPadrao = {
    dashboard: true,
    financeiro: true,
    recebimentos: true,
    clientes: true,
    emprestimos: true,
    vendas: false,
    compras: false,
    contas_pagar: true,
    contas_fixas: true,
    pessoal: true,
    relatorio: false,
  };

  const [permissoes, setPermissoes] = useState(permissoesPadrao);

  useEffect(() => {
    verificarUsuario();
  }, []);

  async function verificarUsuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (!data || data.role !== "master") {
      alert("Acesso negado");
      await supabase.auth.signOut();
      window.location.href = "/";
      return;
    }

    setUsuario(data);
    carregarClientes();
    buscarPix();
  }

  async function carregarClientes() {
    const { data } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setClientes(data || []);
  }

  async function buscarPix() {
    const { data } = await supabase
      .from("configuracoes")
      .select("*")
      .eq("chave", "pix_sistema")
      .maybeSingle();

    if (data) {
      setPixSistema(data.valor || "");
    }
  }

  async function salvarPix() {
    const { error } = await supabase.from("configuracoes").upsert({
      chave: "pix_sistema",
      valor: pixSistema,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("PIX salvo!");
  }

  async function criarUsuario() {
    if (!novoUsuario.name || !novoUsuario.email) {
      alert("Preencha nome e email");
      return;
    }

    const { data: usuarioExistente, error: erroBuscaUsuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", novoUsuario.email)
      .maybeSingle();

    if (erroBuscaUsuario) {
      alert(erroBuscaUsuario.message);
      return;
    }

    if (usuarioExistente) {
      alert("Já existe um usuário com este email");
      return;
    }

    const { data: empresaExistente, error: erroBuscaEmpresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("email", novoUsuario.email)
      .maybeSingle();

    if (erroBuscaEmpresa) {
      alert(erroBuscaEmpresa.message);
      return;
    }

    if (empresaExistente) {
      alert("Já existe uma empresa/cliente com este email");
      return;
    }

    const { error: erroEmpresa } = await supabase.from("empresas").insert({
      name: novoUsuario.name,
      email: novoUsuario.email,
      whatsapp: novoUsuario.whatsapp,
      valor: novoUsuario.valor,
      status: "Ativo",
      pagou: false,
      isento: false,
    });

    if (erroEmpresa) {
      alert(erroEmpresa.message);
      return;
    }

    const { error: erroUsuario } = await supabase.from("usuarios").insert({
      name: novoUsuario.name,
      email: novoUsuario.email,
      role: "cliente",
      permissoes: permissoesPadrao,
    });

    if (erroUsuario) {
      alert(erroUsuario.message);
      return;
    }

    alert("Usuário criado!");

    setNovoUsuario({
      name: "",
      email: "",
      whatsapp: "",
      valor: "",
    });

    carregarClientes();
  }

  function abrirEditar(c) {
    setEditandoId(c.id);

    setForm({
      name: c.name || "",
      valor: c.valor || "",
      whatsapp: c.whatsapp || "",
    });
  }

  async function salvarEdicao() {
    const { error } = await supabase
      .from("empresas")
      .update({
        name: form.name,
        valor: form.valor,
        whatsapp: form.whatsapp,
      })
      .eq("id", editandoId);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Cliente atualizado!");
    setEditandoId(null);
    carregarClientes();
  }

  async function excluirCliente(c) {
    const ok = confirm("Deseja excluir este cliente?");

    if (!ok) return;

    await supabase.from("usuarios").delete().eq("email", c.email);
    await supabase.from("empresas").delete().eq("id", c.id);

    alert("Cliente excluído!");
    carregarClientes();
  }

  async function abrirPermissoes(c) {
    const emailBusca = c.email || "";

    if (!emailBusca) {
      alert("Cliente sem email cadastrado");
      return;
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("email, permissoes")
      .eq("email", emailBusca)
      .maybeSingle();

    if (error) {
      alert(error.message);
      return;
    }

    if (!data) {
      alert("Cliente sem login na tabela usuarios");
      return;
    }

    let banco = {};

    try {
      banco =
        typeof data.permissoes === "string"
          ? JSON.parse(data.permissoes)
          : data.permissoes || {};
    } catch {
      banco = {};
    }

    setEditandoPermissoesId(emailBusca);

    setPermissoes({
      ...permissoesPadrao,
      ...banco,
    });
  }

  async function salvarPermissoes() {
    const payload = {};

    Object.keys(permissoesPadrao).forEach((item) => {
      payload[item] = !!permissoes[item];
    });

    const { error } = await supabase
      .from("usuarios")
      .update({
        permissoes: payload,
      })
      .eq("email", editandoPermissoesId);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Permissões salvas!");
    setEditandoPermissoesId(null);
  }

  async function marcarPago(c) {
    await supabase
      .from("empresas")
      .update({
        pagou: true,
      })
      .eq("id", c.id);

    carregarClientes();
  }

  async function marcarPendente(c) {
    await supabase
      .from("empresas")
      .update({
        pagou: false,
      })
      .eq("id", c.id);

    carregarClientes();
  }

  async function alterarStatus(c) {
    const novo = c.status === "Ativo" ? "Bloqueado" : "Ativo";

    await supabase
      .from("empresas")
      .update({
        status: novo,
      })
      .eq("id", c.id);

    carregarClientes();
  }

  async function alternarIsencao(c) {
    const atual = c.isento === true || c.isento === "true" || c.isento === 1;

    const { error } = await supabase
      .from("empresas")
      .update({
        isento: !atual,
      })
      .eq("id", c.id);

    if (error) {
      alert(error.message);
      return;
    }

    carregarClientes();
  }

  function enviarPix(cliente) {
    let numero = String(cliente.whatsapp || "").replace(/\D/g, "");

    if (!numero.startsWith("55")) {
      numero = "55" + numero;
    }

    const msg = `Olá ${cliente.name}
Valor: ${cliente.isento ? "ISENTO" : "R$ " + cliente.valor}
PIX: ${pixSistema}`;

    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  }

  if (!usuario) {
    return <div style={{ color: "#fff" }}>Carregando...</div>;
  }

  const clientesFiltrados = clientes.filter((c) =>
    (c.name || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
      }}
    >
      <h2>👑 MASTER ADMIN</h2>

      <input
        placeholder="PIX Sistema"
        value={pixSistema}
        onChange={(e) => setPixSistema(e.target.value)}
      />

      <button onClick={salvarPix}>Salvar PIX</button>

      <br />
      <br />

      <input
        placeholder="Pesquisar cliente"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <br />
      <br />

      <div
        style={{
          background: "#111827",
          padding: 15,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <h3>Criar novo usuário</h3>

        <input
          placeholder="Nome"
          value={novoUsuario.name}
          onChange={(e) =>
            setNovoUsuario({
              ...novoUsuario,
              name: e.target.value,
            })
          }
        />

        <input
          placeholder="Email"
          value={novoUsuario.email}
          onChange={(e) =>
            setNovoUsuario({
              ...novoUsuario,
              email: e.target.value,
            })
          }
        />

        <input
          placeholder="WhatsApp"
          value={novoUsuario.whatsapp}
          onChange={(e) =>
            setNovoUsuario({
              ...novoUsuario,
              whatsapp: e.target.value,
            })
          }
        />

        <input
          placeholder="Valor"
          value={novoUsuario.valor}
          onChange={(e) =>
            setNovoUsuario({
              ...novoUsuario,
              valor: e.target.value,
            })
          }
        />

        <button onClick={criarUsuario}>Criar usuário</button>
      </div>

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
          <strong>{c.name}</strong> | {c.isento ? "ISENTO" : "R$ " + c.valor} |{" "}
          {c.status}

          <div
            style={{
              display: "flex",
              gap: 5,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            <button onClick={() => abrirEditar(c)}>✏️ Editar</button>

            <button onClick={() => excluirCliente(c)}>🗑 Excluir</button>

            <button onClick={() => abrirPermissoes(c)}>🔐 Permissões</button>

            <button onClick={() => enviarPix(c)}>PIX</button>

            <button onClick={() => marcarPago(c)}>Pago</button>

            <button onClick={() => marcarPendente(c)}>Pend.</button>

            <button onClick={() => alterarStatus(c)}>Status</button>

            <button onClick={() => alternarIsencao(c)}>Isentar</button>
          </div>

          {editandoId === c.id && (
            <div
              style={{
                marginTop: 15,
              }}
            >
              <input
                placeholder="Nome"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />

              <input
                placeholder="Valor"
                value={form.valor}
                onChange={(e) =>
                  setForm({
                    ...form,
                    valor: e.target.value,
                  })
                }
              />

              <input
                placeholder="WhatsApp"
                value={form.whatsapp}
                onChange={(e) =>
                  setForm({
                    ...form,
                    whatsapp: e.target.value,
                  })
                }
              />

              <button onClick={salvarEdicao}>💾 Salvar</button>
            </div>
          )}

          {editandoPermissoesId === c.email && (
            <div
              style={{
                marginTop: 15,
                background: "#111827",
                padding: 15,
                borderRadius: 10,
              }}
            >
              <h4>🔐 Permissões</h4>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                {Object.keys(permissoesPadrao).map((modulo) => (
                  <label key={modulo}>
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
              </div>

              <button
                onClick={salvarPermissoes}
                style={{
                  marginTop: 15,
                }}
              >
                💾 Salvar Permissões
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}