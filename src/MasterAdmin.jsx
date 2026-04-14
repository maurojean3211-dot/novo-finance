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

  const [editandoPermissoesId, setEditandoPermissoesId] =
    useState(null);

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

  const [permissoes, setPermissoes] =
    useState(permissoesPadrao);

  const [pixSistema, setPixSistema] = useState("");

  useEffect(() => {
    verificarUsuario();
  }, []);

  async function verificarUsuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (!data || data.role !== "master") {
      alert("Acesso negado");
      return;
    }

    setUsuario(data);

    await carregarClientes();
    await buscarPix();
  }

  async function carregarClientes() {
    const { data, error } =
      await supabase
        .from("empresas")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (!error) setClientes(data || []);
  }

  async function buscarPix() {
    const { data } = await supabase
      .from("configuracoes")
      .select("*")
      .eq("chave", "pix_sistema")
      .maybeSingle();

    if (data)
      setPixSistema(data.valor || "");
  }

  async function salvarPix() {
    const { error } = await supabase
      .from("configuracoes")
      .upsert({
        chave: "pix_sistema",
        valor: pixSistema,
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("PIX salvo!");
  }

  async function cadastrarCliente() {
    if (!nome)
      return alert("Nome obrigatório");

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
    } else {
      await supabase
        .from("empresas")
        .insert([
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
      .select("email, permissoes")
      .eq("email", c.email)
      .maybeSingle();

    if (!data) {
      alert("Cliente sem login");
      return;
    }

    let permissoesBanco = {};

    if (
      data.permissoes &&
      typeof data.permissoes === "string"
    ) {
      try {
        permissoesBanco = JSON.parse(
          data.permissoes
        );
      } catch {
        permissoesBanco = {};
      }
    } else {
      permissoesBanco =
        data.permissoes || {};
    }

    setEditandoPermissoesId(c.email);

    setPermissoes({
      ...permissoesPadrao,
      ...permissoesBanco,
    });
  }

  async function salvarPermissoes() {
    const { error } = await supabase
      .from("usuarios")
      .update({
        permissoes:
          JSON.parse(
            JSON.stringify(
              permissoes
            )
          ),
      })
      .eq(
        "email",
        editandoPermissoesId
      );

    if (error) {
      alert(error.message);
      return;
    }

    alert("Permissões salvas!");

    setEditandoPermissoesId(null);
  }

  async function excluirCliente(id) {
    if (
      !window.confirm(
        "Excluir cliente?"
      )
    )
      return;

    await supabase
      .from("empresas")
      .delete()
      .eq("id", id);

    carregarClientes();
  }

  async function marcarPago(c) {
    await supabase
      .from("empresas")
      .update({ pagou: true })
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
    const novo =
      c.status === "Ativo"
        ? "Bloqueado"
        : "Ativo";

    await supabase
      .from("empresas")
      .update({ status: novo })
      .eq("id", c.id);

    carregarClientes();
  }

  async function alternarIsencao(c) {
    await supabase
      .from("empresas")
      .update({
        isento: !c.isento,
      })
      .eq("id", c.id);

    carregarClientes();
  }

  function enviarPix(cliente) {
    if (!pixSistema)
      return alert("Cadastre PIX");

    let numero = String(
      cliente.whatsapp || ""
    ).replace(/\D/g, "");

    if (!numero.startsWith("55")) {
      numero = "55" + numero;
    }

    const msg = `Olá ${cliente.name}
Valor: ${
      cliente.isento
        ? "ISENTO"
        : "R$ " + cliente.valor
    }
PIX: ${pixSistema}`;

    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(
        msg
      )}`,
      "_blank"
    );
  }

  if (!usuario) {
    return (
      <div
        style={{
          color: "#fff",
          padding: 20,
        }}
      >
        Carregando...
      </div>
    );
  }

  const clientesFiltrados =
    clientes.filter((c) =>
      (c.name || "")
        .toLowerCase()
        .includes(
          busca.toLowerCase()
        )
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
        onChange={(e) =>
          setPixSistema(
            e.target.value
          )
        }
      />

      <button onClick={salvarPix}>
        Salvar PIX
      </button>

      <br /><br />

      <input
        placeholder="Pesquisar cliente"
        value={busca}
        onChange={(e) =>
          setBusca(e.target.value)
        }
      />

      <hr />

      {clientesFiltrados.map((c) => (
        <div
          key={c.id}
          style={{
            borderBottom:
              "1px solid #333",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <strong>{c.name}</strong> |
          R$ {c.valor} |{" "}
          {c.status}

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 5,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() =>
                editarCliente(c)
              }
            >
              Editar
            </button>

            <button
              onClick={() =>
                abrirPermissoes(c)
              }
            >
              Permissões
            </button>

            <button
              onClick={() =>
                enviarPix(c)
              }
            >
              PIX
            </button>

            <button
              onClick={() =>
                marcarPago(c)
              }
            >
              Pago
            </button>

            <button
              onClick={() =>
                marcarPendente(c)
              }
            >
              Pend.
            </button>

            <button
              onClick={() =>
                alterarStatus(c)
              }
            >
              Status
            </button>

            <button
              onClick={() =>
                alternarIsencao(c)
              }
            >
              Isentar
            </button>

            <button
              onClick={() =>
                excluirCliente(c.id)
              }
              style={{
                background:
                  "red",
                color: "#fff",
              }}
            >
              Excluir
            </button>
          </div>

          {editandoPermissoesId ===
            c.email && (
            <div
              style={{
                marginTop: 15,
                background:
                  "#111827",
                padding: 15,
                borderRadius: 10,
              }}
            >
              <h4>
                ✅ Permissões
              </h4>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 10,
                }}
              >
                {Object.keys(
                  permissoesPadrao
                ).map(
                  (modulo) => (
                    <label
                      key={
                        modulo
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          !!permissoes[
                            modulo
                          ]
                        }
                        onChange={(
                          e
                        ) =>
                          setPermissoes(
                            {
                              ...permissoes,
                              [modulo]:
                                e
                                  .target
                                  .checked,
                            }
                          )
                        }
                      />{" "}
                      {modulo}
                    </label>
                  )
                )}
              </div>

              <button
                onClick={
                  salvarPermissoes
                }
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