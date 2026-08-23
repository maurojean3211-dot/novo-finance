import { supabase } from "../supabase";

export const secureProvisioningEnabled = import.meta.env.VITE_SAFE_AUTH_BACKEND_ENABLED === "true";

export async function provisionCurrentAccount({ companyName, cpf, whatsapp }) {
  if (!secureProvisioningEnabled) {
    throw new Error("O provisionamento seguro ainda não está disponível neste ambiente.");
  }

  const { data, error } = await supabase.rpc("provisionar_conta_v1", {
    p_nome_empresa: String(companyName || "").trim(),
    p_cpf: String(cpf || "").trim() || null,
    p_whatsapp: String(whatsapp || "").trim() || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
