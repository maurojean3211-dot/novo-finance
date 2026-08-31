export const SUPABASE_PROJECTS = Object.freeze({
  production: "leissgrymkxakjvurric",
  homolog: "toiehtfotpjwjslpwdff",
});

const REQUIRED_VARIABLES = Object.freeze({
  appEnv: "VITE_APP_ENV",
  projectRef: "VITE_SUPABASE_PROJECT_REF",
  url: "VITE_SUPABASE_URL",
  anonKey: "VITE_SUPABASE_ANON_KEY",
});

export function validateSupabaseEnvironment(values, { viteMode = "" } = {}) {
  const config = Object.fromEntries(Object.keys(REQUIRED_VARIABLES).map((key) => [key, String(values?.[key] || "").trim()]));
  const missing = Object.entries(REQUIRED_VARIABLES).filter(([key]) => !config[key]).map(([, variable]) => variable);
  if (missing.length) throw new Error(`Configuração Supabase ausente: ${missing.join(", ")}.`);

  const expectedRef = SUPABASE_PROJECTS[config.appEnv];
  if (!expectedRef) throw new Error(`VITE_APP_ENV inválido: "${config.appEnv}". Use production ou homolog.`);
  if (config.projectRef !== expectedRef) {
    throw new Error(`Ambiente ${config.appEnv} não pode usar o projeto Supabase ${config.projectRef}. Esperado: ${expectedRef}.`);
  }

  const expectedUrl = `https://${expectedRef}.supabase.co`;
  if (config.url !== expectedUrl) throw new Error(`VITE_SUPABASE_URL incompatível com o ambiente ${config.appEnv}. Esperado: ${expectedUrl}.`);
  if (["production", "homolog"].includes(viteMode) && viteMode !== config.appEnv) {
    throw new Error(`Modo Vite ${viteMode} incompatível com VITE_APP_ENV=${config.appEnv}.`);
  }

  return config;
}
