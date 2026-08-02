import { useMemo, useState } from "react";
import { createCrmDemoData } from "../services/crm.service";
import { OPEN_STAGES } from "../types/crm";

const initialFilters = { search: "", vendedor: "", etapa: "", prioridade: "", segmento: "", inicio: "", fim: "" };

export default function useCrm() {
  const [opportunities, setOpportunities] = useState(createCrmDemoData);
  const [filters, setFilters] = useState(initialFilters);

  const filtered = useMemo(() => opportunities.filter((item) => {
    const termo = filters.search.toLowerCase();
    const matchesSearch = [item.empresa, item.contatoPrincipal, item.produtoInteresse, item.cidade].some((value) => String(value).toLowerCase().includes(termo));
    const date = item.proximoContato || "";
    return matchesSearch && (!filters.vendedor || item.vendedorResponsavel === filters.vendedor) && (!filters.etapa || item.etapa === filters.etapa) && (!filters.prioridade || item.prioridade === filters.prioridade) && (!filters.segmento || item.segmento === filters.segmento) && (!filters.inicio || date >= filters.inicio) && (!filters.fim || date <= filters.fim);
  }), [filters, opportunities]);

  const metrics = useMemo(() => {
    const abertas = opportunities.filter((item) => OPEN_STAGES.includes(item.etapa));
    const ganhos = opportunities.filter((item) => item.etapa === "Fechado — ganho").length;
    const concluidas = opportunities.filter((item) => item.etapa.startsWith("Fechado")).length;
    const today = new Date().toISOString().slice(0, 10);
    return {
      abertas: abertas.length,
      valorFunil: abertas.reduce((sum, item) => sum + Number(item.valorEstimado || 0), 0),
      propostas: opportunities.filter((item) => item.etapa === "Proposta enviada").length,
      negociacoes: opportunities.filter((item) => item.etapa === "Negociação").length,
      ganhos,
      conversao: concluidas ? (ganhos / concluidas) * 100 : 0,
      vencidos: abertas.filter((item) => item.proximoContato && item.proximoContato < today).length,
      hoje: opportunities.reduce((sum, item) => sum + item.atividades.filter((activity) => activity.data === today).length, 0),
    };
  }, [opportunities]);

  function saveOpportunity(data) {
    if (data.id) setOpportunities((current) => current.map((item) => item.id === data.id ? { ...item, ...data } : item));
    else setOpportunities((current) => [{ ...data, id: Date.now(), atividades: [] }, ...current]);
  }

  function moveOpportunity(id, etapa) {
    setOpportunities((current) => current.map((item) => item.id === id ? { ...item, etapa, status: etapa.startsWith("Fechado") ? "Encerrada" : "Ativa" } : item));
  }

  function addActivity(id, activity) {
    setOpportunities((current) => current.map((item) => item.id === id ? { ...item, atividades: [{ ...activity, id: Date.now() }, ...item.atividades] } : item));
  }

  return { opportunities, filtered, filters, setFilters, clearFilters: () => setFilters(initialFilters), metrics, saveOpportunity, moveOpportunity, addActivity };
}
