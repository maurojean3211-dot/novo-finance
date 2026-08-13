import { useCallback, useEffect, useMemo, useState } from "react";
import { EMPTY_FILTERS, EMPTY_PROSPECT } from "../types/prospeccao";
import { latestInteraction, loadProspects, matchesProspect, persistProspects } from "../services/prospeccao.service";

export default function useProspects({ empresaId, userId }) {
  const [prospects, setProspects] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    try { setProspects(loadProspects({ empresaId, userId })); }
    catch (requestError) { setError(requestError.message || "Erro ao carregar prospecções."); }
    finally { setLoading(false); }
  }, [empresaId, userId]);

  const commit = useCallback((producer) => {
    setProspects((current) => {
      const next = producer(current);
      persistProspects({ empresaId, userId, prospects: next });
      return next;
    });
  }, [empresaId, userId]);

  const filtered = useMemo(() => prospects.filter((item) => matchesProspect(item, filters)), [filters, prospects]);
  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const recent = new Date(`${today}T12:00:00`); recent.setDate(recent.getDate() - 30);
    const recentIso = recent.toISOString().slice(0, 10);
    return {
      total: prospects.length,
      novos: prospects.filter((item) => item.status === "Novo").length,
      contato: prospects.filter((item) => ["Contato pendente", "Contato realizado", "Aguardando retorno"].includes(item.status)).length,
      negociacao: prospects.filter((item) => ["Proposta em preparação", "Proposta enviada", "Negociação"].includes(item.status)).length,
      convertidos: prospects.filter((item) => item.status === "Convertido em cliente").length,
      pendentes: prospects.filter((item) => item.proximoRetornoEm && item.proximoRetornoEm.slice(0, 10) <= today && item.status !== "Convertido em cliente").length,
      semInteracao: prospects.filter((item) => { const last = latestInteraction(item); return !last || last.dataHora.slice(0, 10) < recentIso; }).length,
    };
  }, [prospects]);

  function save(data) {
    const now = new Date().toISOString();
    const existing = data.id ? prospects.find((entry) => entry.id === data.id) : null;
    if (data.id && !existing) throw new Error("A empresa prospectada não existe mais. Atualize a página e tente novamente.");
    const editable = Object.fromEntries(
      Object.keys(EMPTY_PROSPECT)
        .filter((key) => Object.hasOwn(data, key))
        .map((key) => [key, data[key]]),
    );
    const item = existing
      ? {
          ...existing,
          ...editable,
          id: existing.id,
          updatedAt: now,
        }
      : { ...EMPTY_PROSPECT, ...editable, id: crypto.randomUUID(), empresaId, userId, createdAt: now, updatedAt: now };
    commit((current) => existing
      ? current.map((entry) => entry.id === existing.id ? item : entry)
      : [item, ...current]);
    return item;
  }
  function remove(id) { commit((current) => current.filter((item) => item.id !== id)); }
  function patch(id, changes) { commit((current) => current.map((item) => item.id === id ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item)); }
  function addInteraction(id, interaction) {
    const now = new Date().toISOString();
    patch(id, { interacoes: [{ ...interaction, id: crypto.randomUUID(), createdAt: now }, ...(prospects.find((item) => item.id === id)?.interacoes || [])], ultimaInteracaoEm: interaction.dataHora, proximoRetornoEm: interaction.proximoRetornoEm || prospects.find((item) => item.id === id)?.proximoRetornoEm || "" });
  }
  return { prospects, filtered, filters, setFilters, clearFilters: () => setFilters(EMPTY_FILTERS), metrics, loading, error, save, remove, patch, addInteraction };
}
