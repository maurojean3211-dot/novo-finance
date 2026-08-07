import { useCallback, useEffect, useState } from "react";
import { loadProspects } from "../../prospeccao-comercial/services/prospeccao.service";
import { listCustomers } from "../../../services/customer.service";

const dateValue = (value) => String(value || "").slice(0, 10);

function prospectActivity(item) {
  if (!item.proximoRetornoEm || item.arquivado || item.status === "Convertido em cliente") return null;
  return {
    id: `prospeccao-${item.id}`,
    icon: "⌕",
    type: "Retorno comercial",
    client: item.nomeFantasia || item.razaoSocial || item.contatoNome || "Contato não informado",
    description: item.retornoObservacao || `Acompanhar prospecção em status ${item.status || "não informado"}.`,
    date: dateValue(item.proximoRetornoEm),
    status: dateValue(item.proximoRetornoEm) < dateValue(new Date().toISOString()) ? "Atrasado" : "Programado",
    origin: "Prospecção",
  };
}

function customerActivity(item) {
  const createdAt = dateValue(item.created_at);
  if (!createdAt) return null;
  return {
    id: `cliente-${item.id}`,
    icon: "◎",
    type: "Cliente cadastrado",
    client: item.nome || "Cliente não informado",
    description: "Cadastro incluído na base comercial.",
    date: createdAt,
    status: "Registrado",
    origin: "Cliente",
  };
}

export default function useAgendaActivities({ empresaId, userId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!empresaId || !userId) { setActivities([]); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [prospects, customers] = await Promise.all([
        Promise.resolve(loadProspects({ empresaId, userId })),
        listCustomers(empresaId),
      ]);
      const consolidated = [...prospects.map(prospectActivity), ...customers.map(customerActivity)]
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date));
      setActivities(consolidated);
    } catch {
      setActivities([]);
      setError("Não foi possível carregar as atividades da agenda.");
    } finally {
      setLoading(false);
    }
  }, [empresaId, userId]);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { activities, loading, error, refresh };
}
