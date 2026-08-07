import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const emptyData = { lancamentos: [], vendas: [], compras: [], recebimentos: [], clientes: [] };
const total = (items, field = "valor") => items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
const dateOf = (item) => new Date(item.data_lancamento || item.data_venda || item.created_at || item.data || 0);

export default function useExecutiveDashboard(empresaId) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!empresaId) { setData(emptyData); setLoading(false); return; }
    setLoading(true); setError("");
    const tables = ["lancamentos", "vendas", "compras", "recebimentos", "clientes"];
    const results = await Promise.all(tables.map((table) => supabase.from(table).select("*").eq("empresa_id", empresaId)));
    setData(Object.fromEntries(tables.map((table, index) => [table, results[index].data || []])));
    if (results.some((result) => result.error)) setError("Alguns indicadores não puderam ser carregados.");
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return useMemo(() => {
    const receitas = data.lancamentos.filter((item) => item.tipo === "receita");
    const despesas = data.lancamentos.filter((item) => item.tipo !== "receita");
    const pendentes = data.recebimentos.filter((item) => !["pago", "recebido"].includes(String(item.status || "").toLowerCase()));
    const recent = [...data.lancamentos].sort((a, b) => dateOf(b) - dateOf(a)).slice(0, 6);
    const now = new Date();
    const salesThisMonth = data.vendas.filter((item) => { const date = dateOf(item); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); });
    const hasData = Object.values(data).some((items) => items.length);
    return { ...data, loading, error, refresh, recent, metrics: hasData ? [
      { label: "Faturamento no mês", value: total(salesThisMonth), detail: `${salesThisMonth.length} venda(s)`, icon: "↗", currency: true },
      { label: "Entradas", value: total(receitas), detail: `${receitas.length} lançamento(s)`, icon: "＋", currency: true },
      { label: "Saídas", value: total(despesas), detail: `${despesas.length} lançamento(s)`, icon: "−", currency: true },
      { label: "Saldo atual", value: total(receitas) - total(despesas), detail: "Entradas menos saídas", icon: "$", currency: true },
      { label: "Contas a receber", value: total(pendentes), detail: `${pendentes.length} pendência(s)`, icon: "◷", currency: true },
      { label: "Clientes", value: data.clientes.length, detail: "Cadastros existentes", icon: "◎" },
    ] : [] };
  }, [data, error, loading, refresh]);
}
