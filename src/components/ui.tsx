import type { ButtonHTMLAttributes, ReactNode } from 'react'

export const classeCampo =
  'w-full rounded-xl border border-borda bg-cartao px-4 py-3 text-base text-white placeholder:text-zinc-500 outline-none focus:border-marca focus:ring-2 focus:ring-marca/30'

export function Botao({
  variante = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'perigo' | 'fantasma' }) {
  const estilos = {
    primario: 'bg-gradient-to-r from-marca to-marca-2 text-white shadow-lg shadow-marca/20',
    secundario: 'border border-borda bg-cartao text-zinc-100',
    perigo: 'border border-red-500/40 bg-red-500/10 text-red-300',
    fantasma: 'text-zinc-400',
  }[variante]
  return (
    <button
      type="button"
      className={`rounded-xl px-4 py-3 font-semibold transition active:scale-[0.98] disabled:opacity-50 ${estilos} ${className}`}
      {...props}
    />
  )
}

/** Grupo de opções em "pílulas" — um toque escolhe. */
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
    <div className={`grid gap-2 ${grid}`}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={o.valor === valor}
          onClick={() => onChange(o.valor)}
          className={`rounded-xl border px-3 py-3 text-sm font-medium transition active:scale-[0.97] ${
            o.valor === valor
              ? 'border-marca bg-marca/15 text-white'
              : 'border-borda bg-cartao text-zinc-300'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export function Rotulo({ children, erro }: { children: ReactNode; erro?: string | false }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <span className="text-sm font-medium text-zinc-300">{children}</span>
      {erro && <span className="text-xs text-red-400">{erro}</span>}
    </div>
  )
}

export function Selo({ cor, children }: { cor: 'amarelo' | 'verde' | 'vermelho' | 'cinza'; children: ReactNode }) {
  const c = {
    amarelo: 'bg-amber-400/15 text-amber-300',
    verde: 'bg-emerald-400/15 text-emerald-300',
    vermelho: 'bg-red-400/15 text-red-300',
    cinza: 'bg-zinc-400/15 text-zinc-300',
  }[cor]
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>{children}</span>
}

export function Carregando() {
  return (
    <div className="grid flex-1 place-items-center py-20">
      <div className="size-8 animate-spin rounded-full border-2 border-borda border-t-marca" />
    </div>
  )
}
