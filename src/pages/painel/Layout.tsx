import { Compass, FileSignature, LayoutGrid, LogOut, Receipt, Settings2, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { Carregando, Marca } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { modoDemo } from '../../lib/supabase'

interface Item {
  para: string
  rotulo: string
  icone: LucideIcon
  fim?: boolean
  emBreve?: boolean
}

const ITENS: Item[] = [
  { para: '/painel', rotulo: 'Visão geral', icone: LayoutGrid, fim: true },
  { para: '/painel/vendas', rotulo: 'Vendas', icone: Receipt },
  { para: '/painel/prospeccao', rotulo: 'Prospecção', icone: Compass },
  { para: '/painel/leads', rotulo: 'Leads', icone: Users },
  { para: '/painel/ajustes', rotulo: 'Ajustes', icone: Settings2 },
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[252px_1fr]">
      {/* Menu lateral (computador) */}
      <div className="hidden border-r border-borda bg-lateral lg:block">
        <aside className="sticky top-0 flex h-dvh flex-col px-5 py-7">
          <Marca />
          <Link to="/painel/formulario" className="prata chanfro mt-9 flex items-center justify-center gap-2 py-3 text-sm font-semibold">
            <FileSignature className="size-4" />
            Gerar formulário
          </Link>
          <nav className="mt-7 flex flex-col gap-0.5">
            <p className="rotulo mb-2 px-3">Menu</p>
            {ITENS.map((i) => (
              <ItemLateral key={i.para} item={i} badge={i.para === '/painel/vendas' ? pendentes : 0} />
            ))}
          </nav>
          <div className="mt-auto">
            {modoDemo && <p className="rotulo mb-3 px-1 text-alerta/80">Demonstração · nada é salvo</p>}
            <div className="flex items-center gap-3 border-t border-borda pt-4">
              <div className="chanfro chanfro-sm grid size-9 place-items-center bg-cartao-2 font-display text-sm font-bold text-prata">{inicial}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{perfil.nome}</div>
                <div className="rotulo mt-0.5 text-[10px]">{perfil.papel}</div>
              </div>
              <button type="button" onClick={() => void sair()} className="rounded-md p-2 text-apagado hover:bg-cartao hover:text-texto" title="Sair">
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-col">
        {/* Topo (celular) */}
        <header className="sticky top-0 z-20 border-b border-borda bg-fundo/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between">
            <Marca />
            <button
              type="button"
              onClick={() => void sair()}
              className="chanfro chanfro-sm grid size-9 place-items-center bg-cartao-2 font-display text-sm font-bold text-prata"
              title="Sair"
            >
              {inicial}
            </button>
          </div>
          {modoDemo && <p className="rotulo -mt-1 pb-2 text-[9.5px] text-alerta/80">Demonstração · nada é salvo</p>}
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-28 lg:px-10 lg:pt-10 lg:pb-12">
          <Outlet />
        </main>

        {/* Abas (celular) */}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-borda bg-lateral/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          {ITENS.map((i) => (
            <ItemAba key={i.para} item={i} badge={i.para === '/painel/vendas' ? pendentes : 0} />
          ))}
        </nav>
      </div>
    </div>
  )
}

function Contador({ n }: { n: number }) {
  if (!n) return null
  return <span className="prata chanfro chanfro-sm grid h-5 min-w-5 place-items-center px-1.5 font-mono text-[11px] font-semibold tabular-nums">{n}</span>
}

function ItemLateral({ item, badge }: { item: Item; badge: number }) {
  const Icone = item.icone
  if (item.emBreve)
    return (
      <span className="flex items-center gap-3 px-3 py-2.5 text-sm text-apagado/70">
        <Icone className="size-[17px]" />
        {item.rotulo}
        <span className="rotulo ml-auto text-[9px]">Em breve</span>
      </span>
    )
  return (
    <NavLink
      to={item.para}
      end={item.fim}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
          isActive ? 'bg-cartao font-semibold text-white' : 'text-suave hover:bg-cartao/60 hover:text-texto'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="prata absolute top-2 bottom-2 -left-5 w-1 -skew-y-[35deg]" />}
          <Icone className="size-[17px]" />
          {item.rotulo}
          <span className="ml-auto">
            <Contador n={badge} />
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
      <span className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-apagado/60">
        <Icone className="size-5" />
        {item.rotulo}
      </span>
    )
  return (
    <NavLink
      to={item.para}
      end={item.fim}
      className={({ isActive }) =>
        `relative flex flex-col items-center gap-1 py-2.5 text-[11px] ${isActive ? 'font-semibold text-white' : 'text-apagado'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="prata absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2" />}
          <Icone className="size-5" />
          {item.rotulo}
          {badge > 0 && (
            <span className="absolute top-1 left-1/2 ml-2.5">
              <Contador n={badge} />
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
