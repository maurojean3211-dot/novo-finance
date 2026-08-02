import { useMemo, useState } from "react";
import { DEMO_INCOMES } from "../services/personalFinance.demo";
import { EMPTY_INCOME } from "../types/personalFinance";
export default function usePersonalIncomes() {
  const [incomes, setIncomes] = useState(() => DEMO_INCOMES.map((item) => ({ ...item })));
  const [filters, setFilters] = useState({ search: "", type: "Todos", status: "Todos" });
  const filtered = useMemo(() => incomes.filter((item) => {
    const term = filters.search.toLowerCase();
    return [item.descricao, item.fontePagadora, item.tipo].some((value) => String(value).toLowerCase().includes(term)) && (filters.type === "Todos" || item.tipo === filters.type) && (filters.status === "Todos" || item.status === filters.status);
  }), [filters, incomes]);
  const save = (data) => setIncomes((current) => data.id ? current.map((item) => item.id === data.id ? { ...data } : item) : [{ ...data, id: Date.now() }, ...current]);
  const remove = (id) => setIncomes((current) => current.filter((item) => item.id !== id));
  return { incomes, filtered, filters, setFilters, save, remove, emptyIncome: { ...EMPTY_INCOME } };
}
