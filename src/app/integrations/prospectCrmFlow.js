import { supabase } from "../../supabase";

export function findProspectOpportunityLink({ prospects, prospectId }) {
  const prospect = prospects?.find((item) => item.id === prospectId);
  return prospect?.oportunidadeId ? { prospectId, opportunityId: prospect.oportunidadeId } : null;
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

export async function linkProspectOpportunity({ empresaId, prospectId, opportunityId }) {
  const { error } = await supabase.from("prospeccao_prospectos").update({ oportunidade_id: opportunityId })
    .eq("id", prospectId).eq("empresa_id", String(empresaId));
  if (error) throw error;
}

export function enrichOpportunitiesFromProspects({ opportunities, prospects }) {
  return opportunities.map((opportunity) => {
    const prospect = prospects.find((item) => item.oportunidadeId === opportunity.id);
    return prospect ? { ...opportunity, ...prospectCompanyData(prospect) } : opportunity;
  });
}
