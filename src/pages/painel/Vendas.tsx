import { ChevronRight, FileSignature, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Botao, Carregando, Selo } from '../../components/ui'
import { api } from '../../lib/api'
import { SEGMENTOS, rotulo } from '../../lib/constantes'
import { formatarMoeda, tempoAtras } from '../../lib/formatos'
import type { StatusVenda, Venda } from '../../lib/tipos'

const ABAS: { valor: StatusVenda; rotulo: string }[] = [
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'validada', rotulo: 'Validadas' },
  { valor: 'cancelada', rotulo: 'Canceladas' },
]

export default function Vendas() {
  const navigate = useNavigate()
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso
  const [vendas, setVendas] = useState<Venda[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aba, setAba] = useState<StatusVenda>('pendente')

  const carregar = useCallback(() => {
    api
      .listarVendas()
      .then((v) => {
        setVendas(v)
        setErro(null)
      })
      .catch((e: Error) => setErro(e.message))
  }, [])

  useEffect(() => {
    carregar()
    return api.ouvirVendas(carregar) // atualiza sozinho quando cai venda nova
  }, [carregar])

  const contagem = (s: StatusVenda) => vendas?.filter((v) => v.status_venda === s).length ?? 0
  const lista = vendas?.filter((v) => v.status_venda === aba) ?? []

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo">Plaquinhas NFC</p>
          <h1 className="titulo mt-2 text-[32px] leading-none lg:text-[40px]">Vendas</h1>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Botao variante="secundario" onClick={() => navigate('/painel/vendas/nova')} className="flex-1 sm:flex-none">
            <Plus className="size-4" /> Venda manual
          </Botao>
          <Botao onClick={() => navigate('/painel/formulario')} className="flex-[1.4] sm:flex-none">
            <FileSignature className="size-4" /> Gerar formulário
          </Botao>
        </div>
      </header>

      {aviso && (
        <div className="animar-entrada flex items-center gap-3 rounded-md border border-ok/30 bg-ok/[0.06] px-4 py-3 text-sm text-ok">
          <span className="h-3 w-1.5 -skew-x-[20deg] bg-ok" />
          {aviso}
        </div>
      )}

      <nav className="flex gap-6 border-b border-borda">
        {ABAS.map((a) => {
          const ativo = aba === a.valor
          const n = contagem(a.valor)
          return (
            <button
              key={a.valor}
              type="button"
              onClick={() => setAba(a.valor)}
              className={`relative -mb-px flex items-center gap-2 pb-3 text-sm transition ${
                ativo ? 'font-semibold text-white' : 'text-apagado hover:text-suave'
              }`}
            >
              {a.rotulo}
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  a.valor === 'pendente' && n > 0 ? 'prata chanfro chanfro-sm px-1.5 py-px font-semibold' : ''
                }`}
              >
                {n}
              </span>
              {ativo && <span className="prata absolute right-0 bottom-0 left-0 h-0.5" />}
            </button>
          )
        })}
      </nav>

      {erro && <p className="text-sm text-perigo">Não foi possível carregar as vendas: {erro}</p>}
      {!vendas && !erro && <Carregando />}

      {vendas && lista.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-suave">{aba === 'pendente' ? 'Nenhuma venda esperando validação.' : 'Nada por aqui ainda.'}</p>
          {aba === 'pendente' && (
            <p className="mt-1 text-sm text-apagado">Gere um formulário e entregue o celular ao cliente.</p>
          )}
        </div>
      )}

      {lista.length > 0 && (
        <ul className="divide-y divide-borda overflow-hidden rounded-md border border-borda bg-cartao">
          {lista.map((v) => (
            <li key={v.id}>
              <Link to={`/painel/vendas/${v.id}`} className="group flex items-center gap-4 px-4 py-4 transition hover:bg-cartao-2 lg:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{v.nome}</span>
                    {v.origem === 'manual' && <Selo cor="neutro">Manual</Selo>}
                  </div>
                  <div className="mt-1 truncate text-xs text-apagado">
                    {rotulo(SEGMENTOS, v.segmento)} · {tempoAtras(v.created_at)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {v.status_venda === 'pendente' ? (
                    <Selo cor="alerta">Conferir</Selo>
                  ) : (
                    <>
                      <div className="font-display text-[17px] font-bold tabular-nums" style={{ fontStretch: '88%' }}>
                        {formatarMoeda(v.valor_total)}
                      </div>
                      <div className="font-mono text-[11px] text-apagado">
                        {v.total_plaquinhas ?? 0} plaq.
                        {v.status_pagamento === 'aguardando' && v.status_venda === 'validada' && <span className="text-alerta"> · a receber</span>}
                      </div>
                    </>
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-apagado transition group-hover:translate-x-0.5 group-hover:text-suave" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
