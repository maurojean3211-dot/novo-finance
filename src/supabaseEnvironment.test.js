import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateSupabaseEnvironment } from "./config/supabaseEnvironment.js";

const production = {
  appEnv: "production",
  projectRef: "leissgrymkxakjvurric",
  url: "https://leissgrymkxakjvurric.supabase.co",
  anonKey: "test-publishable-key",
};

const homolog = {
  appEnv: "homolog",
  projectRef: "toiehtfotpjwjslpwdff",
  url: "https://toiehtfotpjwjslpwdff.supabase.co",
  anonKey: "test-publishable-key",
};

test("variáveis ausentes falham explicitamente", () => {
  assert.throws(() => validateSupabaseEnvironment({}), /VITE_APP_ENV.*VITE_SUPABASE_PROJECT_REF.*VITE_SUPABASE_URL.*VITE_SUPABASE_ANON_KEY/);
});

test("homolog não aceita a ref de produção", () => {
  assert.throws(() => validateSupabaseEnvironment({ ...homolog, projectRef: production.projectRef }), /Ambiente homolog não pode usar/);
});

test("homolog aceita somente sua configuração explícita", () => {
  assert.deepEqual(validateSupabaseEnvironment(homolog, { viteMode: "homolog" }), homolog);
});

test("production não aceita a ref de homologação", () => {
  assert.throws(() => validateSupabaseEnvironment({ ...production, projectRef: homolog.projectRef }), /Ambiente production não pode usar/);
});

test("production aceita somente sua configuração explícita", () => {
  assert.deepEqual(validateSupabaseEnvironment(production, { viteMode: "production" }), production);
});

test("URL precisa corresponder à ref validada", () => {
  assert.throws(() => validateSupabaseEnvironment({ ...homolog, url: production.url }), /VITE_SUPABASE_URL incompatível/);
});

test("modo Vite explícito não pode divergir do ambiente", () => {
  assert.throws(() => validateSupabaseEnvironment(homolog, { viteMode: "production" }), /Modo Vite production incompatível/);
});

test("cliente Supabase não contém fallback hardcoded", async () => {
  const source = await readFile(new URL("./supabase.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /supabase\.co["']/);
  assert.doesNotMatch(source, /eyJ[a-zA-Z0-9._-]+/);
  assert.match(source, /validateSupabaseEnvironment/);
});
