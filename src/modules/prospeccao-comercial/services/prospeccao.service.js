import { supabase } from "../../../supabase";

function fromDatabase(row) {
  return {
    ...(row.dados || {}), id: row.id, empresaId: row.empresa_id, userId: row.user_id,
    status: row.status, proximoRetornoEm: row.proximo_retorno_em || "", arquivado: row.arquivado,
    convertidoClienteId: row.convertido_cliente_id, convertidoEm: row.convertido_em,
    oportunidadeId: row.oportunidade_id, createdAt: row.created_at, updatedAt: row.updated_at,
    interacoes: (row.prospeccao_interacoes || []).map((entry) => ({
      ...(entry.dados || {}), id: entry.id, dataHora: entry.data_hora,
      proximoRetornoEm: entry.proximo_retorno_em || "", createdAt: entry.created_at,
    })),
  };
}

function prospectPayload(prospect, empresaId) {
  const { id, empresaId: ignoredCompany, userId, interacoes, status, proximoRetornoEm, arquivado,
    convertidoClienteId, convertidoEm, oportunidadeId, createdAt, updatedAt, ...dados } = prospect;
  void id; void ignoredCompany; void userId; void interacoes; void createdAt; void updatedAt;
  return { empresa_id: String(empresaId), dados, status: status || "Novo",
    proximo_retorno_em: proximoRetornoEm || null, arquivado: Boolean(arquivado),
    convertido_cliente_id: convertidoClienteId || null, convertido_em: convertidoEm || null,
    oportunidade_id: oportunidadeId || null, updated_at: new Date().toISOString() };
}

export async function loadProspects({ empresaId }) {
  if (!empresaId) return [];
  const { data, error } = await supabase.from("prospeccao_prospectos")
    .select("*, prospeccao_interacoes(id,dados,data_hora,proximo_retorno_em,created_at)")
    .eq("empresa_id", String(empresaId)).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromDatabase);
}

export async function saveProspect({ empresaId, userId, prospect }) {
  if (!empresaId || !userId) throw new Error("Empresa ou usuário não identificado.");
  const payload = prospectPayload(prospect, empresaId);
  const query = prospect.id
    ? supabase.from("prospeccao_prospectos").update(payload).eq("id", prospect.id).eq("empresa_id", String(empresaId))
    : supabase.from("prospeccao_prospectos").insert({ ...payload, user_id: userId });
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return fromDatabase({ ...data, prospeccao_interacoes: prospect.interacoes || [] });
}

export async function deleteProspect({ empresaId, id }) {
  const { error } = await supabase.from("prospeccao_prospectos").delete().eq("id", id).eq("empresa_id", String(empresaId));
  if (error) throw error;
}

export async function addProspectInteraction({ empresaId, userId, prospectId, interaction }) {
  const { id, createdAt, dataHora, proximoRetornoEm, ...dados } = interaction;
  void id; void createdAt;
  const { data, error } = await supabase.from("prospeccao_interacoes").insert({
    prospecto_id: prospectId, empresa_id: String(empresaId), user_id: userId, dados,
    data_hora: dataHora, proximo_retorno_em: proximoRetornoEm || null,
  }).select("id,dados,data_hora,proximo_retorno_em,created_at").single();
  if (error) throw error;
  return { ...(data.dados || {}), id: data.id, dataHora: data.data_hora,
    proximoRetornoEm: data.proximo_retorno_em || "", createdAt: data.created_at };
}

export async function convertProspect({ prospectId }) {
  const { data, error } = await supabase.rpc("converter_prospecto_comercial", { p_prospecto_id: prospectId });
  if (error) throw error;
  const result = data?.[0];
  if (!result?.cliente_id || !result?.oportunidade_id) throw new Error("A conversão não retornou cliente e oportunidade.");
  return {
    customerId: result.cliente_id,
    opportunityId: result.oportunidade_id,
    reusedCustomer: Boolean(result.cliente_reutilizado),
    reusedOpportunity: Boolean(result.oportunidade_reutilizada),
  };
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
