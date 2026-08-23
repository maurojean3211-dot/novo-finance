import { createClient } from "npm:@supabase/supabase-js@2.99.3";

type Action = "LIST_USERS" | "INVITE_USER" | "UPDATE_PERMISSIONS";
type JsonObject = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACTIONS = new Set<Action>(["LIST_USERS", "INVITE_USER", "UPDATE_PERMISSIONS"]);
const FLAG_FIELDS = [
  "pode_financeiro", "pode_emprestimos", "pode_compras", "pode_vendas",
  "pode_contas_pagar", "financeiro", "emprestimos", "vendas", "compras",
  "contas_pagar",
] as const;
const PERMISSION_KEYS = new Set([
  "dashboard", "financeiro", "recebimentos", "clientes", "emprestimos", "vendas",
  "compras", "contas_pagar", "contas_fixas", "pessoal", "relatorio",
]);
const FORBIDDEN_BODY_FIELDS = new Set([
  "id", "empresa_id", "master_admin", "role", "tipo_usuario", "nivel",
]);
const ACTION_FIELDS: Record<Action, Set<string>> = {
  LIST_USERS: new Set(["action", "target_empresa_id"]),
  INVITE_USER: new Set(["action", "target_empresa_id", "email", "nome"]),
  UPDATE_PERMISSIONS: new Set(["action", "target_empresa_id", "user_id", "permissoes", "flags"]),
};
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function response(status: number, body: JsonObject) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredUuid(value: unknown, field: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ApiError(400, `${field} inválido ou ausente.`);
  }
  return value;
}

function safePermissions(value: unknown) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "permissoes deve ser um objeto.");
  }
  const result: Record<string, boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!PERMISSION_KEYS.has(key) || typeof item !== "boolean") {
      throw new ApiError(400, `Permissão não autorizada: ${key}.`);
    }
    result[key] = item;
  }
  return result;
}

function safeFlags(value: unknown) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "flags deve ser um objeto.");
  }
  const allowed = new Set<string>(FLAG_FIELDS);
  const result: Record<string, boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!allowed.has(key) || typeof item !== "boolean") {
      throw new ApiError(400, `Flag não autorizada: ${key}.`);
    }
    result[key] = item;
  }
  return result;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response(405, { error: "Método não permitido." });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const secret = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !secret) throw new ApiError(500, "Backend administrativo não configurado.");

    const authHeader = request.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) throw new ApiError(401, "Sessão obrigatória.");
    const token = authHeader.slice(7).trim();
    if (!token) throw new ApiError(401, "Sessão obrigatória.");

    const admin = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) throw new ApiError(401, "Sessão inválida.");

    const body = await request.json().catch(() => { throw new ApiError(400, "JSON inválido."); }) as JsonObject;
    if (typeof body.action !== "string" || !ACTIONS.has(body.action as Action)) {
      throw new ApiError(400, "Ação não permitida.");
    }
    const action = body.action as Action;
    const targetEmpresaId = requiredUuid(body.target_empresa_id, "target_empresa_id");
    for (const field of FORBIDDEN_BODY_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        throw new ApiError(400, `Campo proibido: ${field}.`);
      }
    }
    for (const field of Object.keys(body)) {
      if (!ACTION_FIELDS[action].has(field)) {
        throw new ApiError(400, `Campo não permitido para ${action}: ${field}.`);
      }
    }

    const { data: actor, error: actorError } = await admin.from("usuarios")
      .select("id,empresa_id,role,master_admin")
      .eq("id", authData.user.id).maybeSingle();
    if (actorError || !actor) throw new ApiError(403, "Perfil administrativo não autorizado.");

    const globalAdmin = actor.master_admin === true;
    const tenantAdmin = actor.role === "master" && actor.empresa_id === targetEmpresaId;
    if (!globalAdmin && !tenantAdmin) throw new ApiError(403, "Tenant não autorizado.");

    const { data: targetCompany, error: companyError } = await admin.from("empresas")
      .select("id").eq("id", targetEmpresaId).maybeSingle();
    if (companyError || !targetCompany) throw new ApiError(404, "Empresa alvo inexistente.");

    async function audit(targetUserId: string | null, payload: JsonObject) {
      const { error } = await admin.from("admin_audit_log").insert({
        actor_user_id: actor.id,
        actor_empresa_id: actor.empresa_id,
        target_user_id: targetUserId,
        target_empresa_id: targetEmpresaId,
        action,
        payload,
      });
      if (error) throw new ApiError(500, "Falha ao registrar auditoria administrativa.");
    }

    if (action === "LIST_USERS") {
      const { data, error } = await admin.from("usuarios")
        .select("id,nome,email,role,tipo_usuario,nivel,permissoes,master_admin,pode_financeiro,pode_emprestimos,pode_compras,pode_vendas,pode_contas_pagar,financeiro,emprestimos,vendas,compras,contas_pagar")
        .eq("empresa_id", targetEmpresaId).order("nome");
      if (error) throw new ApiError(500, "Falha ao listar usuários.");
      await audit(null, { result_count: data?.length || 0 });
      return response(200, { users: data || [] });
    }

    if (action === "INVITE_USER") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const nome = typeof body.nome === "string" ? body.nome.trim() : "";
      if (!EMAIL_PATTERN.test(email) || !nome) throw new ApiError(400, "Nome e email válidos são obrigatórios.");

      const { data: existing, error: existingError } = await admin.from("usuarios")
        .select("id").eq("email", email).maybeSingle();
      if (existingError) throw new ApiError(500, "Falha ao validar identidade existente.");
      if (existing) throw new ApiError(409, "Usuário já possui perfil.");

      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
      if (inviteError || !invited.user) throw new ApiError(409, "Não foi possível convidar o usuário.");
      const invitedId = invited.user.id;
      let profileCreated = false;
      try {
        const { error: profileError } = await admin.from("usuarios").insert({
          id: invitedId, nome, email, empresa_id: targetEmpresaId,
          role: "cliente", tipo_usuario: "usuario", nivel: "usuario",
          master_admin: false, permissoes: null, isento: false,
          pode_financeiro: false, pode_emprestimos: false, pode_compras: false,
          pode_vendas: false, pode_contas_pagar: false, financeiro: false,
          emprestimos: false, vendas: false, compras: false, contas_pagar: false,
        });
        if (profileError) throw new ApiError(500, "Falha ao criar perfil do convite.");
        profileCreated = true;
        await audit(invitedId, { invited: true });
      } catch (error) {
        if (profileCreated) await admin.from("usuarios").delete().eq("id", invitedId);
        await admin.auth.admin.deleteUser(invitedId);
        throw error;
      }
      return response(201, { user: { id: invitedId, nome, email, empresa_id: targetEmpresaId } });
    }

    const targetUserId = requiredUuid(body.user_id, "user_id");
    const permissions = safePermissions(body.permissoes);
    const flags = safeFlags(body.flags);
    const changes: JsonObject = { ...flags };
    if (permissions !== undefined) changes.permissoes = permissions;
    if (Object.keys(changes).length === 0) throw new ApiError(400, "Nenhuma permissão válida informada.");

    const { data: target, error: targetError } = await admin.from("usuarios")
      .select("id,empresa_id,role,master_admin,permissoes,pode_financeiro,pode_emprestimos,pode_compras,pode_vendas,pode_contas_pagar,financeiro,emprestimos,vendas,compras,contas_pagar")
      .eq("id", targetUserId).eq("empresa_id", targetEmpresaId).maybeSingle();
    if (targetError || !target) throw new ApiError(404, "Usuário alvo inexistente no tenant.");
    if (target.master_admin === true || target.role === "master") {
      throw new ApiError(403, "Perfil administrativo não pode ser alterado por esta API.");
    }

    const previous: JsonObject = {};
    for (const key of Object.keys(changes)) previous[key] = target[key];
    const { data: updated, error: updateError } = await admin.from("usuarios")
      .update(changes).eq("id", targetUserId).eq("empresa_id", targetEmpresaId)
      .select("id").single();
    if (updateError || !updated) throw new ApiError(500, "Falha ao atualizar permissões.");
    try {
      await audit(targetUserId, { changed_fields: Object.keys(changes).sort() });
    } catch (error) {
      await admin.from("usuarios").update(previous)
        .eq("id", targetUserId).eq("empresa_id", targetEmpresaId);
      throw error;
    }
    return response(200, { user_id: targetUserId, updated: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : "Falha interna administrativa.";
    return response(status, { error: message });
  }
});
