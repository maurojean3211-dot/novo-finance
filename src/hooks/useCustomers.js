import { useCallback, useEffect, useState } from "react";
import { deleteCustomer, listCustomers, saveCustomer } from "../services/customer.service";

export default function useCustomers(empresaId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!empresaId) { setCustomers([]); setLoading(false); return []; }
    setLoading(true);
    try {
      const data = await listCustomers(empresaId);
      setCustomers(data);
      setError("");
      return data;
    } catch (requestError) {
      setError(requestError.message || "Erro ao carregar clientes.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  async function save(customer, customerId = null) {
    const saved = await saveCustomer({ empresaId, customerId, customer });
    await reload();
    return saved;
  }

  async function remove(customerId) {
    await deleteCustomer({ empresaId, customerId });
    setCustomers((current) => current.filter((customer) => customer.id !== customerId));
  }

  return { customers, loading, error, reload, save, remove };
}
