import { NavLink, Navigate, Outlet } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import { Carregando } from '../../components/ui'
import { useAuth } from '../../lib/auth'

export default function LayoutPainel() {
  const { perfil, carregando, sair } = useAuth()

  if (carregando) return <Carregando />
  if (!perfil) return <Navigate to="/login" replace />

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-10 border-b border-borda bg-fundo/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center gap-3">
          <img src={logo} alt="" className="size-8" />
          <nav className="flex flex-1 gap-1 text-sm">
            <Aba para="/painel">Vendas</Aba>
          </nav>
          <span className="hidden text-sm text-zinc-400 sm:inline">{perfil.nome}</span>
          <button type="button" onClick={() => void sair()} className="rounded-lg px-2 py-1 text-sm text-zinc-400">
            Sair
          </button>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  )
}

function Aba({ para, children }: { para: string; children: string }) {
  return (
    <NavLink
      to={para}
      end={false}
      className={({ isActive }) =>
        `rounded-lg px-3 py-1.5 font-medium ${isActive ? 'bg-cartao text-white' : 'text-zinc-400'}`
      }
    >
      {children}
    </NavLink>
  )
}
