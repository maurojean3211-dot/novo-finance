import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function ContasFixas({ empresaId }) {
  const [dados, setDados] = useState([]);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("");

  const [busca, setBusca] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    if (empresaId) carregar();
  }, [empresaId]);

  async function carregar() {
    const { data, error } = await supabase
      .from("contas_fixas")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("dia_vencimento", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setDados(data || []);
  }

  function dinheiro(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function limpar() {
    setDescricao("");
    setValor("");
    setDia("");
    setEditandoId(null);
  }

  function editar(item) {
    setEditandoId(item.id);
    setDescricao(item.descricao || "");
    setValor(item.valor || "");
    setDia(item.dia_vencimento || "");
  }

  async function salvar() {
    if (!descricao) return alert("Descrição obrigatória");
    if (!valor) return alert("Valor obrigatório");
    if (!dia) return alert("Dia obrigatório");

    let error = null;

    if (editandoId) {
      const retorno = await supabase
        .from("contas_fixas")
        .update({
          descricao,
          valor: Number(valor),
          dia_vencimento: Number(dia),
        })
        .eq("id", editandoId);

      error = retorno.error;

      if (!error) alert("Conta alterada com sucesso!");
    } else {
      const retorno = await supabase
        .from("contas_fixas")
        .insert([
          {
            empresa_id: empresaId,
            descricao,
            valor: Number(valor),
            dia_vencimento: Number(dia),
            frequencia: "Mensal",
            ativo: true,
          },
        ]);

      error = retorno.error;

      if (!error) alert("Conta cadastrada com sucesso!");
    }

    if (error) {
      alert(error.message);
      return;
    }

    limpar();
    carregar();
  }

  async function excluir(id) {
    if (!window.confirm("Excluir conta fixa?")) return;

    const { error } = await supabase
      .from("contas_fixas")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    carregar();
  }

  function imprimirRelatorio() {
    const tela = window.open("", "", "width=900,height=700");

    tela.document.write(`
      <html>
      <head>
        <title>Relatório Contas Fixas</title>
        <style>
          body{
            font-family:Arial;
            padding:20px;
          }

          table{
            width:100%;
            border-collapse:collapse;
            margin-top:20px;
          }

          th,td{
            border:1px solid #000;
            padding:8px;
            text-align:left;
          }

          h2{
            margin-bottom:10px;
          }
        </style>
      </head>

      <body>
        <h2>Relatório Contas Fixas</h2>
        <strong>Total Mensal:</strong> R$ ${dinheiro(totalMensal)}

        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Dia</th>
            </tr>
          </thead>

          <tbody>
            ${filtrados
              .map(
                (item) => `
              <tr>
                <td>${item.descricao}</td>
                <td>R$ ${dinheiro(item.valor)}</td>
                <td>${item.dia_vencimento}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `);

    tela.document.close();
    tela.print();
  }

  const filtrados = dados.filter((item) =>
    (item.descricao || "")
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  const totalMensal = filtrados.reduce(
    (soma, item) => soma + Number(item.valor || 0),
    0
  );

  return (
    <div style={{ color: "#fff", padding: 20 }}>
      <h2>🔁 Contas Fixas</h2>

      <div style={{ marginBottom: 20 }}>
        <strong>Total Mensal:</strong> R$ {dinheiro(totalMensal)}
      </div>

      {/* FORMULÁRIO */}
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
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
          placeholder="Dia vencimento"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={salvar}>
            {editandoId ? "Salvar Alteração" : "Salvar"}
          </button>

          {editandoId && (
            <button onClick={limpar}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <hr />

      {/* BUSCA */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <input
          placeholder="Buscar conta fixa"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <button onClick={imprimirRelatorio}>
          📄 Relatório
        </button>
      </div>

      <hr />

      {/* LISTA */}
      {filtrados.map((item) => (
        <div
          key={item.id}
          style={{
            padding: 15,
            border: "1px solid #334155",
            borderRadius: 8,
            marginBottom: 12,
            background: "#0f172a",
          }}
        >
          <strong style={{ fontSize: 18 }}>
            {item.descricao}
          </strong>

          <div style={{ marginTop: 8 }}>
            💰 R$ {dinheiro(item.valor)}
          </div>

          <div>
            📅 Dia {item.dia_vencimento}
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
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
        <p>Nenhuma conta fixa encontrada.</p>
      )}
    </div>
  );
}