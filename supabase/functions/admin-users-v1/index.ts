import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.99.3";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const defaults = { vendas: true, compras: true, financeiro: true, recebimentos: true, contas_pagar: true, relatorio: true };
const permissionKeys = ["pessoal_visao_geral", "pessoal_receitas", "pessoal_despesas", "pessoal_contas_pagar", "pessoal_contas_fixas", "pessoal_relatorios", "vendas", "compras", "contas_pagar", "recebimentos", "financeiro", "relatorio"];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

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
    const { data: caller } = await admin.from("usuarios").select("id,role,master_admin,status").eq("id", authData.user.id).maybeSingle();
    if (!caller || caller.status !== "ATIVO" || (caller.role !== "master" && caller.master_admin !== true)) return json(403, { error: "Ação restrita ao Master Admin." });

    const body = await request.json();
    const action = String(body.action || "");
    if (action === "LIST_USERS") {
      const { data: users, error } = await admin.from("usuarios").select("id,nome,email,created_at,role,tipo_usuario,permissoes,status,empresa_id,empresa_id_bloqueada,empresa_solicitada,valor_mensal").order("created_at", { ascending: false });
      if (error) throw error;
      const companyIds = [...new Set((users || []).flatMap((item) => [item.empresa_id, item.empresa_id_bloqueada]).filter(Boolean))];
      const { data: companies } = companyIds.length ? await admin.from("empresas").select("id,name").in("id", companyIds) : { data: [] };
      const names = new Map((companies || []).map((item) => [item.id, item.name]));
      return json(200, { users: (users || []).map((item) => ({ ...item, empresa_nome: names.get(item.empresa_id || item.empresa_id_bloqueada) || item.empresa_solicitada || "" })) });
    }

    if (action === "INVITE_USER") {
      const email = String(body.email || "").trim().toLowerCase();
      const nome = String(body.nome || "").trim();
      const empresa = String(body.empresa_nome || "").trim();
      if (!email || !nome || !empresa) return json(400, { error: "Nome, e-mail e empresa são obrigatórios." });
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { nome, empresa_nome: empresa } });
      if (error) throw error;
      return json(200, { user_id: data.user.id, status: "PENDENTE" });
    }

    const userId = String(body.user_id || body.user?.id || "");
    const { data: target, error: targetError } = await admin.from("usuarios").select("*").eq("id", userId).maybeSingle();
    if (targetError || !target) return json(404, { error: "Usuário não encontrado." });
    if (target.master_admin || target.role === "master") return json(400, { error: "Este fluxo não altera outro Master Admin." });

    if (action === "APPROVE_USER") {
      let empresaId = body.empresa_id ? String(body.empresa_id) : "";
      if (!empresaId) {
        const companyName = String(body.empresa_nome || target.empresa_solicitada || "").trim();
        if (!companyName) return json(400, { error: "Informe a empresa para aprovação." });
        const { data: company, error } = await admin.from("empresas").insert({ name: companyName, user_id: userId, email: target.email, status: "ATIVO" }).select("id").single();
        if (error) throw error;
        empresaId = company.id;
      }
      const { error } = await admin.from("usuarios").update({ empresa_id: empresaId, empresa_id_bloqueada: null, status: "ATIVO", role: "cliente", tipo_usuario: "usuario", permissoes: target.permissoes || defaults }).eq("id", userId);
      if (error) throw error;
      const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (authError) throw authError;
      return json(200, { status: "ATIVO", empresa_id: empresaId });
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
      const suppliedPermissions = input.permissoes && typeof input.permissoes === "object" ? input.permissoes : {};
      const permissoes = Object.fromEntries(permissionKeys.map((key) => [key, suppliedPermissions[key] === true]));
      let empresaId = target.empresa_id || target.empresa_id_bloqueada;
      if (empresaId) {
        const { error } = await admin.from("empresas").update({ name: empresaNome }).eq("id", empresaId);
        if (error) throw error;
      } else if (status !== "REPROVADO") {
        const { data: company, error } = await admin.from("empresas").insert({ name: empresaNome, user_id: userId, email: target.email, status: "ATIVO" }).select("id").single();
        if (error) throw error;
        empresaId = company.id;
      }
      const active = status === "ATIVO";
      const { error } = await admin.from("usuarios").update({
        nome, role, tipo_usuario: role, permissoes, valor_mensal: valorMensal,
        empresa_solicitada: empresaNome, status,
        empresa_id: active ? empresaId : null,
        empresa_id_bloqueada: status === "BLOQUEADO" ? empresaId : null,
      }).eq("id", userId);
      if (error) throw error;
      const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
      if (authError) throw authError;
      return json(200, { status });
    }
    return json(400, { error: "Ação administrativa inválida." });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : "Falha administrativa." });
  }
});
