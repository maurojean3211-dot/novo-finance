import { supabase } from "../../../supabase";

export async function loadProposal({ empresaId, quote }) {
  const { data: company, error } = await supabase.from("empresas").select("*").eq("id", empresaId).single();
  if (error) throw error;
  return {
    company: {
      name: company.name || company.nome || company.razao_social || "Empresa",
      legalName: company.razao_social || company.name || company.nome || "",
      document: company.cnpj || company.cpf_cnpj || "",
      phone: company.telefone || company.whatsapp || "",
      email: company.email || "",
      address: [company.endereco, company.cidade, company.estado].filter(Boolean).join(" · "),
    },
    responsible: quote.vendedor || "Equipe comercial",
    emittedAt: quote.data || new Date().toISOString().slice(0, 10),
    quote,
  };
}
