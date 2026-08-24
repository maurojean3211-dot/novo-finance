import { supabase } from "../supabase";

async function invoke(action, payload) {
  const { data, error } = await supabase.functions.invoke("admin-users-v1", {
    body: { action, ...payload },
  });
  if (error) {
    let message = error.message;
    try { message = (await error.context?.json())?.error || message; } catch { /* mantém a mensagem original */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function listAdminUsers() { return invoke("LIST_USERS", {}); }

export function inviteAdminUser({ email, nome, empresaNome }) { return invoke("INVITE_USER", { email, nome, empresa_nome: empresaNome }); }

export function approveAdminUser(userId, company) {
  return invoke("APPROVE_USER", {
    user_id: userId,
    empresa_id: company.empresaId || undefined,
    empresa_nome: company.empresaNome || undefined,
  });
}
export function rejectAdminUser(userId) { return invoke("REJECT_USER", { user_id: userId }); }
export function blockAdminUser(userId) { return invoke("BLOCK_USER", { user_id: userId }); }
export function unblockAdminUser(userId) { return invoke("UNBLOCK_USER", { user_id: userId }); }

export function updateAdminUser(user) { return invoke("UPDATE_USER", { user_id: user.id, user }); }
