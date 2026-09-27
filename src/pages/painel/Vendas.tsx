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
    <div className="flex flex-1 flex-col gap-4">
      {aviso && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {aviso}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <Botao onClick={() => navigate('/painel/vendas/nova')} className="py-2 text-sm">
          + Venda manual
        </Botao>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-cartao p-1">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            type="button"
            onClick={() => setAba(a.valor)}
            className={`rounded-lg py-2 text-sm font-medium ${aba === a.valor ? 'bg-borda text-white' : 'text-zinc-400'}`}
          >
            {a.rotulo}
            <span
              className={`ml-1.5 rounded-full px-1.5 text-xs ${
                a.valor === 'pendente' && contagem('pendente') > 0 ? 'bg-marca-2 text-white' : 'text-zinc-500'
              }`}
            >
              {contagem(a.valor)}
            </span>
          </button>
        ))}
      </div>

      {erro && <p className="text-sm text-red-400">Não foi possível carregar as vendas: {erro}</p>}
      {!vendas && !erro && <Carregando />}

      {vendas && lista.length === 0 && (
        <p className="py-12 text-center text-zinc-500">
          {aba === 'pendente' ? 'Nenhuma venda esperando validação. 🎉' : 'Nada por aqui ainda.'}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {lista.map((v) => (
          <li key={v.id}>
            <Link
              to={`/painel/vendas/${v.id}`}
              className="flex items-center gap-3 rounded-2xl border border-borda bg-cartao p-4 transition active:scale-[0.99]"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-borda text-lg font-semibold text-zinc-200">
                {v.nome.trim()[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{v.nome}</span>
                  {v.origem === 'manual' && <Selo cor="cinza">manual</Selo>}
                </div>
                <div className="mt-0.5 truncate text-sm text-zinc-400">
                  {rotulo(SEGMENTOS, v.segmento)} · {tempoAtras(v.created_at)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {v.status_venda === 'pendente' ? (
                  <Selo cor="amarelo">Validar →</Selo>
                ) : (
                  <>
                    <div className="font-semibold tabular-nums">{formatarMoeda(v.valor_total)}</div>
                    <div className="text-xs text-zinc-500">
                      {v.total_plaquinhas ?? 0} plaquinha{v.total_plaquinhas === 1 ? '' : 's'}
                      {v.status_pagamento === 'aguardando' && v.status_venda === 'validada' && (
                        <span className="text-amber-300"> · a receber</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
