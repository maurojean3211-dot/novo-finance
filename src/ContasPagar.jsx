import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function ContasPagar({ empresaId }) {
  const [dados, setDados] = useState([]);

  const [fornecedor, setFornecedor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");

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

  async function salvar() {
    if (!empresaId) return alert("Empresa não identificada.");
    if (!fornecedor) return alert("Fornecedor obrigatório");
    if (!valor) return alert("Valor obrigatório");

    let error = null;

    if (editandoId) {
      const retorno = await supabase
        .from("contas_pagar")
        .update({
          fornecedor,
          descricao,
          valor: Number(valor),
          vencimento,
        })
        .eq("id", editandoId);

      error = retorno.error;

      if (!error) alert("Conta alterada com sucesso!");

      setEditandoId(null);

    } else {
      const retorno = await supabase
        .from("contas_pagar")
        .insert([
          {
            empresa_id: empresaId,
            fornecedor,
            descricao,
            valor: Number(valor),
            vencimento,
            status: "Pendente",
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
    setEditandoId(null);
  }

  function editar(item) {
    setEditandoId(item.id);
    setFornecedor(item.fornecedor || "");
    setDescricao(item.descricao || "");
    setValor(item.valor || "");
    setVencimento(item.vencimento || "");
  }

  async function pagar(id) {
    const { error } = await supabase
      .from("contas_pagar")
      .update({ status: "Pago" })
      .eq("id", id);

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
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    carregar();
  }

  function imprimirRelatorio() {
    const conteudo = document.getElementById("area-relatorio").innerHTML;

    const tela = window.open("", "", "width=900,height=700");

    tela.document.write(`
      <html>
      <head>
        <title>Relatório Contas a Pagar</title>
        <style>
          body{
            font-family: Arial;
            padding:20px;
          }

          h2{
            margin-bottom:20px;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th, td{
            border:1px solid #000;
            padding:8px;
            text-align:left;
          }

          .totais{
            margin-bottom:20px;
          }
        </style>
      </head>
      <body>
        <h2>Relatório Contas a Pagar</h2>

        <div class="totais">
          <strong>Total Pendente:</strong> R$ ${totalPendente}<br>
          <strong>Total Pago:</strong> R$ ${totalPago}
        </div>

        ${conteudo}
      </body>
      </html>
    `);

    tela.document.close();
    tela.print();
  }

  const filtrados = dados.filter((item) => {
    const texto =
      (item.fornecedor || "").toLowerCase() +
      " " +
      (item.descricao || "").toLowerCase();

    const passouBusca = texto.includes(busca.toLowerCase());

    const passouStatus =
      filtroStatus === "Todos"
        ? true
        : item.status === filtroStatus;

    return passouBusca && passouStatus;
  });

  const totalPendente = filtrados
    .filter((item) => item.status !== "Pago")
    .reduce((soma, item) => soma + Number(item.valor || 0), 0);

  const totalPago = filtrados
    .filter((item) => item.status === "Pago")
    .reduce((soma, item) => soma + Number(item.valor || 0), 0);

  return (
    <div style={{ color: "#fff", padding: 20 }}>
      <h2>💸 Contas a Pagar</h2>

      <div style={{ marginBottom: 20 }}>
        <strong>Total Pendente:</strong> R$ {totalPendente}
        <br />
        <strong>Total Pago:</strong> R$ {totalPago}
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
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />

        <input
          type="date"
          value={vencimento}
          onChange={(e) => setVencimento(e.target.value)}
        />

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

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          placeholder="Buscar fornecedor ou descrição"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option>Todos</option>
          <option>Pendente</option>
          <option>Pago</option>
        </select>

        <button onClick={imprimirRelatorio}>
          📄 Relatório
        </button>
      </div>

      <hr />

      <div id="area-relatorio">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtrados.map((item) => (
              <tr key={item.id}>
                <td>{item.fornecedor}</td>
                <td>{item.descricao}</td>
                <td>R$ {item.valor}</td>
                <td>{item.vencimento}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr />

      {filtrados.map((item) => (
        <div
          key={item.id}
          style={{
            padding: 10,
            borderBottom: "1px solid #333",
            marginBottom: 10,
          }}
        >
          <strong>{item.fornecedor}</strong>
          <br />

          {item.descricao}
          <br />

          R$ {item.valor} | {item.vencimento} | {item.status}

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {item.status !== "Pago" && (
              <button onClick={() => pagar(item.id)}>
                Marcar Pago
              </button>
            )}

            <button onClick={() => editar(item)}>
              ✏️ Editar
            </button>

            <button
              onClick={() => excluir(item.id)}
              style={{
                background: "red",
                color: "#fff",
              }}
            >
              🗑 Excluir
            </button>
          </div>
        </div>
      ))}

      {filtrados.length === 0 && (
        <p>Nenhuma conta encontrada.</p>
      )}
    </div>
  );
}