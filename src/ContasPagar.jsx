import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function ContasPagar({ empresaId }) {
  const [dados, setDados] = useState([]);

  const [fornecedor, setFornecedor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [status, setStatus] = useState("Pendente");

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    if (empresaId) carregar();
  }, [empresaId]);

  async function carregar() {
    const { data, error } = await supabase
      .from("contas_pagar")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("vencimento", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setDados(data || []);
  }

  function converterValor(valorTexto) {
    return Number(
      valorTexto
        .toString()
        .trim()
        .replace(/\./g, "")
        .replace(",", ".")
    );
  }

  async function salvar() {
    if (!empresaId) return alert("Empresa não identificada.");
    if (!fornecedor) return alert("Fornecedor obrigatório");
    if (!valor) return alert("Valor obrigatório");

    const valorNumero = converterValor(valor);

    if (isNaN(valorNumero)) {
      return alert("Valor inválido.");
    }

    let error = null;

    if (editandoId) {
      const retorno = await supabase
        .from("contas_pagar")
        .update({
          fornecedor,
          descricao,
          valor: valorNumero,
          vencimento,
          status,
        })
        .eq("id", editandoId)
        .eq("empresa_id", empresaId);

      error = retorno.error;

      if (!error) alert("Conta alterada com sucesso!");
    } else {
      const retorno = await supabase
        .from("contas_pagar")
        .insert([
          {
            empresa_id: empresaId,
            fornecedor,
            descricao,
            valor: valorNumero,
            vencimento,
            status,
          },
        ]);

      error = retorno.error;

      if (!error) alert("Conta salva com sucesso!");
    }

    if (error) {
      alert(error.message);
      return;
    }

    limpar();
    carregar();
  }

  function limpar() {
    setFornecedor("");
    setDescricao("");
    setValor("");
    setVencimento("");
    setStatus("Pendente");
    setEditandoId(null);
  }

  function editar(item) {
    setEditandoId(item.id);
    setFornecedor(item.fornecedor || "");
    setDescricao(item.descricao || "");
    setValor(String(item.valor || ""));
    setVencimento(item.vencimento || "");
    setStatus(item.status || "Pendente");
  }

  async function pagar(id) {
    const { error } = await supabase
      .from("contas_pagar")
      .update({ status: "Pago" })
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert(error.message);
      return;
    }

    carregar();
  }

  async function voltarPendente(id) {
    const { error } = await supabase
      .from("contas_pagar")
      .update({ status: "Pendente" })
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert(error.message);
      return;
    }

    carregar();
  }

  async function excluir(id) {
    if (!window.confirm("Excluir conta?")) return;

    const { error } = await supabase
      .from("contas_pagar")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert(error.message);
      return;
    }

    carregar();
  }

  function dinheiro(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function vencida(item) {
    if (item.status === "Pago") return false;
    if (!item.vencimento) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataConta = new Date(item.vencimento + "T00:00:00");

    return dataConta < hoje;
  }

  const filtrados = dados.filter((item) => {
    const texto = `${item.fornecedor || ""} ${item.descricao || ""}`.toLowerCase();

    const passouBusca = texto.includes(busca.toLowerCase());

    const passouStatus =
      filtroStatus === "Todos"
        ? true
        : item.status === filtroStatus;

    return passouBusca && passouStatus;
  });

  const contasVencidas = dados.filter((item) => vencida(item));

  const totalPendente = filtrados
    .filter((item) => item.status !== "Pago")
    .reduce((soma, item) => soma + Number(item.valor || 0), 0);

  const totalPago = filtrados
    .filter((item) => item.status === "Pago")
    .reduce((soma, item) => soma + Number(item.valor || 0), 0);

  return (
    <div style={{ color: "#fff", padding: 20 }}>
      <h2>💸 Contas a Pagar</h2>

      {contasVencidas.length > 0 && (
        <div style={{ background: "#7f1d1d", padding: 12, borderRadius: 8, marginBottom: 15 }}>
          ⚠️ Você possui {contasVencidas.length} conta(s) vencida(s)
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <strong>Total Pendente:</strong> R$ {dinheiro(totalPendente)}
        <br />
        <strong>Total Pago:</strong> R$ {dinheiro(totalPago)}
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        <input
          placeholder="Fornecedor"
          value={fornecedor}
          onChange={(e) => setFornecedor(e.target.value)}
        />

        <input
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <input
          placeholder="Valor Ex: 150,90"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />

        <input
          type="date"
          value={vencimento}
          onChange={(e) => setVencimento(e.target.value)}
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Pendente">Pendente</option>
          <option value="Pago">Pago</option>
        </select>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={salvar}>
            {editandoId ? "Salvar Alteração" : "Salvar Conta"}
          </button>

          {editandoId && (
            <button onClick={limpar}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <hr />

      {filtrados.map((item) => (
        <div
          key={item.id}
          style={{
            padding: 15,
            border: "1px solid #334155",
            borderRadius: 8,
            marginBottom: 12,
            background:
              item.status === "Pago"
                ? "#14532d"
                : vencida(item)
                ? "#7f1d1d"
                : "#0f172a",
          }}
        >
          <strong>{item.fornecedor}</strong>
          <div>{item.descricao}</div>
          <div>💰 R$ {dinheiro(item.valor)}</div>
          <div>📅 {item.vencimento}</div>
          <div>📌 {item.status}</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => editar(item)}>✏️ Editar</button>

            {item.status !== "Pago" ? (
              <button onClick={() => pagar(item.id)}>
                ✅ Marcar Pago
              </button>
            ) : (
              <button onClick={() => voltarPendente(item.id)}>
                ↩️ Voltar Pendente
              </button>
            )}

            <button
              onClick={() => excluir(item.id)}
              style={{ background: "red", color: "#fff" }}
            >
              🗑 Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}