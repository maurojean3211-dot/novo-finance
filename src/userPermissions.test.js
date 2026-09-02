import test from "node:test";
import assert from "node:assert/strict";
import { limitPermissionsToModules, USER_PERMISSION_GROUPS } from "./components/admin/userPermissions.js";

test("editor reúne 14 módulos e 8 subpermissões pessoais", () => {
  assert.equal(USER_PERMISSION_GROUPS.length, 14);
  assert.equal(USER_PERMISSION_GROUPS.find((group) => group.key === "financas_pessoais").permissions.length, 9);
});

test("permissões individuais ficam limitadas aos módulos contratados", () => {
  const limited = limitPermissionsToModules({ vendas: true, compras: true, energia: true }, ["vendas", "energia"]);
  assert.equal(limited.vendas, true);
  assert.equal(limited.compras, false);
  assert.equal(limited.energia, false);
});

test("subpermissões pessoais exigem Finanças Pessoais no contrato", () => {
  const denied = limitPermissionsToModules({ pessoal_receitas: true }, []);
  const allowed = limitPermissionsToModules({ financas_pessoais: true, pessoal_receitas: true }, ["financas_pessoais"]);
  assert.equal(denied.pessoal_receitas, false);
  assert.equal(allowed.financas_pessoais, true);
  assert.equal(allowed.pessoal_receitas, true);
});
