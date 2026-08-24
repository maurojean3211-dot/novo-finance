import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildUserChanges,
  compensateFailedApproval,
  hasNormalizedTextChanged,
  isAuthorizedMaster,
  normalizeApprovalChoice,
  shouldSyncAuth,
} from "../supabase/functions/admin-users-v1/adminUsersSecurity.js";
import {
  canApplyBackgroundRefresh,
  executeUserSave,
  mergeSavedUser,
} from "./masterAdminSave.js";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("usuário comum não passa pela autorização Master", () => {
  assert.equal(isAuthorizedMaster({ status: "ATIVO", role: "usuario", master_admin: false }), false);
  assert.equal(isAuthorizedMaster({ status: "BLOQUEADO", role: "master", master_admin: true }), false);
  assert.equal(isAuthorizedMaster({ status: "ATIVO", role: "master", master_admin: false }), true);
  assert.equal(isAuthorizedMaster({ status: "ATIVO", role: "cliente", master_admin: true }), true);
});

test("Master pode escolher empresa existente ou nova, nunca ambas", () => {
  assert.deepEqual(normalizeApprovalChoice({ empresa_id: "empresa-a" }), { empresaId: "empresa-a", empresaNome: "" });
  assert.deepEqual(normalizeApprovalChoice({ empresa_nome: "Nova Empresa" }), { empresaId: "", empresaNome: "Nova Empresa" });
  assert.throws(() => normalizeApprovalChoice({}), /Escolha/);
  assert.throws(() => normalizeApprovalChoice({ empresa_id: "a", empresa_nome: "b" }), /Escolha/);
});

test("falha intermediária restaura perfil e remove somente a empresa criada", async () => {
  const calls = [];
  const errors = await compensateFailedApproval({
    profileUpdated: true,
    createdCompanyId: "nova-empresa",
    restoreProfile: async () => calls.push("perfil-restaurado"),
    deleteCompany: async (id) => calls.push(`empresa-removida:${id}`),
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(calls, ["perfil-restaurado", "empresa-removida:nova-empresa"]);
});

test("compensação preserva empresa se o perfil não puder ser restaurado", async () => {
  let companyDeleted = false;
  const errors = await compensateFailedApproval({
    profileUpdated: true,
    createdCompanyId: "nova-empresa",
    restoreProfile: async () => { throw new Error("indisponível"); },
    deleteCompany: async () => { companyDeleted = true; },
  });
  assert.equal(companyDeleted, false);
  assert.match(errors[0], /perfil/);
});

test("migration bloqueia TRUNCATE, DELETE e updates administrativos sem retirar RLS", async () => {
  const sql = await read("supabase/migrations/20260823231808_proteger_empresas_master_admin.sql");
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke truncate, delete[\s\S]*from authenticated/i);
  assert.match(sql, /revoke update[\s\S]*from authenticated/i);
  assert.match(sql, /grant update \(name, email, tipo, cpf, whatsapp, pix_chave, pix\)/i);
  for (const column of ["user_id", "is_admin", "plano", "status", "isento", "valor_mensal", "pagou", "mes_pagamento", "valor"]) {
    const grant = sql.match(/grant update \(([^)]+)\)/i)?.[1] || "";
    assert.equal(grant.includes(column), false, `${column} não pode permanecer atualizável`);
  }
  assert.match(sql, /drop policy if exists empresas_delete_v1/i);
});

test("frontend usa apenas admin-users-v1 e não chama UPDATE_PERMISSIONS inexistente", async () => {
  const [service, masterPage] = await Promise.all([
    read("src/services/adminUsers.service.js"),
    read("src/MasterAdmin.jsx"),
  ]);
  assert.match(service, /functions\.invoke\("admin-users-v1"/);
  assert.doesNotMatch(service + masterPage, /excluir-usuario|bright-worker|UPDATE_PERMISSIONS/);
});

test("identificação visual de Master usa somente perfil persistido", async () => {
  const policy = await read("src/app/auth/accessPolicy.js");
  assert.doesNotMatch(policy, /user_metadata|maurojean3211@gmail\.com/i);
  assert.match(policy, /masterAdmin === true/);
});

test("isolamento de usuários continua baseado no próprio auth.uid", async () => {
  const sql = await read("supabase/migrations/20260820165159_corrigir_isolamento_multiempresa_v1.sql");
  assert.match(sql, /usuarios_select_proprio_v1[\s\S]*auth\.uid\(\)/i);
  assert.match(sql, /usuarios_update_proprio_v1[\s\S]*auth\.uid\(\)/i);
});

test("save aplica nome, valor mensal, perfil e permissões sem perder os demais dados", () => {
  const original = [{ id: "u1", email: "karla@example.com", empresa_id: "e1", empresa_nome: "Antiga", nome: "Karla", role: "cliente", status: "ATIVO", valor_mensal: 10, permissoes: { vendas: true } }];
  const draft = { id: "u1", empresa_id: "e1", nome: "Karla Andrea", empresa_nome: "Nova", role: "usuario", status: "ATIVO", valor_mensal: 125.5, permissoes: { vendas: false, compras: true } };
  const [saved] = mergeSavedUser(original, draft, { status: "ATIVO" });
  assert.equal(saved.nome, "Karla Andrea");
  assert.equal(saved.valor_mensal, 125.5);
  assert.equal(saved.role, "usuario");
  assert.deepEqual(saved.permissoes, { vendas: false, compras: true });
  assert.equal(saved.email, "karla@example.com");
  assert.equal(saved.empresa_id, "e1");
});

test("save chama UPDATE_USER uma vez, fecha modal no sucesso e libera antes do refresh", async () => {
  const events = [];
  let calls = 0;
  const ok = await executeUserSave({
    draft: { id: "u1" },
    updateUser: async () => { calls += 1; events.push("update"); return { status: "ATIVO" }; },
    onSuccess: () => { events.push("modal-fechado"); events.push("loading-liberado"); events.push("refresh-iniciado"); },
    onError: () => events.push("erro"),
    onFinally: () => {},
  });
  assert.equal(ok, true);
  assert.equal(calls, 1);
  assert.deepEqual(events, ["update", "modal-fechado", "loading-liberado", "refresh-iniciado"]);
});

test("refresh antigo não pode sobrescrever uma edição mais nova", () => {
  assert.equal(canApplyBackgroundRefresh(2, 2), true);
  assert.equal(canApplyBackgroundRefresh(2, 3), false);
});

test("erro de UPDATE_USER mantém modal aberto e mostra erro", async () => {
  let modalOpen = true;
  let feedback = "";
  let busy = true;
  const ok = await executeUserSave({
    draft: { id: "u1" },
    updateUser: async () => { throw new Error("Falha controlada"); },
    onSuccess: () => { modalOpen = false; },
    onError: (error) => { feedback = error.message; },
    onFinally: () => { busy = false; },
  });
  assert.equal(ok, false);
  assert.equal(modalOpen, true);
  assert.equal(feedback, "Falha controlada");
  assert.equal(busy, false);
});

const updatePermissionKeys = ["vendas", "compras"];
const currentUpdateTarget = {
  nome: "Karla Andrea",
  role: "cliente",
  tipo_usuario: "cliente",
  permissoes: { vendas: true, compras: false },
  valor_mensal: 100,
  empresa_solicitada: "Empresa Karla",
  status: "ATIVO",
  empresa_id: "empresa-1",
  empresa_id_bloqueada: null,
};
const currentUpdateInput = {
  nome: "Karla Andrea",
  role: "cliente",
  permissoes: { vendas: true, compras: false },
  valor_mensal: 100,
  empresa_nome: "Empresa Karla",
  status: "ATIVO",
};

test("UPDATE_USER sem alteração não produz campos nem sincronização Auth", () => {
  const plan = buildUserChanges({ target: currentUpdateTarget, input: currentUpdateInput, permissionKeys: updatePermissionKeys, empresaId: "empresa-1" });
  assert.deepEqual(plan.changes, {});
  assert.equal(hasNormalizedTextChanged("Empresa Karla", plan.normalized.empresaNome), false);
  assert.equal(shouldSyncAuth(currentUpdateTarget.status, plan.normalized.status), false);
});

test("alteração somente do nome do usuário não toca empresa nem Auth", () => {
  const input = { ...currentUpdateInput, nome: "Karla Andrea Cunha" };
  const plan = buildUserChanges({ target: currentUpdateTarget, input, permissionKeys: updatePermissionKeys, empresaId: "empresa-1" });
  assert.deepEqual(plan.changes, { nome: "Karla Andrea Cunha" });
  assert.equal(hasNormalizedTextChanged(currentUpdateTarget.empresa_solicitada, input.empresa_nome), false);
  assert.equal(shouldSyncAuth(currentUpdateTarget.status, input.status), false);
});

test("alteração somente do valor mensal não toca empresa nem Auth", () => {
  const input = { ...currentUpdateInput, valor_mensal: 150 };
  const plan = buildUserChanges({ target: currentUpdateTarget, input, permissionKeys: updatePermissionKeys, empresaId: "empresa-1" });
  assert.deepEqual(plan.changes, { valor_mensal: 150 });
  assert.equal(hasNormalizedTextChanged(currentUpdateTarget.empresa_solicitada, input.empresa_nome), false);
  assert.equal(shouldSyncAuth(currentUpdateTarget.status, input.status), false);
});

test("alteração do nome da empresa é detectada", () => {
  assert.equal(hasNormalizedTextChanged("Empresa Karla", "Empresa Karla Nova"), true);
  assert.equal(hasNormalizedTextChanged(" Empresa Karla ", "Empresa Karla"), false);
});

test("alteração de status produz mudança de perfil e sincronização Auth", () => {
  const input = { ...currentUpdateInput, status: "BLOQUEADO" };
  const plan = buildUserChanges({ target: currentUpdateTarget, input, permissionKeys: updatePermissionKeys, empresaId: "empresa-1" });
  assert.equal(plan.changes.status, "BLOQUEADO");
  assert.equal(plan.changes.empresa_id, null);
  assert.equal(plan.changes.empresa_id_bloqueada, "empresa-1");
  assert.equal(shouldSyncAuth(currentUpdateTarget.status, input.status), true);
});
