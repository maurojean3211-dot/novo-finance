import { canAccessMenuItem, findMenuItem } from "../navigation/menuConfig";

const LEGACY_MASTER_EMAIL = "maurojean3211@gmail.com";

export function isMasterUser(user, role) {
  const normalizedRole = String(role || user?.user_metadata?.role || "").trim().toLowerCase();
  const normalizedEmail = String(user?.email || "").trim().toLowerCase();
  return normalizedRole === "master" || normalizedEmail === LEGACY_MASTER_EMAIL;
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
