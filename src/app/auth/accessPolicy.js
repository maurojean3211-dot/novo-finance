import { canAccessMenuItem, findMenuItem } from "../navigation/menuConfig.js";

export const PLATFORM_ADMIN = "PLATFORM_ADMIN";

export function hasPlatformAdminAccess(masterAdmin) {
  return masterAdmin === true;
}

export function isMasterUser(role, masterAdmin) {
  return hasPlatformAdminAccess(masterAdmin) || String(role || "").trim().toLowerCase() === "master";
}

export function canAccessPage(page, permissions, master) {
  const item = findMenuItem(page);
  return item ? canAccessMenuItem(item, permissions, master) : false;
}

export const PERSONAL_PERMISSION_KEYS = Object.freeze([
  "pessoal_visao_geral",
  "pessoal_receitas",
  "pessoal_despesas",
  "pessoal_contas_pagar",
  "pessoal_contas_fixas",
  "pessoal_relatorios",
]);
