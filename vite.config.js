import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { validateSupabaseEnvironment } from './src/config/supabaseEnvironment.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, process.cwd(), 'VITE_')
  const env = { ...loaded, ...process.env }
  validateSupabaseEnvironment({
    appEnv: env.VITE_APP_ENV,
    projectRef: env.VITE_SUPABASE_PROJECT_REF,
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  }, { viteMode: mode })

  return {
    plugins: [react()],
  }
})
