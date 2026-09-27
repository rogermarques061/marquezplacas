import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Sem .env configurado o app roda em modo demonstração: nada é salvo. */
export const modoDemo = !url || !anonKey

if (modoDemo) {
  console.warn('Modo demonstração: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
}

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'demo')
