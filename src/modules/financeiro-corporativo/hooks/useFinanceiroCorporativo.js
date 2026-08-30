import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCorporateFinance } from "../services/financeiro.service";
import { calculateCorporateFinanceMetrics } from "../services/financeiroMetrics.js";

export default function useFinanceiroCorporativo(empresaId) {
  const [data, setData] = useState({ titles: [], settlements: [], reconciliations: [], history: [], purchaseInstallments: [], sales: [], budgets: [], recurrences: [], unavailable: {} });
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [period, setPeriod] = useState("month"); const [customStart, setCustomStart] = useState(""); const [customEnd, setCustomEnd] = useState("");
  const refresh = useCallback(async () => { if (!empresaId) return; setLoading(true); setError(""); try { setData(await loadCorporateFinance(empresaId)); } catch (cause) { setError(cause.message || "Falha ao carregar o financeiro corporativo."); } finally { setLoading(false); } }, [empresaId]);
  useEffect(() => { refresh(); }, [refresh]);
  return useMemo(() => {
    const metrics = calculateCorporateFinanceMetrics(data, { period, customStart, customEnd });
    return { ...data, loading, error, refresh, period, setPeriod, customStart, setCustomStart, customEnd, setCustomEnd, ...metrics };
  }, [customEnd, customStart, data, error, loading, period, refresh]);
}
