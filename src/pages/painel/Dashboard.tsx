import { ArrowDownRight, ArrowRight, ArrowUpRight, FileSignature } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Carregando } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { PRECO_MANUTENCAO, PRECO_SITE } from '../../lib/constantes'
import { formatarMoeda } from '../../lib/formatos'
import { calcularMetricas, type Metricas } from '../../lib/metricas'

// Cores dos gráficos (validadas para o fundo escuro)
const VIOLETA = '#9085e9'
const AGUA = '#199e70'
const EIXO = '#6c697a'
const GRADE = '#23222b'

const moedaCurta = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const dataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' })

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

  if (erro) return <p className="text-perigo">Não foi possível carregar a visão geral: {erro}</p>
  if (!m) return <Carregando />

  const variacao = m.faturamentoMesAnteriorAteHoje
    ? ((m.faturamentoMes - m.faturamentoMesAnteriorAteHoje) / m.faturamentoMesAnteriorAteHoje) * 100
    : null
  const agora = new Date()
  const mes = nomeMes.format(agora)

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <header className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo">{dataLonga.format(agora)}</p>
          <h1 className="titulo mt-2 text-[32px] leading-none lg:text-[40px]">Olá, {perfil?.nome.split(' ')[0]}.</h1>
        </div>
        <Link to="/painel/formulario" className="prata chanfro flex items-center gap-2 px-4 py-2.5 text-sm font-semibold lg:hidden">
          <FileSignature className="size-4" /> Gerar formulário
        </Link>
      </header>

      {/* Faturamento do mês + hoje/pendentes */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <Bloco className="lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="rotulo">Faturamento de {mes}</p>
              <p className="titulo texto-prata mt-3 text-[44px] leading-none tabular-nums lg:text-[56px]">{formatarMoeda(m.faturamentoMes)}</p>
            </div>
            <div className="text-right text-sm">
              {variacao !== null && <Variacao pct={variacao} />}
              <p className="mt-1 text-xs text-apagado">
                vs. {formatarMoeda(m.faturamentoMesAnteriorAteHoje)} no mesmo período do mês passado
              </p>
            </div>
          </div>
          <GraficoDiario dados={m.porDia} />
        </Bloco>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5">
          <Bloco>
            <p className="rotulo">Hoje</p>
            <p className="titulo mt-3 text-[34px] leading-none tabular-nums">{formatarMoeda(m.faturamentoHoje)}</p>
            <p className="mt-2 text-sm text-suave">
              {m.vendasHoje} venda{m.vendasHoje === 1 ? '' : 's'} validada{m.vendasHoje === 1 ? '' : 's'}
            </p>
          </Bloco>
          <Link
            to="/painel/vendas"
            className={`group rounded-md border p-5 transition lg:p-6 ${
              m.pendentes ? 'border-alerta/30 bg-alerta/[0.04] hover:border-alerta/50' : 'border-borda bg-cartao hover:border-borda-2'
            }`}
          >
            <p className="rotulo">Aguardando validação</p>
            <div className="mt-3 flex items-end justify-between">
              <span className={`titulo text-[34px] leading-none tabular-nums ${m.pendentes ? 'text-alerta' : ''}`}>{m.pendentes}</span>
              <span className="flex items-center gap-1 text-sm font-medium text-suave group-hover:text-texto">
                {m.pendentes ? 'Conferir' : 'Tudo em dia'} <ArrowRight className="size-4" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-borda bg-borda lg:grid-cols-4">
        <Indicador rotulo="Vendas no mês" valor={String(m.vendasMes)} />
        <Indicador rotulo="Ticket médio" valor={formatarMoeda(m.ticketMedio)} />
        <Indicador rotulo="Plaquinhas vendidas" valor={String(m.plaquinhasTotal)} detalhe="desde o início" />
        <Indicador rotulo="A receber" valor={formatarMoeda(m.aReceber)} detalhe="validadas, aguardando pagamento" />
      </div>

      {/* Tipo, segmento, ranking */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <Bloco>
          <Cabecalho titulo="Unidade × kit" sub={`Vendas de ${mes}`} />
          <DivisaoTipo m={m} />
        </Bloco>

        <Bloco>
          <Cabecalho titulo="Por segmento" sub={`Faturamento de ${mes}`} />
          <ul className="mt-5 flex flex-col gap-4">
            {m.porSegmento.length === 0 && <Vazio />}
            {m.porSegmento.map((s) => (
              <li key={s.segmento} title={`${s.rotulo}: ${formatarMoeda(s.valor)} em ${s.vendas} vendas`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-suave">{s.rotulo}</span>
                  <span className="font-medium tabular-nums">{formatarMoeda(s.valor)}</span>
                </div>
                <Trilha pct={(s.valor / m.porSegmento[0].valor) * 100} />
              </li>
            ))}
          </ul>
        </Bloco>

        <Bloco>
          <Cabecalho titulo="Ranking de vendedores" sub={`Faturamento de ${mes}`} />
          <ol className="mt-5 flex flex-col gap-4">
            {m.ranking.length === 0 && <Vazio />}
            {m.ranking.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3.5">
                <span className={`titulo w-7 text-[22px] leading-none tabular-nums ${i === 0 ? 'texto-prata' : 'text-apagado'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">{r.nome}</span>
                    <span className="font-medium tabular-nums">{formatarMoeda(r.valor)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="flex-1">
                      <Trilha pct={(r.valor / m.ranking[0].valor) * 100} />
                    </div>
                    <span className="font-mono text-[11px] whitespace-nowrap text-apagado tabular-nums">{r.vendas} vendas</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Bloco>
      </div>

      {/* Pós-venda */}
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:gap-5">
        <PosVenda
          rotulo={`Sites vendidos em ${mes}`}
          valor={formatarMoeda(m.receitaSitesMes)}
          detalhe={`${m.sitesMes} site${m.sitesMes === 1 ? '' : 's'} × ${formatarMoeda(PRECO_SITE)}`}
        />
        <PosVenda
          rotulo="Manutenção recorrente"
          valor={formatarMoeda(m.mrr)}
          sufixo="/mês"
          detalhe={`${m.manutencaoAtivos} cliente${m.manutencaoAtivos === 1 ? '' : 's'} ativo${m.manutencaoAtivos === 1 ? '' : 's'} × ${formatarMoeda(PRECO_MANUTENCAO)}`}
        />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- peças */

function Bloco({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-md border border-borda bg-cartao p-5 lg:p-6 ${className}`}>{children}</section>
}

function Cabecalho({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold">{titulo}</h2>
      <p className="rotulo mt-1 text-[10px]">{sub}</p>
    </div>
  )
}

function Variacao({ pct }: { pct: number }) {
  const sobe = pct >= 0
  const Icone = sobe ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-sm font-semibold tabular-nums ${sobe ? 'text-ok' : 'text-perigo'}`}>
      <Icone className="size-4" />
      {sobe ? '+' : '−'}
      {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="bg-cartao p-5 lg:p-6">
      <p className="rotulo text-[10px]">{rotulo}</p>
      <p className="titulo mt-3 text-[26px] leading-none tabular-nums lg:text-[30px]">{valor}</p>
      <p className="mt-2 min-h-4 text-[11px] text-apagado">{detalhe}</p>
    </div>
  )
}

function Trilha({ pct }: { pct: number }) {
  return (
    <div className="mt-1.5 h-1 bg-cartao-2">
      <div className="prata h-full" style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  )
}

function GraficoDiario({ dados }: { dados: Metricas['porDia'] }) {
  return (
    <div className="-mx-2 mt-8 h-56 lg:h-64" role="img" aria-label="Faturamento por dia no mês atual">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="24%">
          <defs>
            <linearGradient id="barraPrata" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#c9c7d3" />
              <stop offset="100%" stopColor="#7a7590" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRADE} />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={{ stroke: GRADE }}
            tick={{ fill: EIXO, fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
            interval="preserveStartEnd"
            minTickGap={14}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={58}
            tick={{ fill: EIXO, fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
            tickFormatter={(v: number) => moedaCurta.format(v)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(233,231,240,0.05)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as Metricas['porDia'][number]
              if (d.futuro) return null
              return (
                <div className="rounded-md border border-borda-2 bg-cartao-2 px-3 py-2 shadow-xl">
                  <div className="rotulo text-[10px]">{d.rotulo}</div>
                  <div className="titulo mt-1 text-base text-white tabular-nums">{formatarMoeda(d.valor)}</div>
                  <div className="text-xs text-suave">
                    {d.vendas} venda{d.vendas === 1 ? '' : 's'}
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="valor" fill="url(#barraPrata)" radius={[3, 3, 0, 0]} maxBarSize={18} />
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
    { rotulo: 'Kit com 2', cor: VIOLETA, ...kit, pct: pctKit },
    { rotulo: 'Unidade', cor: AGUA, ...unidade, pct: total ? 100 - pctKit : 0 },
  ]
  return (
    <div className="mt-6">
      {total === 0 ? (
        <Vazio />
      ) : (
        <div className="flex h-2.5 gap-0.5">
          {itens.map((i) =>
            i.pct > 0 ? <div key={i.rotulo} title={`${i.rotulo}: ${i.vendas} vendas`} style={{ width: `${i.pct}%`, background: i.cor }} /> : null,
          )}
        </div>
      )}
      <ul className="mt-6 flex flex-col divide-y divide-borda">
        {itens.map((i) => (
          <li key={i.rotulo} className="flex items-center gap-3 py-3 first:pt-0">
            <span className="h-3 w-1.5 -skew-x-[20deg]" style={{ background: i.cor }} />
            <span className="flex-1 text-sm">{i.rotulo}</span>
            <span className="font-mono text-xs text-apagado tabular-nums">
              {i.vendas} · {i.pct.toFixed(0)}%
            </span>
            <span className="w-24 text-right text-sm font-medium tabular-nums">{formatarMoeda(i.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PosVenda({ rotulo, valor, sufixo, detalhe }: { rotulo: string; valor: string; sufixo?: string; detalhe: string }) {
  return (
    <section className="relative overflow-hidden rounded-md border border-borda bg-cartao p-5 lg:p-6">
      <span className="prata absolute top-0 left-0 h-full w-[3px]" />
      <p className="rotulo">Pós-venda · {rotulo}</p>
      <p className="titulo mt-3 text-[30px] leading-none tabular-nums">
        {valor}
        {sufixo && <span className="ml-1 text-base font-semibold text-suave">{sufixo}</span>}
      </p>
      <p className="mt-2 font-mono text-[11px] text-apagado">{detalhe}</p>
    </section>
  )
}

function Vazio() {
  return <p className="py-4 text-sm text-apagado">Sem vendas validadas neste mês.</p>
}
