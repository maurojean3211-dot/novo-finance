import { useCallback, useEffect, useMemo, useState } from "react";
import useExecutiveDashboard from "../../../hooks/useExecutiveDashboard";
import useAgendaActivities from "../../agenda-comercial/hooks/useAgendaActivities";
import { listImportDrafts } from "../../catalogo-inteligente/services/catalogoImportDraft.service";
import { loadProspects } from "../../prospeccao-comercial/services/prospeccao.service";
import { listCustomers } from "../../../services/customer.service";
import { analyzeCommercialCommand, buildDailySummary } from "../services/commercialAssistantRules.service";

export default function useCommercialAssistant({ empresaId, userId }) {
  const dashboard = useExecutiveDashboard(empresaId);
  const agenda = useAgendaActivities({ empresaId, userId });
  const [customers, setCustomers] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);

  const loadContext = useCallback(async () => {
    if (!empresaId || !userId) { setLoadingContext(false); return; }
    setLoadingContext(true);
    try {
      const [customerData, prospectData, drafts] = await Promise.all([listCustomers(empresaId), Promise.resolve(loadProspects({ empresaId, userId })), Promise.resolve(listImportDrafts(empresaId, userId))]);
      setCustomers(customerData);
      setProspects(prospectData);
      setProducts(drafts.flatMap((draft) => draft.products || []));
    } finally { setLoadingContext(false); }
  }, [empresaId, userId]);

  useEffect(() => { const timer = window.setTimeout(loadContext, 0); return () => window.clearTimeout(timer); }, [loadContext]);

  const context = useMemo(() => ({ customers, prospects, products, agenda: agenda.activities, sales: dashboard.vendas, purchases: dashboard.compras, receivables: dashboard.recebimentos, movements: dashboard.lancamentos }), [agenda.activities, customers, dashboard.compras, dashboard.lancamentos, dashboard.recebimentos, dashboard.vendas, products, prospects]);
  const analyze = useCallback((command) => { const result = analyzeCommercialCommand(command, context); setHistory((current) => [{ id: crypto.randomUUID(), command, result, createdAt: new Date().toISOString() }, ...current]); return result; }, [context]);
  const dailySummary = useCallback(() => { const result = buildDailySummary(context); setHistory((current) => [{ id: crypto.randomUUID(), command: "Gerar resumo comercial do dia", result, createdAt: new Date().toISOString() }, ...current]); return result; }, [context]);

  return { context, history, analyze, dailySummary, loading: dashboard.loading || agenda.loading || loadingContext };
}
