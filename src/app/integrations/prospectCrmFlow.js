const DRAFT_KEY = "cunha-finance:crm:prospect-draft:v1";

function linkStorageKey(empresaId, userId) {
  return `cunha-finance:crm:prospect-links:v1:${empresaId}:${userId}`;
}

function readLinks(empresaId, userId) {
  if (!empresaId || !userId) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(linkStorageKey(empresaId, userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function findProspectOpportunityLink({ empresaId, userId, prospectId }) {
  if (!prospectId) return null;
  return readLinks(empresaId, userId).find((item) => item.prospectId === prospectId) || null;
}

export function prospectCompanyData(prospect) {
  return {
    prospectId: prospect.id,
    empresa: prospect.nomeFantasia || prospect.razaoSocial || "",
    cnpj: prospect.cnpj || "",
    contatoPrincipal: prospect.contatoNome || "",
    telefone: prospect.telefone || "",
    whatsapp: prospect.whatsapp || "",
    email: prospect.email || "",
    cidade: prospect.cidade || "",
    estado: prospect.estado || prospect.region || "",
    pais: prospect.pais || prospect.countryCode || "",
    segmento: prospect.segmento || "",
    site: prospect.site || "",
    regiao: prospect.regiaoAtendimento || prospect.region || "",
    origemLead: prospect.origem || "",
    vendedorResponsavel: prospect.responsavel || prospect.representante || "",
    produtoInteresse: (prospect.produtosInteresse || []).join(", "),
    prospectNotes: prospect.observacoes || prospect.necessidade || "",
  };
}

export function startProspectOpportunityFlow({ prospect, empresaId, userId }) {
  const linked = findProspectOpportunityLink({ empresaId, userId, prospectId: prospect.id });
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ empresaId: String(empresaId), userId, opportunityId: linked?.opportunityId || null, company: prospectCompanyData(prospect) }));
  return linked?.opportunityId || null;
}

export function consumeProspectOpportunityFlow({ empresaId, userId }) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    sessionStorage.removeItem(DRAFT_KEY);
    if (!parsed || parsed.empresaId !== String(empresaId) || parsed.userId !== userId) return null;
    return parsed;
  } catch { sessionStorage.removeItem(DRAFT_KEY); return null; }
}

export function linkProspectOpportunity({ empresaId, userId, prospectId, opportunityId }) {
  const links = readLinks(empresaId, userId).filter((item) => item.prospectId !== prospectId && item.opportunityId !== opportunityId);
  links.push({ prospectId, opportunityId, linkedAt: new Date().toISOString() });
  localStorage.setItem(linkStorageKey(empresaId, userId), JSON.stringify(links));
}

export function unlinkOpportunity({ empresaId, userId, opportunityId }) {
  const links = readLinks(empresaId, userId).filter((item) => item.opportunityId !== opportunityId);
  localStorage.setItem(linkStorageKey(empresaId, userId), JSON.stringify(links));
}

export function enrichOpportunitiesFromProspects({ opportunities, prospects, empresaId, userId }) {
  const links = readLinks(empresaId, userId);
  return opportunities.map((opportunity) => {
    const link = links.find((item) => item.opportunityId === opportunity.id);
    const prospect = link && prospects.find((item) => item.id === link.prospectId);
    return prospect ? { ...opportunity, ...prospectCompanyData(prospect) } : opportunity;
  });
}
