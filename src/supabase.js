import { createClient } from "@supabase/supabase-js";
import { validateSupabaseEnvironment } from "./config/supabaseEnvironment.js";

const supabaseConfig = validateSupabaseEnvironment({
  appEnv: import.meta.env.VITE_APP_ENV,
  projectRef: import.meta.env.VITE_SUPABASE_PROJECT_REF,
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  },
);
