export function isAuthorizedMaster(profile) {
  return profile?.status === "ATIVO" && (profile?.role === "master" || profile?.master_admin === true);
}

export function isAuthorizedTenantAdmin(profile, company) {
  return profile?.status === "ATIVO"
    && profile?.master_admin !== true
    && profile?.empresa_id
    && ["cliente", "admin_empresa"].includes(String(profile?.tipo_usuario || "").toLowerCase())
    && company?.id === profile.empresa_id
    && company?.tipo === "PJ"
    && company?.status === "ATIVO";
}

export function normalizeTenantPermissions(value, permissionKeys, contractedModules) {
  const source = value && typeof value === "object" ? value : {};
  const allowed = new Set([...contractedModules].filter((key) => !["energia", "representacoes", "financas_pessoais"].includes(key)));
  const forbidden = permissionKeys.filter((key) => source[key] === true && !allowed.has(key));
  if (forbidden.length) throw new Error(`Módulo não contratado: ${forbidden.join(", ")}.`);
  return Object.fromEntries(permissionKeys.map((key) => [key, allowed.has(key) && source[key] === true]));
}

export function targetBelongsToCompany(target, companyId) {
  return Boolean(companyId) && [target?.empresa_id, target?.empresa_id_bloqueada].includes(companyId);
}

export function normalizeApprovalChoice(body = {}) {
  const empresaId = body.empresa_id ? String(body.empresa_id) : "";
  const empresaNome = String(body.empresa_nome || "").trim();
  if ((empresaId && empresaNome) || (!empresaId && !empresaNome)) {
    throw new Error("Escolha uma empresa existente ou informe uma nova empresa.");
  }
  return { empresaId, empresaNome };
}

export async function compensateFailedApproval({ profileUpdated, createdCompanyId, restoreProfile, deleteCompany }) {
  const errors = [];
  let profileRestored = !profileUpdated;
  if (profileUpdated) {
    try {
      await restoreProfile();
      profileRestored = true;
    } catch (error) {
      errors.push(`perfil: ${error?.message || "falha"}`);
    }
  }
  if (createdCompanyId && profileRestored) {
    try { await deleteCompany(createdCompanyId); } catch (error) { errors.push(`empresa: ${error?.message || "falha"}`); }
  }
  return errors;
}

export function normalizePermissionSet(value, permissionKeys) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(permissionKeys.map((key) => [key, source[key] === true]));
}

export function buildUserChanges({ target, input, permissionKeys, empresaId }) {
  const changes = {};
  const nome = String(input.nome || "").trim();
  const empresaNome = String(input.empresa_nome || "").trim();
  const role = String(input.role || "cliente");
  const status = String(input.status || "ATIVO");
  const valorMensal = Number(input.valor_mensal || 0);
  const permissoes = normalizePermissionSet(input.permissoes, permissionKeys);
  const currentPermissions = normalizePermissionSet(target.permissoes, permissionKeys);
  const activeCompanyId = status === "ATIVO" ? empresaId : null;
  const blockedCompanyId = status === "BLOQUEADO" ? empresaId : null;

  if (String(target.nome || "").trim() !== nome) changes.nome = nome;
  if (target.role !== role) changes.role = role;
  if (target.tipo_usuario !== role) changes.tipo_usuario = role;
  if (JSON.stringify(currentPermissions) !== JSON.stringify(permissoes)) changes.permissoes = permissoes;
  if (Number(target.valor_mensal || 0) !== valorMensal) changes.valor_mensal = valorMensal;
  if (String(target.empresa_solicitada || "").trim() !== empresaNome) changes.empresa_solicitada = empresaNome;
  if (target.status !== status) changes.status = status;
  if ((target.empresa_id || null) !== activeCompanyId) changes.empresa_id = activeCompanyId;
  if ((target.empresa_id_bloqueada || null) !== blockedCompanyId) changes.empresa_id_bloqueada = blockedCompanyId;

  return { changes, normalized: { nome, empresaNome, role, status, valorMensal, permissoes } };
}

export function shouldSyncAuth(targetStatus, nextStatus) {
  return targetStatus !== nextStatus;
}

export function hasNormalizedTextChanged(currentValue, nextValue) {
  return String(currentValue || "").trim() !== String(nextValue || "").trim();
}
