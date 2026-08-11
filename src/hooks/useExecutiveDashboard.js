import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  crm_oportunidades: "id, etapa, valor_estimado, probabilidade, created_at",
  orcamentos: "id, status, valor_final, data, created_at",
  ordens_producao: "id, status, prioridade, data_prevista_inicio, data_prevista_fim, quantidade_planejada, quantidade_produzida, peso_planejado, peso_produzido, quantidade_perdida, peso_perdido, created_at",
  ordem_producao_materiais: "id, ordem_id, quantidade_prevista, quantidade_reservada, quantidade_consumida, necessidade_compra, created_at",
  ordem_producao_apontamentos: "id, ordem_id, tipo, quantidade, peso, created_at",
};
const emptyData = Object.fromEntries(Object.keys(TABLES).map((table) => [table, []]));

export default function useExecutiveDashboard(empresaId, initialPeriod = "month") {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [period, setPeriod] = useState(initialPeriod);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const loadedCompany = useRef(null);
  const refreshVersion = useRef(0);

  const refresh = useCallback(async () => {
    const requestVersion = ++refreshVersion.current;
    if (!empresaId) { loadedCompany.current = null; setData(emptyData); setErrors({}); setLoading(false); return; }
    setLoading(true);
    const entries = Object.entries(TABLES);
    const sameCompany = String(loadedCompany.current) === String(empresaId);
    try {
      const results = await Promise.allSettled(entries.map(([table, fields]) => supabase.from(table).select(fields).eq("empresa_id", empresaId)));
      if (requestVersion !== refreshVersion.current) return;
      const nextErrors = {};
      setData((current) => {
        const nextData = {};
        entries.forEach(([table], index) => {
          const settled = results[index];
          const result = settled.status === "fulfilled" ? settled.value : null;
          if (!result || result.error) {
            nextData[table] = sameCompany ? current[table] || [] : [];
            nextErrors[table] = result?.error?.message || settled.reason?.message || "Falha na consulta";
          } else nextData[table] = result.data || [];
        });
        return nextData;
      });
      loadedCompany.current = empresaId;
      setErrors(nextErrors);
    } finally {
      if (requestVersion === refreshVersion.current) setLoading(false);
    }
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
