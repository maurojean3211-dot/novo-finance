const COMPANY_ADMIN_TYPES = new Set(["cliente", "admin_empresa"]);

export function isCompanyAdministrator(user) {
  return COMPANY_ADMIN_TYPES.has(String(user?.tipo_usuario || "").trim().toLowerCase());
}

export function tenantProfileLabel(user, profiles) {
  if (isCompanyAdministrator(user)) return "Administrador da Empresa";
  return profiles[user?.nivel]?.label || user?.nivel || "Personalizado";
}

export function isCurrentTeamUser(user, currentUserId) {
  return Boolean(currentUserId) && user?.id === currentUserId;
}
