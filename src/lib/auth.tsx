import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { PERFIL_DEMO } from './demo'
import { modoDemo, supabase } from './supabase'
import type { Perfil } from './tipos'

interface Auth {
  carregando: boolean
  perfil: Perfil | null
  entrar(email: string, senha: string): Promise<string | null>
  sair(): Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(modoDemo ? PERFIL_DEMO : null)
  const [carregando, setCarregando] = useState(!modoDemo)

  useEffect(() => {
    if (modoDemo) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      if (!data.session) setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = sessao?.user.id
  useEffect(() => {
    if (modoDemo || !userId) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setPerfil(data as Perfil | null)
        setCarregando(false)
      })
  }, [userId])

  const valor: Auth = {
    carregando,
    perfil: modoDemo ? perfil : userId ? perfil : null,
    async entrar(email, senha) {
      if (modoDemo) {
        setPerfil(PERFIL_DEMO)
        return null
      }
      setCarregando(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        setCarregando(false)
        return error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message
      }
      return null
    },
    async sair() {
      if (modoDemo) {
        setPerfil(null)
        return
      }
      await supabase.auth.signOut()
      setPerfil(null)
    },
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
