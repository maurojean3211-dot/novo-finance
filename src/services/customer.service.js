import { supabase } from "../supabase.js";

export function customerPayload(customer) {
  return {
    nome: String(customer.nome || "").trim(),
    telefone: String(customer.telefone || "").trim(),
    email: String(customer.email || "").trim() || null,
  };
}

export async function listCustomers(empresaId) {
  if (!empresaId) return [];
  const { data, error } = await supabase.from("clientes").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveCustomer({ empresaId, customerId, customer }) {
  if (!empresaId) throw new Error("Empresa não carregada.");
  const payload = customerPayload(customer);
  if (!payload.nome) throw new Error("Digite o nome do cliente.");

  const query = customerId
    ? supabase.from("clientes").update(payload).eq("id", customerId).eq("empresa_id", empresaId)
    : supabase.from("clientes").insert([{ ...payload, empresa_id: empresaId }]);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer({ empresaId, customerId }) {
  if (!empresaId || !customerId) return;
  const { error } = await supabase.from("clientes").delete().eq("id", customerId).eq("empresa_id", empresaId);
  if (error) throw error;
}

export function createCustomerSnapshot(customer) {
  if (!customer) return null;
  return {
    clienteId: customer.id,
    nome: customer.nome || "",
    cpfCnpj: customer.cpf_cnpj || customer.cpf || customer.cnpj || "",
    telefone: customer.telefone || "",
    whatsapp: customer.whatsapp || customer.telefone || "",
    email: customer.email || "",
    endereco: customer.endereco || "",
    cidade: customer.cidade || "",
    estado: customer.estado || "",
    contatoResponsavel: customer.contato_responsavel || customer.contato || "",
    vendedorResponsavel: customer.vendedor_responsavel || customer.vendedor || "",
    observacoesComerciais: customer.observacoes_comerciais || customer.observacoes || "",
  };
}

export function customerMatchesSearch(customer, search) {
  const term = String(search || "").trim().toLocaleLowerCase("pt-BR");
  if (!term) return true;
  return [customer.nome, customer.telefone, customer.whatsapp, customer.email, customer.cpf_cnpj, customer.cpf, customer.cnpj]
    .some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(term));
}

export function isCustomerInCompany(customer, empresaId) {
  return Boolean(customer && empresaId && String(customer.empresa_id) === String(empresaId));
}
