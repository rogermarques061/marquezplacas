import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Botao, classeCampo } from '../components/ui'
import logo from '../assets/logo.svg'
import { useAuth } from '../lib/auth'
import { modoDemo } from '../lib/supabase'

export default function Login() {
  const { perfil, entrar, carregando } = useAuth()
  const [email, setEmail] = useState(modoDemo ? 'roger@marquez.digital' : '')
  const [senha, setSenha] = useState(modoDemo ? 'demonstracao' : '')
  const [erro, setErro] = useState<string | null>(null)

  if (perfil) return <Navigate to="/painel" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErro(await entrar(email.trim(), senha))
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <img src={logo} alt="" className="mb-6 size-14" />
      <h1 className="text-2xl font-bold">Painel do vendedor</h1>
      <p className="mt-1 text-zinc-400">Entre para ver e validar as vendas.</p>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <input
          id="email"
          className={classeCampo}
          type="email"
          autoComplete="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          id="senha"
          className={classeCampo}
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        <Botao type="submit" disabled={carregando} className="w-full py-3.5">
          {carregando ? 'Entrando…' : 'Entrar'}
        </Botao>
      </form>
    </div>
  )
}
