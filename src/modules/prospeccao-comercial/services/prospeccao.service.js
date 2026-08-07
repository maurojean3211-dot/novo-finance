const STORAGE_VERSION = 1;

export function prospectStorageKey(empresaId, userId) {
  return `cunha-finance:prospeccao:v${STORAGE_VERSION}:${empresaId}:${userId}`;
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function loadProspects({ empresaId, userId }) {
  if (!empresaId || !userId) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(prospectStorageKey(empresaId, userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function persistProspects({ empresaId, userId, prospects }) {
  if (!empresaId || !userId) throw new Error("Empresa ou usuário não identificado.");
  localStorage.setItem(prospectStorageKey(empresaId, userId), JSON.stringify(prospects));
  return clone(prospects);
}

export function normalizeSearch(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeDigits(value) { return String(value || "").replace(/\D/g, ""); }

export function latestInteraction(prospect) {
  return [...(prospect.interacoes || [])].sort((a, b) => String(b.dataHora).localeCompare(String(a.dataHora)))[0] || null;
}

export function matchesProspect(prospect, filters, today = new Date().toISOString().slice(0, 10)) {
  const term = normalizeSearch(filters.search);
  const digits = normalizeDigits(filters.search);
  const latest = latestInteraction(prospect);
  const searchable = [prospect.razaoSocial, prospect.nomeFantasia, prospect.contatoNome, prospect.email, prospect.pais, prospect.countryCode, prospect.cidade, prospect.estado, prospect.region, prospect.codigoPostal, prospect.postalCode, prospect.segmento, prospect.cnpj, prospect.telefone, prospect.whatsapp, ...(prospect.produtosInteresse || []), prospect.observacoes, prospect.necessidade];
  const textMatch = !term || searchable.some((value) => normalizeSearch(value).includes(term));
  const digitMatch = !digits || [prospect.cnpj, prospect.telefone, prospect.whatsapp].some((value) => normalizeDigits(value).includes(digits));
  const recentLimit = new Date(`${today}T12:00:00`); recentLimit.setDate(recentLimit.getDate() - 30);
  const recentLimitIso = recentLimit.toISOString().slice(0, 10);
  return (textMatch || (digits && digitMatch))
    && (!filters.status || prospect.status === filters.status)
    && (!filters.segmento || prospect.segmento === filters.segmento)
    && (!filters.pais || (prospect.pais || prospect.countryCode) === filters.pais)
    && (!filters.cidade || prospect.cidade === filters.cidade)
    && (!filters.estado || prospect.estado === filters.estado)
    && (!filters.idioma || (prospect.idiomaPreferencial || prospect.preferredLocale) === filters.idioma)
    && (!filters.moeda || (prospect.moedaPreferencial || prospect.preferredCurrency) === filters.moeda)
    && (!filters.responsavel || prospect.responsavel === filters.responsavel)
    && (!filters.produto || (prospect.produtosInteresse || []).includes(filters.produto))
    && (!filters.origem || prospect.origem === filters.origem)
    && (!filters.ultimaInteracao || String(latest?.dataHora || "").slice(0, 10) === filters.ultimaInteracao)
    && (!filters.proximoRetorno || String(prospect.proximoRetornoEm || "").slice(0, 10) === filters.proximoRetorno)
    && (!filters.retornoVencido || (prospect.proximoRetornoEm && prospect.proximoRetornoEm.slice(0, 10) < today))
    && (!filters.semContatoRecente || !latest || latest.dataHora.slice(0, 10) < recentLimitIso);
}

export function returnState(value, today = new Date().toISOString().slice(0, 10)) {
  const date = String(value || "").slice(0, 10);
  if (!date) return "none";
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "future";
}
