import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://leissgrymkxakjvurric.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlaXNzZ3J5bWt4YWtqdnVycmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MjkzNjIsImV4cCI6MjA4NzIwNTM2Mn0.Rx8c7edU0JgNMY3U4AUvk7HidozElACADQkUvqXc7ds";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce"
    }
  }
);