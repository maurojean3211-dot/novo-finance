import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { calculateDashboardMetrics, resolvePeriod } from "../components/dashboard/dashboardMetrics";

const TABLES = {
  lancamentos: "id, descricao, valor, tipo, data_lancamento, created_at",
  vendas: "*",
  compras: "*",
  recebimentos: "id, cliente_nome, valor, status, data_vencimento, created_at",
  clientes: "id, nome, created_at",
  estoque: "id, estoque_atual, estoque_reservado, estoque_disponivel, estoque_minimo, ponto_reposicao, custo_unitario",
  pedidos_compra: "id, fornecedor_id, fornecedor_snapshot, status, valor_total, data, previsao",
  financeiro_titulos: "id, tipo, status, vencimento, valor_original, valor_baixado, saldo",
  financeiro_baixas: "id, titulo_id, tipo, valor, data_movimento",
};
const emptyData = Object.fromEntries(Object.keys(TABLES).map((table) => [table, []]));

export default function useExecutiveDashboard(empresaId) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const refresh = useCallback(async () => {
    if (!empresaId) { setData(emptyData); setErrors({}); setLoading(false); return; }
    setLoading(true);
    const entries = Object.entries(TABLES);
    const results = await Promise.all(entries.map(([table, fields]) => supabase.from(table).select(fields).eq("empresa_id", empresaId)));
    const nextData = {};
    const nextErrors = {};
    entries.forEach(([table], index) => {
      const result = results[index];
      if (result.error) {
        nextData[table] = [];
        nextErrors[table] = result.error.message || "Falha na consulta";
      } else nextData[table] = result.data || [];
    });
    setData(nextData);
    setErrors(nextErrors);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { const timer = window.setTimeout(refresh, 0); return () => window.clearTimeout(timer); }, [refresh]);

  return useMemo(() => {
    const range = resolvePeriod(period, customStart, customEnd);
    const calculated = calculateDashboardMetrics(data, range);
    const allRevenues = data.lancamentos.filter((item) => item.tipo === "receita").reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const allExpenses = data.lancamentos.filter((item) => item.tipo === "despesa").reduce((sum, item) => sum + Number(item.valor || 0), 0);
    return {
      ...data, ...calculated, loading, errors, error: Object.keys(errors).length ? "Algumas fontes não puderam ser carregadas." : "", refresh,
      period, setPeriod, customStart, setCustomStart, customEnd, setCustomEnd, range,
      saldoAtual: allRevenues - allExpenses,
      sourceAvailable: (table) => !errors[table],
    };
  }, [customEnd, customStart, data, errors, loading, period, refresh]);
}
