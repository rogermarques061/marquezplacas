import { LayoutDashboard, LogOut, Receipt, Settings, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import { Carregando } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

interface Item {
  para: string
  rotulo: string
  icone: LucideIcon
  fim?: boolean
  emBreve?: boolean
}

const ITENS: Item[] = [
  { para: '/painel', rotulo: 'Dashboard', icone: LayoutDashboard, fim: true },
  { para: '/painel/vendas', rotulo: 'Vendas', icone: Receipt },
  { para: '/painel/leads', rotulo: 'Leads', icone: Users, emBreve: true },
  { para: '/painel/ajustes', rotulo: 'Ajustes', icone: Settings, emBreve: true },
]

function usePendentes() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const contar = () =>
      api
        .listarVendas()
        .then((vs) => setN(vs.filter((v) => v.status_venda === 'pendente').length))
        .catch(() => {})
    contar()
    return api.ouvirVendas(contar)
  }, [])
  return n
}

export default function LayoutPainel() {
  const { perfil, carregando, sair } = useAuth()
  const pendentes = usePendentes()

  if (carregando) return <Carregando />
  if (!perfil) return <Navigate to="/login" replace />

  const inicial = perfil.nome.trim()[0]?.toUpperCase()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Menu lateral (computador) */}
      <div className="hidden border-r border-borda bg-lateral lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col px-4 py-6">
        <Marca />
        <nav className="mt-8 flex flex-col gap-1">
          {ITENS.map((i) => (
            <ItemLateral key={i.para} item={i} badge={i.para === '/painel/vendas' ? pendentes : 0} />
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-xl border border-borda bg-cartao p-3">
          <div className="grid size-9 place-items-center rounded-full bg-marca/20 font-bold text-marca">{inicial}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{perfil.nome}</div>
            <div className="text-xs text-zinc-500 capitalize">{perfil.papel}</div>
          </div>
          <button type="button" onClick={() => void sair()} className="rounded-lg p-2 text-zinc-500 hover:text-white" title="Sair">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      </div>

      <div className="flex min-w-0 flex-col">
        {/* Topo (celular) */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-borda bg-fundo/90 px-4 backdrop-blur lg:hidden">
          <Marca />
          <button
            type="button"
            onClick={() => void sair()}
            className="grid size-9 place-items-center rounded-full bg-marca/20 text-sm font-bold text-marca"
            title="Sair"
          >
            {inicial}
          </button>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-10">
          <Outlet />
        </main>

        {/* Abas (celular) */}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-borda bg-lateral/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {ITENS.map((i) => (
            <ItemAba key={i.para} item={i} badge={i.para === '/painel/vendas' ? pendentes : 0} />
          ))}
        </nav>
      </div>
    </div>
  )
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <img src={logo} alt="" className="h-6 w-auto" />
      <div className="leading-tight">
        <div className="text-[15px] font-extrabold tracking-tight">Marquez</div>
        <div className="text-[10px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Placas NFC</div>
      </div>
    </div>
  )
}

function Badge({ n }: { n: number }) {
  if (!n) return null
  return (
    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-marca px-1.5 text-[11px] font-bold text-white tabular-nums">
      {n}
    </span>
  )
}

function ItemLateral({ item, badge }: { item: Item; badge: number }) {
  const Icone = item.icone
  if (item.emBreve)
    return (
      <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600">
        <Icone className="size-[18px]" />
        {item.rotulo}
        <span className="ml-auto text-[10px] tracking-wide uppercase">em breve</span>
      </span>
    )
  return (
    <NavLink
      to={item.para}
      end={item.fim}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
          isActive ? 'bg-marca/15 text-white' : 'text-zinc-400 hover:bg-cartao hover:text-zinc-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icone className={`size-[18px] ${isActive ? 'text-marca' : ''}`} />
          {item.rotulo}
          <span className="ml-auto">
            <Badge n={badge} />
          </span>
        </>
      )}
    </NavLink>
  )
}

function ItemAba({ item, badge }: { item: Item; badge: number }) {
  const Icone = item.icone
  if (item.emBreve)
    return (
      <span className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-zinc-600">
        <Icone className="size-5" />
        {item.rotulo}
      </span>
    )
  return (
    <NavLink
      to={item.para}
      end={item.fim}
      className={({ isActive }) =>
        `relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? 'text-marca' : 'text-zinc-400'}`
      }
    >
      <Icone className="size-5" />
      {item.rotulo}
      {badge > 0 && (
        <span className="absolute top-1.5 left-1/2 ml-2">
          <Badge n={badge} />
        </span>
      )}
    </NavLink>
  )
}
