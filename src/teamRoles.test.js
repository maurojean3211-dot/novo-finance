import test from "node:test";
import assert from "node:assert/strict";
import { isCompanyAdministrator, isCurrentTeamUser, tenantProfileLabel } from "./teamRoles.js";

const profiles = { vendedor: { label: "Vendedor" } };

test("cliente responsável é apresentado como administrador apesar de nivel legado", () => {
  const karla = { tipo_usuario: "cliente", nivel: "usuario" };
  assert.equal(isCompanyAdministrator(karla), true);
  assert.equal(tenantProfileLabel(karla, profiles), "Administrador da Empresa");
});

test("admin_empresa também é reconhecido como administrador", () => {
  assert.equal(tenantProfileLabel({ tipo_usuario: "admin_empresa", nivel: "personalizado" }, profiles), "Administrador da Empresa");
});

test("membro comum mantém o perfil operacional", () => {
  assert.equal(isCompanyAdministrator({ tipo_usuario: "usuario", nivel: "vendedor" }), false);
  assert.equal(tenantProfileLabel({ tipo_usuario: "usuario", nivel: "vendedor" }, profiles), "Vendedor");
});

test("proteção da conta atual depende do id autenticado", () => {
  assert.equal(isCurrentTeamUser({ id: "karla" }, "karla"), true);
  assert.equal(isCurrentTeamUser({ id: "membro" }, "karla"), false);
});
