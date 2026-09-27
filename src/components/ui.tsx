import type { ButtonHTMLAttributes, ReactNode } from 'react'
import logo from '../assets/logo.svg'

export const classeCampo =
  'w-full rounded-md border border-borda bg-cartao px-3.5 py-3 text-[15px] text-texto placeholder:text-apagado outline-none transition focus:border-prata-2 focus:bg-cartao-2'

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma'

export function Botao({
  variante = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  const estilos: Record<Variante, string> = {
    primario: 'prata chanfro font-semibold hover:brightness-105',
    secundario: 'rounded-md border border-borda-2 bg-cartao text-texto hover:border-grafite',
    perigo: 'rounded-md border border-perigo/40 text-perigo hover:bg-perigo/10',
    fantasma: 'rounded-md text-suave hover:text-texto',
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition active:translate-y-px disabled:opacity-50 ${estilos[variante]} ${className}`}
      {...props}
    />
  )
}

/** Grupo de opções — um toque escolhe. */
export function Chips<T extends string>({
  opcoes,
  valor,
  onChange,
  colunas = 2,
}: {
  opcoes: readonly { valor: T; rotulo: ReactNode }[]
  valor: T | null
  onChange: (v: T) => void
  colunas?: 2 | 3 | 4
}) {
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[colunas]
  return (
    <div className={`grid gap-1.5 ${grid}`}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(o.valor)}
            className={`relative rounded-md border px-3 py-2.5 text-sm transition ${
              ativo
                ? 'border-prata-2 bg-prata/[0.07] font-semibold text-white'
                : 'border-borda bg-cartao text-suave hover:border-borda-2 hover:text-texto'
            }`}
          >
            {ativo && <span className="chanfro chanfro-sm prata absolute top-0 left-0 size-2.5" />}
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}

export function RotuloCampo({ children, erro }: { children: ReactNode; erro?: string | false }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[13px] font-medium text-suave">{children}</span>
      {erro && <span className="text-xs text-perigo">{erro}</span>}
    </div>
  )
}

type CorSelo = 'alerta' | 'ok' | 'perigo' | 'neutro'

export function Selo({ cor, children }: { cor: CorSelo; children: ReactNode }) {
  const c: Record<CorSelo, string> = {
    alerta: 'border-alerta/35 text-alerta',
    ok: 'border-ok/35 text-ok',
    perigo: 'border-perigo/35 text-perigo',
    neutro: 'border-borda-2 text-suave',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10.5px] font-medium tracking-wider uppercase ${c[cor]}`}>
      {children}
    </span>
  )
}

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-borda bg-cartao ${className}`}>{children}</div>
}

export function Carregando() {
  return (
    <div className="grid flex-1 place-items-center py-24">
      <Barras nivel={3} cor="#bdbac9" className="h-5 animate-pulse" />
    </div>
  )
}

/** As três barras inclinadas da logo, usadas como medidor (1 a 3). */
export function Barras({ nivel, cor, className = 'h-3' }: { nivel: 0 | 1 | 2 | 3; cor: string; className?: string }) {
  return (
    <svg viewBox="0 0 30 16" className={className} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${i * 10 + 3} 0H${i * 10 + 9}V13L${i * 10 + 6} 16H${i * 10 + 1}V3Z`}
          fill={i < nivel ? cor : 'currentColor'}
          opacity={i < nivel ? 1 : 0.18}
        />
      ))}
    </svg>
  )
}

export const TEMP_VISUAL = {
  quente: { nivel: 3, cor: '#e66767', rotulo: 'Quente' },
  morno: { nivel: 2, cor: '#e0b25c', rotulo: 'Morno' },
  frio: { nivel: 1, cor: '#7fa8d9', rotulo: 'Frio' },
} as const

export function Temperatura({ valor, compacto }: { valor: keyof typeof TEMP_VISUAL; compacto?: boolean }) {
  const t = TEMP_VISUAL[valor]
  return (
    <span className="inline-flex items-center gap-1.5 text-apagado" title={`Temperatura: ${t.rotulo}`}>
      <Barras nivel={t.nivel} cor={t.cor} className="h-3" />
      {!compacto && (
        <span className="font-mono text-[10.5px] font-medium tracking-wider uppercase" style={{ color: t.cor }}>
          {t.rotulo}
        </span>
      )}
    </span>
  )
}

/** Marcador de etapa: um paralelogramo, como as barras da logo. */
export function MarcaEtapa({ cor }: { cor: string }) {
  return <span className="inline-block h-3 w-1.5 shrink-0 -skew-x-[20deg] rounded-[1px]" style={{ background: cor }} />
}

export function Marca({ subtitulo = 'Placas NFC' }: { subtitulo?: string }) {
  return (
    <div className="flex items-center gap-3">
      <img src={logo} alt="Marquez" className="h-[22px] w-auto" />
      <div className="leading-none">
        <div className="titulo texto-prata text-[17px] tracking-[0.06em] uppercase" style={{ fontStretch: '112%' }}>
          Marquez
        </div>
        <div className="rotulo mt-1 text-[9.5px]">{subtitulo}</div>
      </div>
    </div>
  )
}
