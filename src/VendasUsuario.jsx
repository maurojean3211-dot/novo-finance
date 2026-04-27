import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function formatarData(data) {
  if (!data) return "";

  const limpa = String(data).slice(0, 10);
  const [ano, mes, dia] = limpa.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function VendasUsuario() {
  const hoje = new Date();

  const dataHoje = `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1
  ).padStart(2, "0")}-${String(
    hoje.getDate()
  ).padStart(2, "0")}`;

  const [vendas, setVendas] = useState([]);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [tipo, setTipo] = useState("UN");
  const [valor, setValor] = useState("");
  const [dataVenda, setDataVenda] =
    useState(dataHoje);

  const [empresaId, setEmpresaId] =
    useState(null);

  const [userId, setUserId] =
    useState(null);

  const [editandoId, setEditandoId] =
    useState(null);

  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return alert("Usuário não logado");

    setUserId(user.id);

    const { data, error } =
      await supabase
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
    const { data, error } =
      await supabase
        .from("vendas")
        .select("*")
        .eq("empresa_id", empId)
        .order("data_venda", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        });

    if (!error) {
      setVendas(data || []);
    }
  }

  async function salvarVenda() {
    if (!empresaId)
      return alert(
        "Empresa não carregada"
      );

    if (!cliente.trim())
      return alert(
        "Informe o cliente"
      );

    if (!produto.trim())
      return alert(
        "Informe o produto"
      );

    if (!quantidade)
      return alert(
        "Informe a quantidade"
      );

    if (!valor)
      return alert("Informe o valor");

    const payload = {
      cliente_nome: cliente,
      produto,
      kilos: Number(quantidade),
      valor: Number(valor),
      comissao: 0,
      data_venda: dataVenda,
    };

    let error = null;

    if (editandoId) {
      const res = await supabase
        .from("vendas")
        .update(payload)
        .eq("id", editandoId)
        .eq("empresa_id", empresaId);

      error = res.error;
    } else {
      const res = await supabase
        .from("vendas")
        .insert([
          {
            ...payload,
            empresa_id: empresaId,
            user_id: userId,
          },
        ]);

      error = res.error;
    }

    if (error)
      return alert(error.message);

    alert(
      editandoId
        ? "Venda atualizada!"
        : "Venda salva!"
    );

    limpar();

    carregarVendas(empresaId);
  }

  function limpar() {
    setCliente("");
    setProduto("");
    setQuantidade("");
    setTipo("UN");
    setValor("");
    setDataVenda(dataHoje);
    setEditandoId(null);
  }

  function editarVenda(v) {
    setEditandoId(v.id);
    setCliente(v.cliente_nome || "");
    setProduto(v.produto || "");
    setQuantidade(v.kilos || "");
    setTipo("UN");
    setValor(v.valor || "");
    setDataVenda(
      String(v.data_venda).slice(0, 10)
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirVenda(id) {
    if (
      !window.confirm(
        "Excluir venda?"
      )
    )
      return;

    await supabase
      .from("vendas")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    carregarVendas(empresaId);
  }

  const vendasFiltradas =
    vendas.filter((v) =>
      (v.cliente_nome || "")
        .toLowerCase()
        .includes(
          busca.toLowerCase()
        )
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
      <h1>📦 VENDAS</h1>

      <input
        type="date"
        value={dataVenda}
        onChange={(e) =>
          setDataVenda(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <p
        style={{
          color: "#cbd5e1",
        }}
      >
        📅{" "}
        {formatarData(dataVenda)}
      </p>

      <br />

      <input
        placeholder="Cliente"
        value={cliente}
        onChange={(e) =>
          setCliente(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <br />
      <br />

      <input
        placeholder="Produto"
        value={produto}
        onChange={(e) =>
          setProduto(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <br />
      <br />

      <input
        type="number"
        placeholder="Quantidade"
        value={quantidade}
        onChange={(e) =>
          setQuantidade(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <br />
      <br />

      <select
        value={tipo}
        onChange={(e) =>
          setTipo(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      >
        <option value="UN">
          Unidade
        </option>
        <option value="KG">
          Kilo
        </option>
      </select>

      <br />
      <br />

      <input
        type="number"
        placeholder="Valor"
        value={valor}
        onChange={(e) =>
          setValor(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <br />
      <br />

      <button
        onClick={salvarVenda}
        style={{
          width: "100%",
          padding: 12,
          background:
            editandoId
              ? "orange"
              : "green",
          color: "#fff",
          border: "none",
          borderRadius: 8,
        }}
      >
        {editandoId
          ? "Atualizar Venda"
          : "Salvar Venda"}
      </button>

      <hr />

      <h3>🔍 Buscar Cliente</h3>

      <input
        placeholder="Digite o nome"
        value={busca}
        onChange={(e) =>
          setBusca(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 8,
        }}
      />

      <hr />

      {vendasFiltradas.map(
        (v) => (
          <div
            key={v.id}
            style={{
              border:
                "1px solid #ddd",
              padding: 15,
              marginBottom: 12,
              borderRadius: 10,
              background:
                "#fff",
              color: "#111",
            }}
          >
            📅{" "}
            {formatarData(
              v.data_venda
            )}
            <br />
            👤{" "}
            {v.cliente_nome}
            <br />
            📦 {v.produto}
            <br />
            🔢 {v.kilos}
            <br />
            💵 R${" "}
            {Number(
              v.valor || 0
            ).toFixed(2)}

            <br />
            <br />

            <button
              onClick={() =>
                editarVenda(v)
              }
            >
              ✏️ Editar
            </button>

            <button
              onClick={() =>
                excluirVenda(
                  v.id
                )
              }
              style={{
                marginLeft: 10,
                background:
                  "red",
                color:
                  "#fff",
              }}
            >
              🗑️ Excluir
            </button>
          </div>
        )
      )}
    </div>
  );
}