import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Demonstração com dados de exemplo: só quando pedida explicitamente (VITE_DEMO=1). */
export const modoDemo = import.meta.env.VITE_DEMO === '1'

/** Produção sem as chaves do Supabase: o app mostra um aviso em vez de dados falsos. */
export const faltaConfiguracao = !modoDemo && (!url || !anonKey)

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'sem-chave')
