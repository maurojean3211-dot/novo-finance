import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260830174207_revogar_privilegios_ddl_roles_api.sql", import.meta.url),
  "utf8",
).toLowerCase();

function statementFor(role, privileges) {
  const statements = migration
    .split(";")
    .map((item) => item.replace(/^\s*(?:--[^\n]*\n\s*)*/g, "").trim())
    .filter(Boolean);
  const pattern = new RegExp(`^revoke\\s+${privileges}\\s+on\\s+table([\\s\\S]*?)from\\s+${role}$`, "i");
  const match = statements.map((statement) => statement.match(pattern)).find(Boolean);
  assert.ok(match, `REVOKE esperado para ${role}: ${privileges}`);
  return [...match[1].matchAll(/public\.([a-z0-9_]+)/g)].map((item) => item[1]);
}

test("migration revoga somente privilégios DDL inventariados", () => {
  const anon = statementFor("anon", "truncate,\\s*trigger,\\s*references");
  const authenticatedAll = statementFor("authenticated", "truncate,\\s*trigger,\\s*references");
  const authenticatedRemaining = statementFor("authenticated", "trigger,\\s*references");

  assert.equal(new Set(anon).size, 49);
  assert.equal(new Set(authenticatedAll).size, 53);
  assert.equal(new Set(authenticatedRemaining).size, 8);
  assert.equal(new Set([...authenticatedAll, ...authenticatedRemaining]).size, 61);
});

test("migration preserva DML, RLS, policies, RPCs, schema e dados", () => {
  assert.doesNotMatch(migration, /revoke\s+[\s\S]*?\b(select|insert|update|delete)\b[\s\S]*?\bfrom\b/);
  assert.doesNotMatch(migration, /\b(alter|create|drop)\s+(table|policy|function)\b/);
  assert.doesNotMatch(migration, /\b(enable|disable|force|no\s+force)\s+row\s+level\s+security\b/);
  assert.doesNotMatch(migration, /\b(insert\s+into|update\s+public\.|delete\s+from|truncate\s+table)\b/);
  assert.equal((migration.match(/^revoke\b/gm) || []).length, 3);
});
