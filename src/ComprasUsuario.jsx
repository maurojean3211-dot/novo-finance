import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ActionButtons, EmptyState, FilterBar, MetricGrid, ModuleHeader, OperationModal } from "./components/operations/OperationsUI";
import { formatarData } from "./utils";

export default function ComprasUsuario({ empresaId, userId }) {
  const hoje = new Date();

  const dataHoje = `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1
  ).padStart(2, "0")}-${String(
    hoje.getDate()
  ).padStart(2, "0")}`;

  const [compras, setCompras] = useState([]);

  const [fornecedor, setFornecedor] =
    useState("");

  const [produto, setProduto] =
    useState("");

  const [quantidade, setQuantidade] =
    useState("");

  const [tipo, setTipo] =
    useState("UN");

  const [valor, setValor] =
    useState("");

  const [dataCompra, setDataCompra] =
    useState(dataHoje);

  const [editandoId, setEditandoId] =
    useState(null);

  const [busca, setBusca] =
    useState("");

  const [modalAberto, setModalAberto] =
    useState(false);

  useEffect(() => {
    if (!empresaId) return undefined;
    // A carga é adiada para preservar o ciclo de montagem do componente legado.
    // eslint-disable-next-line react-hooks/immutability
    const timer = window.setTimeout(() => carregarCompras(empresaId), 0);
    return () => window.clearTimeout(timer);
  }, [empresaId]);

  async function carregarCompras(empId) {
    const { data, error } =
      await supabase
        .from("compras")
        .select("*")
        .eq("empresa_id", empId)
        .order("data_compra", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        });

    if (!error) {
      setCompras(data || []);
    }
  }

  async function salvarCompra() {
    if (!empresaId)
      return alert(
        "Empresa não carregada"
      );

    if (!fornecedor.trim())
      return alert(
        "Informe o fornecedor"
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
      fornecedor,
      produto,
      kilos: Number(quantidade),
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
      const res = await supabase
        .from("compras")
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
        ? "Compra atualizada!"
        : "Compra salva!"
    );

    limpar();
    setModalAberto(false);

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
    setTipo("UN");
    setValor(c.valor || "");
    setDataCompra(
      String(c.data_compra).slice(0, 10)
    );
    setModalAberto(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirCompra(id) {
    if (
      !window.confirm(
        "Excluir compra?"
      )
    )
      return;

    await supabase
      .from("compras")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    carregarCompras(empresaId);
  }

  const comprasFiltradas =
    compras.filter((c) =>
      (c.fornecedor || "")
        .toLowerCase()
        .includes(
          busca.toLowerCase()
        )
    );

  const totalQuantidade = compras.reduce(
    (total, compra) => total + Number(compra.kilos || 0),
    0
  );

  const totalValor = compras.reduce(
    (total, compra) => total + Number(compra.valor || 0),
    0
  );

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1680,
        margin: "0 auto",
        color: "#fff",
      }}
    >
      <ModuleHeader
        eyebrow="Materiais e operações"
        title="Compras"
        description="Controle operacional de aquisições, volumes e valores."
        actionLabel="Nova Compra"
        onAction={() => {
          limpar();
          setModalAberto(true);
        }}
      />

      <MetricGrid items={[
        { label: "Compras do mês", value: compras.length, detail: "registros carregados", icon: "▥" },
        { label: "Peso comprado", value: totalQuantidade.toLocaleString("pt-BR"), detail: "quantidade total", icon: "⚖", tone: "green" },
        { label: "Valor total", value: `R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, detail: "valor acumulado", icon: "R$", tone: "amber" },
        { label: "Custo médio", value: "—", detail: "sem cálculo no fluxo atual", icon: "÷" },
        { label: "Quantidade", value: compras.length, detail: "compras registradas", icon: "#" },
      ]} />

      {modalAberto && <OperationModal
        title={editandoId ? "Editar compra" : "Nova compra"}
        editing={Boolean(editandoId)}
        onClose={() => setModalAberto(false)}
        onSubmit={salvarCompra}
        submitLabel={editandoId ? "Atualizar Compra" : "Salvar Compra"}
      >

      <input
        type="date"
        value={dataCompra}
        onChange={(e) =>
          setDataCompra(
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
        {formatarData(dataCompra)}
      </p>

      <br />

      <input
        placeholder="Fornecedor"
        value={fornecedor}
        onChange={(e) =>
          setFornecedor(
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
        onClick={salvarCompra}
        style={{
          display: "none",
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
          ? "Atualizar Compra"
          : "Salvar Compra"}
      </button>

      </OperationModal>}

      <hr />

      <FilterBar><input placeholder="Buscar por fornecedor" value={busca} onChange={(e) => setBusca(e.target.value)} /></FilterBar>

      <hr />

      {comprasFiltradas.length === 0 ? <EmptyState /> : comprasFiltradas.map(
        (c) => (
          <div
            key={c.id}
            style={{
              border:
                "1px solid #223147",
              padding: 15,
              marginBottom: 12,
              borderRadius: 10,
              background:
                "#101b2a",
              color: "#dce5f2",
            }}
          >
            📅{" "}
            {formatarData(
              c.data_compra
            )}
            <br />
            👤{" "}
            {c.fornecedor}
            <br />
            📦 {c.produto}
            <br />
            🔢 {c.kilos}
            <br />
            💵 R${" "}
            {Number(
              c.valor || 0
            ).toFixed(2)}

            <br />
            <br />

            <ActionButtons onEdit={() => editarCompra(c)} onDelete={() => excluirCompra(c.id)} />
          </div>
        )
      )}
    </div>
  );
}
