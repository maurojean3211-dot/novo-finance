import test from "node:test";
import assert from "node:assert/strict";
import { createAdminClient } from "./adminClientFlow.js";

test("novo cliente encadeia operações existentes e limita permissões", async () => {
  const calls = [];
  const draft = { nome: "Responsável", email: "responsavel@example.invalid", empresaNome: "Empresa Teste", tipo: "PJ", plano_id: "plano-1", modulos: ["vendas"], permissoes: { vendas: true, compras: true } };
  const result = await createAdminClient(draft, {
    invite: async () => { calls.push("invite"); return { user_id: "user-1" }; },
    approve: async (userId) => { calls.push(`approve:${userId}`); return { empresa_id: "company-1" }; },
    updateCompany: async (company) => { calls.push(`company:${company.id}`); },
    updateUser: async (user) => { calls.push(`user:${user.id}`); assert.equal(user.permissoes.vendas, true); assert.equal(user.permissoes.compras, false); },
  });
  assert.deepEqual(calls, ["invite", "approve:user-1", "company:company-1", "user:user-1"]);
  assert.deepEqual(result, { userId: "user-1", companyId: "company-1" });
});

test("falha informa a etapa e não executa etapas posteriores", async () => {
  const calls = [];
  await assert.rejects(() => createAdminClient({ empresaNome: "Empresa", modulos: [], permissoes: {} }, {
    invite: async () => ({ user_id: "user-1" }),
    approve: async () => ({ empresa_id: "company-1" }),
    updateCompany: async () => { throw new Error("indisponível"); },
    updateUser: async () => calls.push("update-user"),
  }), /plano e módulos da empresa/);
  assert.deepEqual(calls, []);
});
