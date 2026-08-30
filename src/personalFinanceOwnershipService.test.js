import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const servicePath = fileURLToPath(new URL("./modules/financeiro-pessoal/services/personalFinance.service.js", import.meta.url));
const rawServiceSource = readFileSync(servicePath, "utf8");
const serviceSource = rawServiceSource.replace(/\s+/g, " ");

function createSupabaseStub() {
  const calls = [];
  const rows = {
    despesas: [
      { id: "despesa-owner-a", empresa_id: "empresa-a", proprietario_id: "owner-a", tipo: "despesa" },
      { id: "despesa-owner-b", empresa_id: "empresa-a", proprietario_id: "owner-b", tipo: "despesa" },
    ],
    financeiro_recorrencias: [
      { id: "pessoal-owner-a", empresa_id: "empresa-a", proprietario_id: "owner-a", escopo: "Pessoal" },
      { id: "pessoal-owner-b", empresa_id: "empresa-a", proprietario_id: "owner-b", escopo: "Pessoal" },
      { id: "empresarial-a", empresa_id: "empresa-a", proprietario_id: null, escopo: "Empresarial" },
    ],
  };
  return {
    calls,
    from(table) {
      const call = { table, operation: "", payload: null, filters: [], affected: null };
      calls.push(call);
      const query = {
        update(payload) { call.operation = "update"; call.payload = payload; return query; },
        delete() { call.operation = "delete"; return query; },
        insert(payload) { call.operation = "insert"; call.payload = payload; return query; },
        eq(column, value) { call.filters.push([column, value]); return query; },
        then(resolve, reject) {
          call.affected = (rows[table] || []).filter((row) =>
            call.filters.every(([column, value]) => row[column] === value),
          );
          return Promise.resolve({ data: call.affected, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

const supabaseStub = createSupabaseStub();
globalThis.__personalFinanceOwnershipSupabase = supabaseStub;
const executableServiceSource = rawServiceSource.replace(
  /import\s+\{\s*supabase\s*\}\s+from\s+"\.\.\/\.\.\/\.\.\/supabase";/,
  "const supabase = globalThis.__personalFinanceOwnershipSupabase;",
);
assert.notEqual(executableServiceSource, rawServiceSource, "Import Supabase não foi substituído no harness");
const service = await import(`data:text/javascript;base64,${Buffer.from(executableServiceSource).toString("base64")}`);
delete globalThis.__personalFinanceOwnershipSupabase;

function functionSource(name, nextName) {
  const start = serviceSource.indexOf(`export async function ${name}`);
  const end = nextName ? serviceSource.indexOf(`export async function ${nextName}`, start) : serviceSource.length;
  assert.notEqual(start, -1, `Função ${name} não encontrada`);
  assert.notEqual(end, -1, `Limite da função ${name} não encontrado`);
  return serviceSource.slice(start, end);
}

function resetCalls() { supabaseStub.calls.length = 0; }

test("UPDATE pessoal envia id, empresa, proprietário e tipo ao Supabase", async () => {
  resetCalls();
  await service.savePersonalTransaction({
    empresaId: "empresa-a", userId: "owner-a", tipo: "despesa", id: "despesa-owner-a",
    values: { descricao: "Teste", valor: 10, data: "2026-08-30", categoria: "" },
  });
  assert.equal(supabaseStub.calls.length, 1);
  assert.equal(supabaseStub.calls[0].operation, "update");
  assert.deepEqual(supabaseStub.calls[0].filters, [
    ["id", "despesa-owner-a"], ["empresa_id", "empresa-a"],
    ["proprietario_id", "owner-a"], ["tipo", "despesa"],
  ]);
});

test("DELETE pessoal sem userId rejeita antes de consultar o Supabase", async () => {
  resetCalls();
  await assert.rejects(
    service.deletePersonalTransaction({ empresaId: "empresa-a", tipo: "despesa", id: "despesa-owner-a" }),
    /Proprietário não identificado/,
  );
  assert.equal(supabaseStub.calls.length, 0);
});

test("DELETE pessoal envia id, empresa, proprietário e tipo ao Supabase", async () => {
  resetCalls();
  await service.deletePersonalTransaction({
    empresaId: "empresa-a", userId: "owner-a", tipo: "despesa", id: "despesa-owner-a",
  });
  assert.equal(supabaseStub.calls.length, 1);
  assert.equal(supabaseStub.calls[0].operation, "delete");
  assert.deepEqual(supabaseStub.calls[0].filters, [
    ["id", "despesa-owner-a"], ["empresa_id", "empresa-a"],
    ["proprietario_id", "owner-a"], ["tipo", "despesa"],
  ]);
  assert.equal(supabaseStub.calls[0].affected.length, 1);
});

test("DELETE pessoal não afeta registro de outro proprietário", async () => {
  resetCalls();
  await service.deletePersonalTransaction({
    empresaId: "empresa-a", userId: "owner-a", tipo: "despesa", id: "despesa-owner-b",
  });
  assert.equal(supabaseStub.calls.length, 1);
  assert.equal(supabaseStub.calls[0].affected.length, 0);
});

test("desativação de conta fixa sem userId rejeita antes de consultar o Supabase", async () => {
  resetCalls();
  await assert.rejects(
    service.deletePersonalFixedExpense({ empresaId: "empresa-a", id: "pessoal-owner-a" }),
    /Proprietário não identificado/,
  );
  assert.equal(supabaseStub.calls.length, 0);
});

test("desativação de conta fixa envia id, empresa, proprietário e escopo Pessoal", async () => {
  resetCalls();
  await service.deletePersonalFixedExpense({
    empresaId: "empresa-a", userId: "owner-a", id: "pessoal-owner-a",
  });
  assert.equal(supabaseStub.calls.length, 1);
  assert.equal(supabaseStub.calls[0].operation, "update");
  assert.deepEqual(supabaseStub.calls[0].payload, { ativo: false });
  assert.deepEqual(supabaseStub.calls[0].filters, [
    ["id", "pessoal-owner-a"], ["empresa_id", "empresa-a"],
    ["proprietario_id", "owner-a"], ["escopo", "Pessoal"],
  ]);
  assert.equal(supabaseStub.calls[0].affected.length, 1);
});

test("desativação pessoal não afeta recorrência de outro proprietário", async () => {
  resetCalls();
  await service.deletePersonalFixedExpense({
    empresaId: "empresa-a", userId: "owner-a", id: "pessoal-owner-b",
  });
  assert.equal(supabaseStub.calls[0].affected.length, 0);
});

test("desativação pessoal não afeta recorrência Empresarial", async () => {
  resetCalls();
  await service.deletePersonalFixedExpense({
    empresaId: "empresa-a", userId: "owner-a", id: "empresarial-a",
  });
  assert.equal(supabaseStub.calls[0].affected.length, 0);
  assert.deepEqual(supabaseStub.calls[0].filters.at(-1), ["escopo", "Pessoal"]);
});

test("verificação estrutural complementar preserva os filtros no código-fonte", () => {
  const update = functionSource("savePersonalTransaction", "deletePersonalTransaction");
  const transactionDelete = functionSource("deletePersonalTransaction", "savePersonalFixedExpense");
  const fixedDelete = functionSource("deletePersonalFixedExpense", "generatePersonalRecurringTitles");
  assert.match(update, /\.eq\("proprietario_id", userId\)\.eq\("tipo", tipo\)/);
  assert.match(transactionDelete, /\.eq\("proprietario_id", userId\)\.eq\("tipo", tipo\)/);
  assert.match(fixedDelete, /\.eq\("proprietario_id", userId\)\.eq\("escopo", "Pessoal"\)/);
});
