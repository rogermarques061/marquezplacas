import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  Globe,
  Nfc,
  Receipt,
  RefreshCw,
  Ticket,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Carregando } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { PRECO_MANUTENCAO, PRECO_SITE } from '../../lib/constantes'
import { formatarMoeda } from '../../lib/formatos'
import { calcularMetricas, type Metricas } from '../../lib/metricas'

// Cores dos gráficos (validadas para fundo escuro)
const AZUL = '#3987e5'
const VERDE = '#199e70'
const TEXTO_EIXO = '#8a90a0'
const GRADE = '#242a37'

const moedaCurta = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const dataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

export default function Dashboard() {
  const { perfil } = useAuth()
  const [m, setM] = useState<Metricas | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const carregar = () =>
      Promise.all([api.listarVendas(), api.listarLeads(), api.listarPerfis()])
        .then(([v, l, p]) => setM(calcularMetricas(v, l, p)))
        .catch((e: Error) => setErro(e.message))
    carregar()
    const a = api.ouvirVendas(() => void carregar())
    const b = api.ouvirLeads(() => void carregar())
    return () => {
      a()
      b()
    }
  }, [])

  if (erro) return <p className="text-red-400">Não foi possível carregar o dashboard: {erro}</p>
  if (!m) return <Carregando />

  const variacao = m.faturamentoMesAnteriorAteHoje
    ? ((m.faturamentoMes - m.faturamentoMesAnteriorAteHoje) / m.faturamentoMesAnteriorAteHoje) * 100
    : null
  const agora = new Date()

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500 first-letter:uppercase">{dataLonga.format(agora)}</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight lg:text-3xl">Olá, {perfil?.nome.split(' ')[0]} 👋</h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl border border-borda bg-cartao px-3 py-2 text-sm font-medium text-zinc-300">
          <CalendarDays className="size-4 text-zinc-500" />
          <span className="first-letter:uppercase">{nomeMes.format(agora)}</span>
        </span>
      </header>

      {/* Linha 1: faturamento do mês + hoje/pendentes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Titulo icone={Wallet}>Faturamento do mês</Titulo>
              <div className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums lg:text-[44px]">
                {formatarMoeda(m.faturamentoMes)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                {variacao !== null && <Variacao pct={variacao} />}
                <span>vs. mesmo período do mês passado ({formatarMoeda(m.faturamentoMesAnteriorAteHoje)})</span>
              </div>
            </div>
          </div>
          <GraficoDiario dados={m.porDia} />
        </Cartao>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Cartao>
            <Titulo icone={Receipt}>Hoje</Titulo>
            <div className="mt-3 text-3xl font-extrabold tabular-nums">{formatarMoeda(m.faturamentoHoje)}</div>
            <p className="mt-1 text-sm text-zinc-400">
              {m.vendasHoje} venda{m.vendasHoje === 1 ? '' : 's'} validada{m.vendasHoje === 1 ? '' : 's'}
            </p>
          </Cartao>
          <Link
            to="/painel/vendas"
            className={`rounded-2xl border p-5 transition hover:brightness-110 ${
              m.pendentes ? 'border-amber-400/30 bg-amber-400/[0.07]' : 'border-borda bg-cartao'
            }`}
          >
            <Titulo icone={Clock}>Pendentes de validação</Titulo>
            <div className="mt-3 flex items-end justify-between">
              <span className={`text-3xl font-extrabold tabular-nums ${m.pendentes ? 'text-amber-300' : ''}`}>{m.pendentes}</span>
              <span className="text-sm font-semibold text-marca">{m.pendentes ? 'Validar agora →' : 'Tudo em dia ✓'}</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Linha 2: indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador icone={Receipt} rotulo="Vendas no mês" valor={String(m.vendasMes)} />
        <Indicador icone={Ticket} rotulo="Ticket médio" valor={formatarMoeda(m.ticketMedio)} />
        <Indicador icone={Nfc} rotulo="Plaquinhas vendidas" valor={String(m.plaquinhasTotal)} detalhe="desde o início" />
        <Indicador icone={Clock} rotulo="A receber" valor={formatarMoeda(m.aReceber)} detalhe="validadas aguardando pgto." />
      </div>

      {/* Linha 3: tipo, segmento, ranking */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao>
          <Titulo>Unidade × Kit</Titulo>
          <p className="mt-1 text-xs text-zinc-500">Vendas do mês por tipo</p>
          <DivisaoTipo m={m} />
        </Cartao>

        <Cartao>
          <Titulo>Vendas por segmento</Titulo>
          <p className="mt-1 text-xs text-zinc-500">Faturamento do mês</p>
          <ul className="mt-5 flex flex-col gap-3.5">
            {m.porSegmento.length === 0 && <Vazio />}
            {m.porSegmento.map((s) => (
              <Barra key={s.segmento} rotulo={s.rotulo} valor={s.valor} max={m.porSegmento[0].valor} extra={`${s.vendas}`} />
            ))}
          </ul>
        </Cartao>

        <Cartao>
          <Titulo icone={Trophy}>Ranking do mês</Titulo>
          <p className="mt-1 text-xs text-zinc-500">Vendedores por faturamento</p>
          <ol className="mt-5 flex flex-col gap-3">
            {m.ranking.length === 0 && <Vazio />}
            {m.ranking.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    i === 0 ? 'bg-amber-300/15 text-amber-300' : 'bg-cartao-2 text-zinc-400'
                  }`}
                >
                  {i + 1}º
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{r.nome}</span>
                    <span className="text-sm font-semibold tabular-nums">{formatarMoeda(r.valor)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cartao-2">
                      <div className="h-full rounded-full" style={{ width: `${(r.valor / m.ranking[0].valor) * 100}%`, background: AZUL }} />
                    </div>
                    <span className="text-right text-xs whitespace-nowrap text-zinc-500 tabular-nums">{r.vendas} venda{r.vendas === 1 ? '' : 's'}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Cartao>
      </div>

      {/* Linha 4: pós-venda */}
      <section>
        <h2 className="mb-3 text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">Receita do pós-venda</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <PosVenda
            icone={Globe}
            titulo="Sites vendidos no mês"
            principal={formatarMoeda(m.receitaSitesMes)}
            secundario={`${m.sitesMes} site${m.sitesMes === 1 ? '' : 's'} × ${formatarMoeda(PRECO_SITE)}`}
          />
          <PosVenda
            icone={RefreshCw}
            titulo="Manutenção recorrente (MRR)"
            principal={`${formatarMoeda(m.mrr)}/mês`}
            secundario={`${m.manutencaoAtivos} cliente${m.manutencaoAtivos === 1 ? '' : 's'} ativo${m.manutencaoAtivos === 1 ? '' : 's'} × ${formatarMoeda(PRECO_MANUTENCAO)}`}
          />
        </div>
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------- peças */

function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-borda bg-cartao p-5 ${className}`}>{children}</div>
}

function Titulo({ icone: Icone, children }: { icone?: LucideIcon; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
      {Icone && <Icone className="size-4 text-zinc-500" />}
      {children}
    </h3>
  )
}

function Variacao({ pct }: { pct: number }) {
  const sobe = pct >= 0
  const Icone = sobe ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
        sobe ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300'
      }`}
    >
      <Icone className="size-3.5" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

function Indicador({ icone: Icone, rotulo, valor, detalhe }: { icone: LucideIcon; rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-2xl border border-borda bg-cartao p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 lg:text-sm">{rotulo}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-marca/12 text-marca">
          <Icone className="size-4" />
        </span>
      </div>
      <div className="mt-3 text-xl font-extrabold tracking-tight tabular-nums lg:text-2xl">{valor}</div>
      {detalhe && <div className="mt-0.5 text-[11px] text-zinc-500">{detalhe}</div>}
    </div>
  )
}

function GraficoDiario({ dados }: { dados: Metricas['porDia'] }) {
  return (
    <div className="-mx-2 mt-6 h-56 lg:h-64" role="img" aria-label="Faturamento por dia no mês atual">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={GRADE} />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            tick={{ fill: TEXTO_EIXO, fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: TEXTO_EIXO, fontSize: 11 }}
            tickFormatter={(v: number) => moedaCurta.format(v)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as Metricas['porDia'][number]
              if (d.futuro) return null
              return (
                <div className="rounded-xl border border-borda bg-cartao-2 px-3 py-2 text-xs shadow-xl">
                  <div className="text-zinc-400">{d.rotulo}</div>
                  <div className="mt-0.5 text-sm font-bold text-white tabular-nums">{formatarMoeda(d.valor)}</div>
                  <div className="text-zinc-400">
                    {d.vendas} venda{d.vendas === 1 ? '' : 's'}
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="valor" fill={AZUL} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function DivisaoTipo({ m }: { m: Metricas }) {
  const { unidade, kit } = m.porTipo
  const total = unidade.vendas + kit.vendas
  const pctKit = total ? (kit.vendas / total) * 100 : 0
  const itens = [
    { rotulo: 'Kit com 2', cor: AZUL, ...kit, pct: pctKit },
    { rotulo: 'Unidade', cor: VERDE, ...unidade, pct: total ? 100 - pctKit : 0 },
  ]
  return (
    <div className="mt-5">
      {total === 0 ? (
        <Vazio />
      ) : (
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {itens.map((i) =>
            i.pct > 0 ? (
              <div key={i.rotulo} title={`${i.rotulo}: ${i.vendas} vendas`} style={{ width: `${i.pct}%`, background: i.cor }} />
            ) : null,
          )}
        </div>
      )}
      <ul className="mt-5 flex flex-col gap-3">
        {itens.map((i) => (
          <li key={i.rotulo} className="flex items-center gap-3">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: i.cor }} />
            <span className="flex-1 text-sm text-zinc-300">{i.rotulo}</span>
            <span className="text-sm text-zinc-500 tabular-nums">
              {i.vendas} · {i.pct.toFixed(0)}%
            </span>
            <span className="w-24 text-right text-sm font-semibold tabular-nums">{formatarMoeda(i.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Barra({ rotulo, valor, max, extra }: { rotulo: string; valor: number; max: number; extra: string }) {
  return (
    <li title={`${rotulo}: ${formatarMoeda(valor)} em ${extra} vendas`}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate text-zinc-300">{rotulo}</span>
        <span className="font-semibold tabular-nums">{formatarMoeda(valor)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cartao-2">
        <div className="h-full rounded-full" style={{ width: `${max ? (valor / max) * 100 : 0}%`, background: AZUL }} />
      </div>
    </li>
  )
}

function PosVenda({ icone: Icone, titulo, principal, secundario }: { icone: LucideIcon; titulo: string; principal: string; secundario: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-borda bg-cartao p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
        <Icone className="size-6" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-400">{titulo}</div>
        <div className="mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums">{principal}</div>
        <div className="text-xs text-zinc-500">{secundario}</div>
      </div>
    </div>
  )
}

function Vazio() {
  return <p className="py-4 text-sm text-zinc-500">Sem vendas validadas neste mês.</p>
}
