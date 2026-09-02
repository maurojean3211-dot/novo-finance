import { MODULE_CATALOG } from "../../app/auth/moduleCatalog.js";

export const USER_PERMISSION_GROUPS = MODULE_CATALOG.filter((module) => !module.permissionOnly).map((module) => ({
  ...module,
  permissions: module.key === "financas_pessoais"
    ? [module, ...MODULE_CATALOG.filter((item) => item.permissionOnly)]
    : [module],
}));

export function limitPermissionsToModules(permissions, contractedModules) {
  const contracted = new Set(contractedModules || []);
  return Object.fromEntries(MODULE_CATALOG.map((permission) => {
    const available = permission.permissionOnly
      ? contracted.has("financas_pessoais")
      : contracted.has(permission.key) && !permission.future;
    return [permission.key, available && permissions?.[permission.key] === true];
  }));
}
