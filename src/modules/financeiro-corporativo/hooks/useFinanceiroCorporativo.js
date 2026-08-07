import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCorporateFinance } from "../services/financeiro.service";

const today = () => new Date().toISOString().slice(0, 10);
const dateValue = (value) => new Date(`${value}T12:00:00`);

function rangeFor(period, customStart, customEnd) {
  const now = dateValue(today());
  let start = new Date(now); let end = new Date(now);
  if (period === "7") end.setDate(end.getDate() + 6);
  if (period === "30") end.setDate(end.getDate() + 29);
  if (period === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1, 12); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12); }
  if (period === "year") { start = new Date(now.getFullYear(), 0, 1, 12); end = new Date(now.getFullYear(), 11, 31, 12); }
  if (period === "custom") { start = dateValue(customStart || today()); end = dateValue(customEnd || customStart || today()); }
  return { start, end };
}

export default function useFinanceiroCorporativo(empresaId) {
  const [data, setData] = useState({ titles: [], settlements: [], reconciliations: [], history: [], purchaseInstallments: [], sales: [], budgets: [], unavailable: {} });
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [period, setPeriod] = useState("month"); const [customStart, setCustomStart] = useState(""); const [customEnd, setCustomEnd] = useState("");
  const refresh = useCallback(async () => { if (!empresaId) return; setLoading(true); setError(""); try { setData(await loadCorporateFinance(empresaId)); } catch (cause) { setError(cause.message || "Falha ao carregar o financeiro corporativo."); } finally { setLoading(false); } }, [empresaId]);
  useEffect(() => { refresh(); }, [refresh]);
  return useMemo(() => {
    const now = today(); const range = rangeFor(period, customStart, customEnd);
    const inRange = (value) => { const date = dateValue(String(value).slice(0, 10)); return date >= range.start && date <= range.end; };
    const active = data.titles.filter((item) => item.status !== "Cancelado");
    const payable = active.filter((item) => item.tipo === "Pagar"); const receivable = active.filter((item) => item.tipo === "Receber");
    const settled = data.settlements.filter((item) => inRange(item.data_movimento));
    const signed = (item) => item.tipo === "Estorno" ? -Number(item.valor || 0) : Number(item.valor || 0);
    const titleType = new Map(data.titles.map((item) => [item.id, item.tipo]));
    const received = settled.filter((item) => titleType.get(item.titulo_id) === "Receber").reduce((sum, item) => sum + signed(item), 0);
    const paid = settled.filter((item) => titleType.get(item.titulo_id) === "Pagar").reduce((sum, item) => sum + signed(item), 0);
    const sumBalance = (items) => items.reduce((sum, item) => sum + Number(item.saldo || 0), 0);
    const overdue = active.filter((item) => item.saldo > 0 && item.vencimento < now);
    const dueSoon = active.filter((item) => item.saldo > 0 && item.vencimento >= now && dateValue(item.vencimento) <= new Date(Date.now() + 7 * 86400000));
    return { ...data, loading, error, refresh, period, setPeriod, customStart, setCustomStart, customEnd, setCustomEnd,
      payable, receivable, overdue, dueSoon, paid, received, realized: received - paid,
      payableBalance: sumBalance(payable), receivableBalance: sumBalance(receivable),
      projected: sumBalance(receivable) - sumBalance(payable),
      periodTitles: active.filter((item) => inRange(item.vencimento)),
    };
  }, [customEnd, customStart, data, error, loading, period, refresh]);
}
