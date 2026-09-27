import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CalendarClock, Columns3, List, MessageCircle, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Carregando } from '../../components/ui'
import { api } from '../../lib/api'
import { ETAPAS, SEGMENTOS, TEMPERATURAS, rotulo, type Etapa, type Segmento, type Temperatura } from '../../lib/constantes'
import { linkWhatsapp } from '../../lib/formatos'
import type { LeadCompleto, Perfil } from '../../lib/tipos'
import LeadDetalhe from './LeadDetalhe'

const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

type Visao = 'kanban' | 'lista'

interface Filtros {
  busca: string
  temperatura: Temperatura | ''
  segmento: Segmento | ''
  etapa: Etapa | ''
  vendedor: string
}

function lerVisao(): Visao {
  try {
    return localStorage.getItem('leads-visao') === 'lista' ? 'lista' : 'kanban'
  } catch {
    return 'kanban'
  }
}

export default function Leads() {
  const [leads, setLeads] = useState<LeadCompleto[] | null>(null)
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [visao, setVisaoState] = useState<Visao>(lerVisao)
  const [f, setF] = useState<Filtros>({ busca: '', temperatura: '', segmento: '', etapa: '', vendedor: '' })
  const [aberto, setAberto] = useState<string | null>(null)

  const setVisao = (v: Visao) => {
    setVisaoState(v)
    try {
      localStorage.setItem('leads-visao', v)
    } catch {
      /* navegador sem storage: só não lembra a escolha */
    }
  }

  const carregar = useCallback(() => {
    api
      .listarLeads()
      .then(setLeads)
      .catch((e: Error) => setErro(e.message))
  }, [])

  useEffect(() => {
    carregar()
    api.listarPerfis().then(setPerfis).catch(() => {})
    const a = api.ouvirLeads(carregar)
    const b = api.ouvirVendas(carregar)
    return () => {
      a()
      b()
    }
  }, [carregar])

  const filtrados = useMemo(() => {
    const busca = f.busca.trim().toLowerCase()
    return (leads ?? []).filter(
      (l) =>
        (!busca || l.venda.nome.toLowerCase().includes(busca) || l.venda.instagram?.includes(busca)) &&
        (!f.temperatura || l.temperatura === f.temperatura) &&
        (!f.segmento || l.venda.segmento === f.segmento) &&
        (!f.etapa || l.etapa === f.etapa) &&
        (!f.vendedor || l.responsavel_id === f.vendedor),
    )
  }, [leads, f])

  async function mover(id: string, etapa: Etapa) {
    const antes = leads
    setLeads((ls) => ls?.map((l) => (l.id === id ? { ...l, etapa } : l)) ?? null) // otimista
    try {
      await api.atualizarLead(id, { etapa })
    } catch (e) {
      setLeads(antes)
      setErro((e as Error).message)
    }
  }

  const nomeVendedor = (id: string | null) => perfis.find((p) => p.id === id)?.nome ?? '—'
  const leadAberto = leads?.find((l) => l.id === aberto) ?? null
  const temFiltro = f.busca || f.temperatura || f.segmento || f.etapa || f.vendedor

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">Leads</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Pós-venda: de comprador da plaquinha a cliente de site.</p>
        </div>
        <div className="flex rounded-xl border border-borda bg-cartao p-1">
          {(
            [
              ['kanban', 'Kanban', Columns3],
              ['lista', 'Lista', List],
            ] as const
          ).map(([v, r, Icone]) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisao(v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                visao === v ? 'bg-cartao-2 text-white' : 'text-zinc-500'
              }`}
            >
              <Icone className="size-4" />
              {r}
            </button>
          ))}
        </div>
      </header>

      {/* Filtros */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        <label className="relative shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="busca-lead"
            value={f.busca}
            onChange={(e) => setF({ ...f, busca: e.target.value })}
            placeholder="Buscar nome ou @"
            className="h-10 w-48 rounded-xl border border-borda bg-cartao pr-3 pl-9 text-sm outline-none focus:border-marca"
          />
        </label>
        <div className="flex shrink-0 gap-1 rounded-xl border border-borda bg-cartao p-1">
          {TEMPERATURAS.map((t) => (
            <button
              key={t.valor}
              type="button"
              aria-pressed={f.temperatura === t.valor}
              onClick={() => setF({ ...f, temperatura: f.temperatura === t.valor ? '' : t.valor })}
              className={`rounded-lg px-2.5 py-1 text-sm font-medium whitespace-nowrap ${
                f.temperatura === t.valor ? t.classe : 'text-zinc-400'
              }`}
            >
              {t.emoji} {t.rotulo}
            </button>
          ))}
        </div>
        <Seletor id="filtro-segmento" valor={f.segmento} onChange={(v) => setF({ ...f, segmento: v as Segmento | '' })} vazio="Segmento">
          {SEGMENTOS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </Seletor>
        <Seletor id="filtro-etapa" valor={f.etapa} onChange={(v) => setF({ ...f, etapa: v as Etapa | '' })} vazio="Etapa">
          {ETAPAS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.rotulo}
            </option>
          ))}
        </Seletor>
        <Seletor id="filtro-vendedor" valor={f.vendedor} onChange={(v) => setF({ ...f, vendedor: v })} vazio="Vendedor">
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Seletor>
        {temFiltro && (
          <button
            type="button"
            onClick={() => setF({ busca: '', temperatura: '', segmento: '', etapa: '', vendedor: '' })}
            className="shrink-0 px-2 text-sm font-semibold text-marca"
          >
            Limpar
          </button>
        )}
      </div>

      {erro && <p className="text-sm text-red-400">Erro: {erro}</p>}
      {!leads && !erro && <Carregando />}

      {leads && leads.length === 0 && (
        <p className="py-16 text-center text-zinc-500">
          Nenhum lead ainda. Todo comprador com venda validada aparece aqui automaticamente.
        </p>
      )}

      {leads && leads.length > 0 && visao === 'kanban' && (
        <Kanban leads={filtrados} mover={mover} abrir={setAberto} nomeVendedor={nomeVendedor} />
      )}
      {leads && leads.length > 0 && visao === 'lista' && (
        <Lista leads={filtrados} abrir={setAberto} nomeVendedor={nomeVendedor} />
      )}

      {leadAberto && (
        <LeadDetalhe lead={leadAberto} perfis={perfis} fechar={() => setAberto(null)} aoSalvar={carregar} />
      )}
    </div>
  )
}

function Seletor({
  id,
  valor,
  onChange,
  vazio,
  children,
}: {
  id: string
  valor: string
  onChange: (v: string) => void
  vazio: string
  children: ReactNode
}) {
  return (
    <select
      id={id}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 shrink-0 rounded-xl border bg-cartao px-3 text-sm outline-none focus:border-marca ${
        valor ? 'border-marca/60 text-white' : 'border-borda text-zinc-400'
      }`}
    >
      <option value="">{vazio}: todos</option>
      {children}
    </select>
  )
}

/* ------------------------------------------------------------------ Kanban */

function Kanban({
  leads,
  mover,
  abrir,
  nomeVendedor,
}: {
  leads: LeadCompleto[]
  mover: (id: string, etapa: Etapa) => void
  abrir: (id: string) => void
  nomeVendedor: (id: string | null) => string
}) {
  const [arrastando, setArrastando] = useState<LeadCompleto | null>(null)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // no celular: segurar ~0,2s para arrastar (assim o dedo ainda rola a tela)
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function soltar(e: DragEndEvent) {
    setArrastando(null)
    const etapa = e.over?.id as Etapa | undefined
    const lead = leads.find((l) => l.id === e.active.id)
    if (lead && etapa && lead.etapa !== etapa) mover(lead.id, etapa)
  }

  return (
    <DndContext
      sensors={sensores}
      onDragStart={(e) => setArrastando(leads.find((l) => l.id === e.active.id) ?? null)}
      onDragEnd={soltar}
      onDragCancel={() => setArrastando(null)}
    >
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:snap-none lg:px-0">
        {ETAPAS.map((etapa) => (
          <Coluna
            key={etapa.valor}
            etapa={etapa}
            leads={leads.filter((l) => l.etapa === etapa.valor)}
            abrir={abrir}
            nomeVendedor={nomeVendedor}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {arrastando && <Card lead={arrastando} nomeVendedor={nomeVendedor} flutuando />}
      </DragOverlay>
    </DndContext>
  )
}

function Coluna({
  etapa,
  leads,
  abrir,
  nomeVendedor,
}: {
  etapa: (typeof ETAPAS)[number]
  leads: LeadCompleto[]
  abrir: (id: string) => void
  nomeVendedor: (id: string | null) => string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.valor })
  return (
    <section
      ref={setNodeRef}
      className={`flex w-[78vw] max-w-72 shrink-0 snap-start flex-col rounded-2xl border p-2.5 transition-colors sm:w-72 ${
        isOver ? 'border-marca/60 bg-marca/[0.06]' : 'border-borda bg-lateral'
      }`}
    >
      <header className="flex items-center gap-2 px-1.5 pt-1 pb-3">
        <span className="size-2 rounded-full" style={{ background: etapa.cor }} />
        <h2 className="flex-1 truncate text-sm font-bold">{etapa.rotulo}</h2>
        <span className="rounded-full bg-cartao-2 px-2 text-xs font-semibold text-zinc-400 tabular-nums">{leads.length}</span>
      </header>
      <div className="flex min-h-24 flex-col gap-2">
        {leads.map((l) => (
          <CardArrastavel key={l.id} lead={l} abrir={abrir} nomeVendedor={nomeVendedor} />
        ))}
        {leads.length === 0 && (
          <p className="rounded-xl border border-dashed border-borda px-3 py-6 text-center text-xs text-zinc-600">
            Arraste um lead para cá
          </p>
        )}
      </div>
    </section>
  )
}

function CardArrastavel({
  lead,
  abrir,
  nomeVendedor,
}: {
  lead: LeadCompleto
  abrir: (id: string) => void
  nomeVendedor: (id: string | null) => string
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: lead.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => abrir(lead.id)}
      className={`touch-manipulation ${isDragging ? 'opacity-30' : ''}`}
    >
      <Card lead={lead} nomeVendedor={nomeVendedor} />
    </div>
  )
}

function Card({
  lead,
  nomeVendedor,
  flutuando,
}: {
  lead: LeadCompleto
  nomeVendedor: (id: string | null) => string
  flutuando?: boolean
}) {
  const t = TEMPERATURAS.find((x) => x.valor === lead.temperatura)!
  return (
    <article
      className={`cursor-grab rounded-xl border border-borda bg-cartao p-3 select-none active:cursor-grabbing ${
        flutuando ? 'rotate-2 shadow-2xl shadow-black/60 ring-1 ring-marca/50' : 'hover:border-zinc-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="leading-snug font-semibold">{lead.venda.nome}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.classe}`}>
          {t.emoji} {t.rotulo}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-zinc-500">{rotulo(SEGMENTOS, lead.venda.segmento)}</p>
      {lead.data_reuniao && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sky-300">
          <CalendarClock className="size-3.5" />
          {dataCurta.format(new Date(lead.data_reuniao))}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500">{nomeVendedor(lead.responsavel_id)}</span>
        <a
          href={linkWhatsapp(lead.venda.whatsapp)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="grid size-7 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300"
          title="Abrir WhatsApp"
        >
          <MessageCircle className="size-4" />
        </a>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------- Lista */

function Lista({
  leads,
  abrir,
  nomeVendedor,
}: {
  leads: LeadCompleto[]
  abrir: (id: string) => void
  nomeVendedor: (id: string | null) => string
}) {
  if (leads.length === 0) return <p className="py-12 text-center text-zinc-500">Nenhum lead com esses filtros.</p>
  return (
    <div className="overflow-hidden rounded-2xl border border-borda bg-cartao">
      <div className="hidden grid-cols-[2fr_1fr_1.3fr_1fr_1fr_40px] gap-3 border-b border-borda px-4 py-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase lg:grid">
        <span>Cliente</span>
        <span>Temperatura</span>
        <span>Etapa</span>
        <span>Reunião</span>
        <span>Vendedor</span>
        <span />
      </div>
      <ul className="divide-y divide-borda">
        {leads.map((l) => {
          const t = TEMPERATURAS.find((x) => x.valor === l.temperatura)!
          const e = ETAPAS.find((x) => x.valor === l.etapa)!
          return (
            <li key={l.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => abrir(l.id)}
                onKeyDown={(ev) => ev.key === 'Enter' && abrir(l.id)}
                className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 hover:bg-cartao-2 lg:grid-cols-[2fr_1fr_1.3fr_1fr_1fr_40px]"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{l.venda.nome}</div>
                  <div className="truncate text-xs text-zinc-500">{rotulo(SEGMENTOS, l.venda.segmento)}</div>
                </div>
                <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${t.classe}`}>
                  {t.emoji} {t.rotulo}
                </span>
                <span className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: e.cor }} />
                  {e.rotulo}
                </span>
                <span className="text-sm text-zinc-400 tabular-nums">
                  {l.data_reuniao ? dataCurta.format(new Date(l.data_reuniao)) : <span className="hidden lg:inline">—</span>}
                </span>
                <span className="hidden text-sm text-zinc-400 lg:inline">{nomeVendedor(l.responsavel_id)}</span>
                <a
                  href={linkWhatsapp(l.venda.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(ev) => ev.stopPropagation()}
                  className="hidden size-8 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300 lg:grid"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle className="size-4" />
                </a>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
