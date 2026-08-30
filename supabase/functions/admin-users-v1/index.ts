import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.99.3";
import { buildUserChanges, compensateFailedApproval, hasNormalizedTextChanged, isAuthorizedMaster, isAuthorizedTenantAdmin, normalizeApprovalChoice, normalizeTenantPermissions, shouldSyncAuth, targetBelongsToCompany } from "./adminUsersSecurity.js";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const defaults = { vendas: true, compras: true, financeiro: true, recebimentos: true, contas_pagar: true, relatorio: true };
const permissionKeys = ["financas_pessoais", "pessoal_visao_geral", "pessoal_receitas", "pessoal_despesas", "pessoal_contas_pagar", "pessoal_contas_fixas", "pessoal_orcamentos", "pessoal_recorrencias", "pessoal_relatorios", "financeiro", "crm", "prospeccao", "vendas", "compras", "estoque", "catalogo", "orcamentos", "pcp", "tributario", "relatorios", "energia", "representacoes"];
const contractKeys = ["financas_pessoais", "financeiro", "crm", "prospeccao", "vendas", "compras", "estoque", "catalogo", "orcamentos", "pcp", "tributario", "relatorios", "energia", "representacoes"];
const personalDetailKeys = ["pessoal_visao_geral", "pessoal_receitas", "pessoal_despesas", "pessoal_contas_pagar", "pessoal_contas_fixas", "pessoal_orcamentos", "pessoal_recorrencias", "pessoal_relatorios"];
const authRedirectTo = "https://cunha-finance.vercel.app";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function companyModules(admin: ReturnType<typeof createClient>, companyId: string) {
  const { data: company, error } = await admin.from("empresas").select("id,plano_id").eq("id", companyId).maybeSingle();
  if (error || !company) throw error || new Error("Empresa não encontrada.");
  const [{ data: base, error: baseError }, { data: overrides, error: overrideError }] = await Promise.all([
    company.plano_id ? admin.from("plano_modulos").select("modulo_key").eq("plano_id", company.plano_id) : Promise.resolve({ data: [], error: null }),
    admin.from("empresa_modulos").select("modulo_key,habilitado").eq("empresa_id", companyId),
  ]);
  if (baseError || overrideError) throw baseError || overrideError;
  const modules = new Set((base || []).map((item) => item.modulo_key));
  for (const item of overrides || []) item.habilitado ? modules.add(item.modulo_key) : modules.delete(item.modulo_key);
  return modules;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json(405, { error: "Método não permitido." });
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authorization = request.headers.get("Authorization") || "";
    if (!url || !anonKey || !serviceKey || !authorization.startsWith("Bearer ")) throw new Error("Configuração administrativa inválida.");
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return json(401, { error: "Sessão inválida." });
    const body = await request.json();
    const action = String(body.action || "");
    const { data: caller } = await admin.from("usuarios").select("id,role,tipo_usuario,master_admin,status,empresa_id").eq("id", authData.user.id).maybeSingle();
    const teamAction = action.startsWith("TEAM_");
    let tenantCompany = null;
    if (teamAction) {
      const { data: company } = caller?.empresa_id
        ? await admin.from("empresas").select("id,tipo,status").eq("id", caller.empresa_id).maybeSingle()
        : { data: null };
      if (!isAuthorizedTenantAdmin(caller, company)) return json(403, { error: "Ação restrita ao administrador de uma empresa ativa." });
      tenantCompany = company;
    } else if (!isAuthorizedMaster(caller)) {
      return json(403, { error: "Ação restrita ao Master Admin." });
    }

    if (action === "TEAM_LIST") {
      const modules = await companyModules(admin, tenantCompany.id);
      const { data: users, error } = await admin.from("usuarios")
        .select("id,nome,email,created_at,tipo_usuario,nivel,permissoes,status,empresa_id,empresa_id_bloqueada")
        .or(`empresa_id.eq.${tenantCompany.id},empresa_id_bloqueada.eq.${tenantCompany.id}`)
        .order("created_at");
      if (error) throw error;
      return json(200, { modules: [...modules].filter((key) => !["energia", "representacoes", "financas_pessoais"].includes(key)), users: users || [] });
    }

    if (action === "TEAM_INVITE") {
      const input = body.user || {};
      const nome = String(input.nome || "").trim();
      const email = String(input.email || "").trim().toLowerCase();
      const perfil = String(input.perfil || "personalizado");
      if (!nome || !email) return json(400, { error: "Nome e e-mail são obrigatórios." });
      const contracted = await companyModules(admin, tenantCompany.id);
      let permissions;
      try { permissions = normalizeTenantPermissions(input.permissoes, permissionKeys, contracted); }
      catch (error) { return json(403, { error: error instanceof Error ? error.message : "Permissão inválida." }); }
      const userType = perfil === "admin_empresa" ? "admin_empresa" : "usuario";
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { nome }, redirectTo: authRedirectTo });
      if (inviteError) throw inviteError;
      const { error } = await admin.from("usuarios").upsert({ id: invited.user.id, nome, email, empresa_id: tenantCompany.id, empresa_id_bloqueada: null, role: "usuario", tipo_usuario: userType, nivel: perfil, permissoes: permissions, status: "ATIVO", master_admin: false, valor_mensal: 0 }, { onConflict: "id" });
      if (error) { await admin.auth.admin.deleteUser(invited.user.id); throw error; }
      return json(200, { user_id: invited.user.id, status: "ATIVO" });
    }

    if (["TEAM_UPDATE", "TEAM_BLOCK", "TEAM_UNBLOCK", "TEAM_REMOVE"].includes(action)) {
      const userId = String(body.user_id || body.user?.id || "");
      const { data: target, error: targetError } = await admin.from("usuarios").select("id,nome,email,role,tipo_usuario,nivel,master_admin,permissoes,status,empresa_id,empresa_id_bloqueada").eq("id", userId).maybeSingle();
      if (targetError || !target) return json(404, { error: "Usuário não encontrado." });
      if (!targetBelongsToCompany(target, tenantCompany.id)) return json(403, { error: "Usuário não pertence à sua empresa." });
      if (target.master_admin || target.role === "master") return json(403, { error: "Master Admin não pode ser alterado por este fluxo." });
      if (userId === caller.id && action !== "TEAM_UPDATE") return json(400, { error: "O administrador não pode bloquear ou remover o próprio acesso." });

      if (action === "TEAM_UPDATE") {
        const input = body.user || {};
        const nome = String(input.nome || "").trim();
        const perfil = String(input.perfil || input.nivel || "personalizado");
        if (!nome) return json(400, { error: "Nome é obrigatório." });
        const contracted = await companyModules(admin, tenantCompany.id);
        let permissions;
        try { permissions = normalizeTenantPermissions(input.permissoes, permissionKeys, contracted); }
        catch (error) { return json(403, { error: error instanceof Error ? error.message : "Permissão inválida." }); }
        const { error } = await admin.from("usuarios").update({ nome, nivel: perfil, tipo_usuario: perfil === "admin_empresa" ? "admin_empresa" : "usuario", permissoes: permissions }).eq("id", userId).eq(target.empresa_id ? "empresa_id" : "empresa_id_bloqueada", tenantCompany.id);
        if (error) throw error;
        return json(200, { status: target.status });
      }
      if (action === "TEAM_BLOCK") {
        if (target.status !== "ATIVO" || target.empresa_id !== tenantCompany.id) return json(409, { error: "Usuário não está ativo nesta empresa." });
        const { error } = await admin.from("usuarios").update({ empresa_id: null, empresa_id_bloqueada: tenantCompany.id, status: "BLOQUEADO" }).eq("id", userId).eq("empresa_id", tenantCompany.id);
        if (error) throw error;
        const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
        if (authUpdateError) throw authUpdateError;
        return json(200, { status: "BLOQUEADO" });
      }
      if (action === "TEAM_UNBLOCK") {
        if (target.status !== "BLOQUEADO" || target.empresa_id_bloqueada !== tenantCompany.id) return json(409, { error: "Usuário não está bloqueado nesta empresa." });
        const { error } = await admin.from("usuarios").update({ empresa_id: tenantCompany.id, empresa_id_bloqueada: null, status: "ATIVO" }).eq("id", userId).eq("empresa_id_bloqueada", tenantCompany.id);
        if (error) throw error;
        const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
        if (authUpdateError) throw authUpdateError;
        return json(200, { status: "ATIVO" });
      }
      const { error } = await admin.from("usuarios").update({ empresa_id: null, empresa_id_bloqueada: null, status: "REPROVADO", permissoes: {} }).eq("id", userId).or(`empresa_id.eq.${tenantCompany.id},empresa_id_bloqueada.eq.${tenantCompany.id}`);
      if (error) throw error;
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (authUpdateError) throw authUpdateError;
      return json(200, { status: "REPROVADO" });
    }

    if (action === "LIST_USERS") {
      const { data: users, error } = await admin.from("usuarios").select("id,nome,email,created_at,role,tipo_usuario,permissoes,status,empresa_id,empresa_id_bloqueada,empresa_solicitada,valor_mensal").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: companies, error: companiesError } = await admin.from("empresas").select("id,name,tipo,status,plano,plano_id,valor_mensal,empresa_modulos(modulo_key,habilitado)").order("name");
      if (companiesError) throw companiesError;
      const { data: plans, error: plansError } = await admin.from("planos").select("id,nome,tipo_cliente,ativo,valor_mensal,descricao,plano_modulos(modulo_key)").order("nome");
      if (plansError) throw plansError;
      const planMap = new Map((plans || []).map((plan) => [plan.id, plan]));
      const enrichedCompanies = (companies || []).map((company) => {
        const plan = planMap.get(company.plano_id);
        const modules = new Set((plan?.plano_modulos || []).map((item) => item.modulo_key));
        for (const item of company.empresa_modulos || []) item.habilitado ? modules.add(item.modulo_key) : modules.delete(item.modulo_key);
        return { ...company, modulos_incluidos: (plan?.plano_modulos || []).map((item) => item.modulo_key), modulos_efetivos: [...modules] };
      });
      const names = new Map((companies || []).map((item) => [item.id, item.name]));
      return json(200, {
        companies: enrichedCompanies,
        plans: plans || [],
        users: (users || []).map((item) => ({ ...item, empresa_nome: names.get(item.empresa_id || item.empresa_id_bloqueada) || item.empresa_solicitada || "" })),
      });
    }

    if (action === "CREATE_PLAN") {
      const nome = String(body.plan?.nome || "").trim();
      const tipo = String(body.plan?.tipo_cliente || "");
      const valor = Number(body.plan?.valor_mensal || 0);
      const modules = [...new Set((body.plan?.modulos || []).map(String))].filter((key) => contractKeys.includes(key));
      if (!nome || !["PF", "PJ"].includes(tipo) || !Number.isFinite(valor) || valor < 0) return json(400, { error: "Dados do plano inválidos." });
      if (tipo === "PF" && modules.some((key) => key !== "financas_pessoais")) return json(400, { error: "Plano PF aceita somente Finanças Pessoais." });
      const { data: plan, error } = await admin.from("planos").insert({ nome, tipo_cliente: tipo, valor_mensal: valor, ativo: true }).select("id").single();
      if (error) throw error;
      if (modules.length) {
        const { error: moduleError } = await admin.from("plano_modulos").insert(modules.map((modulo_key) => ({ plano_id: plan.id, modulo_key })));
        if (moduleError) { await admin.from("planos").delete().eq("id", plan.id); throw moduleError; }
      }
      return json(200, { id: plan.id });
    }

    if (action === "UPDATE_COMPANY_ACCESS") {
      const companyId = String(body.company?.id || "");
      const tipo = String(body.company?.tipo || "");
      const status = String(body.company?.status || "");
      const planId = body.company?.plano_id ? String(body.company.plano_id) : null;
      const requested = [...new Set((body.company?.modulos || []).map(String))].filter((key) => contractKeys.includes(key));
      if (!companyId || !["PF", "PJ"].includes(tipo) || !["ATIVO", "SUSPENSO", "CANCELADO"].includes(status)) return json(400, { error: "Dados comerciais inválidos." });
      if (tipo === "PF" && requested.some((key) => key !== "financas_pessoais")) return json(400, { error: "Cliente PF aceita somente Finanças Pessoais." });
      let plan = null;
      if (planId) {
        const { data, error } = await admin.from("planos").select("id,nome,tipo_cliente,plano_modulos(modulo_key)").eq("id", planId).maybeSingle();
        if (error || !data || data.tipo_cliente !== tipo) return json(400, { error: "Plano incompatível com o tipo de cliente." });
        plan = data;
      }
      const base = new Set((plan?.plano_modulos || []).map((item) => item.modulo_key));
      const desired = new Set(requested);
      const overrides = contractKeys.filter((key) => base.has(key) !== desired.has(key)).map((modulo_key) => ({ empresa_id: companyId, modulo_key, habilitado: desired.has(modulo_key), alterado_por: authData.user.id }));
      const { error: companyError } = await admin.from("empresas").update({ tipo, status, plano_id: planId, plano: plan?.nome || null }).eq("id", companyId);
      if (companyError) throw companyError;
      const { error: clearError } = await admin.from("empresa_modulos").delete().eq("empresa_id", companyId);
      if (clearError) throw clearError;
      if (overrides.length) { const { error } = await admin.from("empresa_modulos").insert(overrides); if (error) throw error; }
      return json(200, { status, modulos_efetivos: requested });
    }

    if (action === "INVITE_USER") {
      const email = String(body.email || "").trim().toLowerCase();
      const nome = String(body.nome || "").trim();
      const empresa = String(body.empresa_nome || "").trim();
      if (!email || !nome || !empresa) return json(400, { error: "Nome, e-mail e empresa são obrigatórios." });
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { nome, empresa_nome: empresa }, redirectTo: authRedirectTo });
      if (error) throw error;
      return json(200, { user_id: data.user.id, status: "PENDENTE" });
    }

    const userId = String(body.user_id || body.user?.id || "");
    const targetColumns = action === "UPDATE_USER"
      ? "id,nome,email,role,master_admin,tipo_usuario,permissoes,status,empresa_id,empresa_id_bloqueada,empresa_solicitada,valor_mensal"
      : "*";
    const { data: target, error: targetError } = await admin.from("usuarios").select(targetColumns).eq("id", userId).maybeSingle();
    if (targetError || !target) return json(404, { error: "Usuário não encontrado." });
    if (target.master_admin || target.role === "master") return json(400, { error: "Este fluxo não altera outro Master Admin." });

    if (action === "APPROVE_USER") {
      let requestedCompanyId = "";
      let requestedCompanyName = "";
      try {
        ({ empresaId: requestedCompanyId, empresaNome: requestedCompanyName } = normalizeApprovalChoice(body));
      } catch (error) {
        return json(400, { error: error instanceof Error ? error.message : "Escolha inválida." });
      }

      if (target.status === "ATIVO" && target.empresa_id) {
        if (requestedCompanyId && target.empresa_id !== requestedCompanyId) {
          return json(409, { error: "Usuário já aprovado em outra empresa." });
        }
        const { data: currentCompany } = await admin.from("empresas").select("id,name").eq("id", target.empresa_id).maybeSingle();
        if (requestedCompanyName && currentCompany?.name !== requestedCompanyName) {
          return json(409, { error: "Usuário já aprovado em outra empresa." });
        }
        const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
        if (authError) throw authError;
        return json(200, { status: "ATIVO", empresa_id: target.empresa_id, replay: true });
      }
      if (target.status !== "PENDENTE") return json(409, { error: "Somente cadastro pendente pode ser aprovado." });

      let empresaId = requestedCompanyId;
      let createdCompanyId = "";
      if (empresaId) {
        const { data: company, error } = await admin.from("empresas").select("id").eq("id", empresaId).maybeSingle();
        if (error) throw error;
        if (!company) return json(404, { error: "Empresa existente não encontrada." });
      } else {
        const { data: recoveredCompany, error: recoveryError } = await admin.from("empresas").select("id,name").eq("user_id", userId).maybeSingle();
        if (recoveryError) throw recoveryError;
        if (recoveredCompany) {
          if (recoveredCompany.name !== requestedCompanyName) return json(409, { error: "Já existe empresa de recuperação com outro nome para este cadastro." });
          empresaId = recoveredCompany.id;
        } else {
          const { data: company, error } = await admin.from("empresas").insert({ name: requestedCompanyName, user_id: userId, email: target.email, status: "ATIVO" }).select("id").single();
          if (error) throw error;
          empresaId = company.id;
          createdCompanyId = company.id;
        }
      }

      const previousProfile = {
        empresa_id: target.empresa_id,
        empresa_id_bloqueada: target.empresa_id_bloqueada,
        status: target.status,
        role: target.role,
        tipo_usuario: target.tipo_usuario,
        permissoes: target.permissoes,
      };
      let profileUpdated = false;
      try {
        const { error } = await admin.from("usuarios").update({ empresa_id: empresaId, empresa_id_bloqueada: null, status: "ATIVO", role: "cliente", tipo_usuario: "cliente", nivel: "admin_empresa", permissoes: target.permissoes || defaults }).eq("id", userId);
        if (error) throw error;
        profileUpdated = true;
        const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
        if (authError) throw authError;
      } catch (approvalError) {
        const compensationErrors = await compensateFailedApproval({
          profileUpdated,
          createdCompanyId,
          restoreProfile: async () => {
            const { error } = await admin.from("usuarios").update(previousProfile).eq("id", userId);
            if (error) throw error;
          },
          deleteCompany: async (companyId) => {
            const { error } = await admin.from("empresas").delete().eq("id", companyId);
            if (error) throw error;
          },
        });
        if (compensationErrors.length) throw new Error(`Falha na aprovação e na compensação (${compensationErrors.join("; ")}).`);
        throw approvalError;
      }
      return json(200, { status: "ATIVO", empresa_id: empresaId, replay: false });
    }
    if (action === "REJECT_USER") {
      const { error } = await admin.from("usuarios").update({ empresa_id: null, empresa_id_bloqueada: null, status: "REPROVADO" }).eq("id", userId);
      if (error) throw error;
      const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (authError) throw authError;
      return json(200, { status: "REPROVADO" });
    }
    if (action === "BLOCK_USER") {
      if (!target.empresa_id) return json(400, { error: "Usuário ativo sem empresa vinculada." });
      const { error } = await admin.from("usuarios").update({ empresa_id_bloqueada: target.empresa_id, empresa_id: null, status: "BLOQUEADO" }).eq("id", userId);
      if (error) throw error;
      const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (authError) throw authError;
      return json(200, { status: "BLOQUEADO" });
    }
    if (action === "UNBLOCK_USER") {
      if (!target.empresa_id_bloqueada) return json(400, { error: "Empresa anterior não identificada." });
      const { error } = await admin.from("usuarios").update({ empresa_id: target.empresa_id_bloqueada, empresa_id_bloqueada: null, status: "ATIVO" }).eq("id", userId);
      if (error) throw error;
      const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (authError) throw authError;
      return json(200, { status: "ATIVO" });
    }
    if (action === "UPDATE_USER") {
      const input = body.user || {};
      const nome = String(input.nome || "").trim();
      const empresaNome = String(input.empresa_nome || "").trim();
      const role = String(input.role || "cliente");
      const status = String(input.status || "ATIVO");
      const valorMensal = Number(input.valor_mensal || 0);
      if (!nome || !empresaNome) return json(400, { error: "Nome e empresa são obrigatórios." });
      if (!["cliente", "usuario"].includes(role)) return json(400, { error: "Perfil inválido." });
      if (!["ATIVO", "BLOQUEADO", "REPROVADO"].includes(status)) return json(400, { error: "Status inválido." });
      if (!Number.isFinite(valorMensal) || valorMensal < 0) return json(400, { error: "Valor mensal inválido." });
      let empresaId = target.empresa_id || target.empresa_id_bloqueada;
      let companyUpdated = false;
      if (empresaId) {
        if (hasNormalizedTextChanged(target.empresa_solicitada, empresaNome)) {
          const { data: company, error: companyError } = await admin.from("empresas").select("id,name").eq("id", empresaId).maybeSingle();
          if (companyError) throw companyError;
          if (!company) return json(404, { error: "Empresa vinculada não encontrada." });
          if (hasNormalizedTextChanged(company.name, empresaNome)) {
            const { error } = await admin.from("empresas").update({ name: empresaNome }).eq("id", empresaId);
            if (error) throw error;
            companyUpdated = true;
          }
        }
      } else if (status !== "REPROVADO") {
        const { data: company, error } = await admin.from("empresas").insert({ name: empresaNome, user_id: userId, email: target.email, status: "ATIVO" }).select("id").single();
        if (error) throw error;
        empresaId = company.id;
        companyUpdated = true;
      }
      const { changes, normalized } = buildUserChanges({ target, input, permissionKeys, empresaId });
      if (empresaId) {
        const contracted = await companyModules(admin, empresaId);
        const limited = { ...normalized.permissoes };
        for (const key of contractKeys) limited[key] = contracted.has(key) && limited[key] === true;
        for (const key of personalDetailKeys) limited[key] = contracted.has("financas_pessoais") && limited[key] === true;
        normalized.permissoes = limited;
        if (JSON.stringify(target.permissoes || {}) !== JSON.stringify(limited)) changes.permissoes = limited;
      }
      const changedFields = Object.keys(changes);
      if (changedFields.length) {
        const { error } = await admin.from("usuarios").update(changes).eq("id", userId);
        if (error) throw error;
      }
      const authUpdated = shouldSyncAuth(target.status, normalized.status);
      if (authUpdated) {
        const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: normalized.status === "ATIVO" ? "none" : "876000h" });
        if (authError) throw authError;
      }
      return json(200, {
        status: normalized.status,
        changed: companyUpdated || changedFields.length > 0 || authUpdated,
        updated_fields: changedFields,
        company_updated: companyUpdated,
        auth_updated: authUpdated,
      });
    }
    return json(400, { error: "Ação administrativa inválida." });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : "Falha administrativa." });
  }
});
