import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Botao, Carregando, Chips, Rotulo, Selo, classeCampo } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import {
  FORMAS_PAGAMENTO,
  OPCOES_COMO_ENCONTRAM,
  OPCOES_TEM_SITE,
  SEGMENTOS,
  STATUS_PAGAMENTO,
  TIPOS_VENDA,
  plaquinhasTipo,
  precoTipo,
  rotulo,
} from '../../lib/constantes'
import { formatarDataHora, formatarMoeda, formatarWhatsapp, linkWhatsapp } from '../../lib/formatos'
import { mascaraInstagram, mascaraWhatsapp, soDigitos, whatsappValido } from '../../lib/mascaras'
import type { Perfil, StatusVenda, Venda, VendaEditavel } from '../../lib/tipos'

type Form = Required<
  Pick<
    VendaEditavel,
    | 'nome'
    | 'whatsapp'
    | 'instagram'
    | 'segmento'
    | 'tem_site'
    | 'como_encontram'
    | 'tipo_venda'
    | 'quantidade'
    | 'forma_pagamento'
    | 'status_pagamento'
    | 'vendedor_id'
    | 'observacoes'
  >
>

function paraForm(v: Venda | null, vendedorPadrao: string): Form {
  return {
    nome: v?.nome ?? '',
    whatsapp: v ? formatarWhatsapp(v.whatsapp) : '',
    instagram: v?.instagram ? `@${v.instagram}` : '',
    segmento: v?.segmento ?? null,
    tem_site: v?.tem_site ?? null,
    como_encontram: v?.como_encontram ?? null,
    tipo_venda: v?.tipo_venda ?? 'unidade',
    quantidade: v?.quantidade ?? 1,
    forma_pagamento: v?.forma_pagamento ?? null,
    status_pagamento: v?.status_pagamento ?? 'pago',
    vendedor_id: v?.vendedor_id ?? vendedorPadrao,
    observacoes: v?.observacoes ?? '',
  }
}

/** "130" / "130,5" / "1.300,00" → número */
function lerValor(txt: string) {
  const n = Number(txt.replace(/[^\d,]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

function textoValor(n: number) {
  return n.toFixed(2).replace('.', ',')
}

export default function VendaEditor() {
  const { id } = useParams()
  const nova = !id
  const navigate = useNavigate()
  const { perfil } = useAuth()

  const [venda, setVenda] = useState<Venda | null>(null)
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [f, setF] = useState<Form | null>(() => (nova ? paraForm(null, perfil?.id ?? '') : null))
  const [valorTexto, setValorTexto] = useState(() => (nova ? textoValor(precoTipo('unidade')) : ''))
  const [valorManual, setValorManual] = useState(false)
  const [editarComprador, setEditarComprador] = useState(nova)
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)
  const [naoEncontrada, setNaoEncontrada] = useState(false)

  useEffect(() => {
    api.listarPerfis().then(setPerfis).catch(() => setPerfis([]))
    if (nova) return
    api.obterVenda(id).then((v) => {
      if (!v) return setNaoEncontrada(true)
      setVenda(v)
      const inicial = paraForm(v, perfil?.id ?? '')
      setF(inicial)
      const calculado = precoTipo(inicial.tipo_venda) * (inicial.quantidade ?? 1)
      setValorTexto(textoValor(v.valor_total ?? calculado))
      setValorManual(v.valor_total != null && v.valor_total !== calculado)
    })
  }, [id, nova]) // eslint-disable-line react-hooks/exhaustive-deps

  if (naoEncontrada) return <p className="py-12 text-center text-zinc-400">Venda não encontrada.</p>
  if (!f) return <Carregando />

  const valorCalculado = precoTipo(f.tipo_venda) * (f.quantidade ?? 0)
  const valor = lerValor(valorTexto)
  const plaquinhas = plaquinhasTipo(f.tipo_venda, f.quantidade)
  const status: StatusVenda = venda?.status_venda ?? 'pendente'

  function mudar(parcial: Partial<Form>) {
    const novo = { ...f!, ...parcial }
    setF(novo)
    if (!valorManual && ('tipo_venda' in parcial || 'quantidade' in parcial)) {
      setValorTexto(textoValor(precoTipo(novo.tipo_venda) * (novo.quantidade ?? 0)))
    }
  }

  const erros = {
    nome: f.nome.trim().length < 2 && 'Obrigatório',
    whatsapp: !whatsappValido(f.whatsapp) && 'WhatsApp inválido',
    valor: !(valor >= 0) && 'Valor inválido',
    forma_pagamento: !f.forma_pagamento && 'Escolha uma',
    vendedor_id: !f.vendedor_id && 'Escolha um',
  }
  const temErro = Object.values(erros).some(Boolean)

  function dadosParaSalvar(): VendaEditavel & { nome: string; whatsapp: string } {
    return {
      ...f!,
      nome: f!.nome.trim(),
      whatsapp: soDigitos(f!.whatsapp),
      instagram: f!.instagram?.replace(/^@/, '') || null,
      observacoes: f!.observacoes?.trim() || null,
      valor_total: valor,
    }
  }

  async function salvar(novoStatus: StatusVenda, aviso: string) {
    const soStatus = novoStatus !== 'validada' // cancelar/reabrir só muda o status
    if (!soStatus) {
      setTentou(true)
      if (temErro) {
        if (erros.nome || erros.whatsapp) setEditarComprador(true)
        setErro('Confira os campos destacados.')
        return
      }
    }
    setSalvando(true)
    setErro(null)
    try {
      const dados = soStatus ? {} : dadosParaSalvar()
      if (venda) await api.atualizarVenda(venda.id, { ...dados, status_venda: novoStatus })
      else await api.criarVenda({ ...dadosParaSalvar(), status_venda: novoStatus })
      navigate('/painel', { state: { aviso } })
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  const mostrarErro = (e: string | false) => tentou && e

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => navigate('/painel')} className="-ml-2 rounded-lg px-2 py-1 text-zinc-400">
          ←
        </button>
        <h1 className="flex-1 text-xl font-bold">{nova ? 'Nova venda manual' : 'Conferir venda'}</h1>
        {!nova && (
          <Selo cor={status === 'pendente' ? 'amarelo' : status === 'validada' ? 'verde' : 'vermelho'}>
            {status === 'pendente' ? 'Pendente' : status === 'validada' ? 'Validada' : 'Cancelada'}
          </Selo>
        )}
      </div>

      {/* ---------- Comprador ---------- */}
      <Secao
        titulo="Comprador"
        extra={
          !nova && (
            <button type="button" onClick={() => setEditarComprador((x) => !x)} className="text-sm text-marca">
              {editarComprador ? 'Fechar' : 'Corrigir dados'}
            </button>
          )
        }
      >
        {!editarComprador && venda ? (
          <div className="space-y-3">
            <div>
              <div className="text-lg font-semibold">{f.nome}</div>
              <div className="text-sm text-zinc-400">
                {formatarWhatsapp(soDigitos(f.whatsapp))}
                {f.instagram && ` · ${f.instagram}`}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <Info rotulo="Segmento">{rotulo(SEGMENTOS, f.segmento)}</Info>
              <Info rotulo="Tem site?">{rotulo(OPCOES_TEM_SITE, f.tem_site)}</Info>
              <Info rotulo="Como encontram">{rotulo(OPCOES_COMO_ENCONTRAM, f.como_encontram)}</Info>
              <Info rotulo={venda.origem === 'manual' ? 'Cadastrada em' : 'Formulário em'}>
                {formatarDataHora(venda.created_at)}
              </Info>
            </dl>
            <a
              href={linkWhatsapp(soDigitos(f.whatsapp), `Oi, ${f.nome.split(' ')[0]}! Aqui é da Marquez Digital 👋`)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-300"
            >
              Abrir conversa no WhatsApp
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <Rotulo erro={mostrarErro(erros.nome)}>Nome</Rotulo>
              <input id="nome" className={classeCampo} value={f.nome} onChange={(e) => mudar({ nome: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Rotulo erro={mostrarErro(erros.whatsapp)}>WhatsApp</Rotulo>
                <input
                  id="whatsapp"
                  className={classeCampo}
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 98765-4321"
                  value={f.whatsapp}
                  onChange={(e) => mudar({ whatsapp: mascaraWhatsapp(e.target.value) })}
                />
              </label>
              <label className="block">
                <Rotulo>Instagram</Rotulo>
                <input
                  id="instagram"
                  className={classeCampo}
                  autoCapitalize="none"
                  placeholder="@negocio"
                  value={f.instagram ?? ''}
                  onChange={(e) => mudar({ instagram: mascaraInstagram(e.target.value) })}
                />
              </label>
            </div>
            <div>
              <Rotulo>Segmento</Rotulo>
              <Chips
                colunas={3}
                opcoes={SEGMENTOS.map((s) => ({ valor: s.valor, rotulo: s.rotulo }))}
                valor={f.segmento}
                onChange={(v) => mudar({ segmento: v })}
              />
            </div>
            <div>
              <Rotulo>Já tem site?</Rotulo>
              <Chips
                colunas={3}
                opcoes={OPCOES_TEM_SITE.map((s) => ({ valor: s.valor, rotulo: s.rotulo }))}
                valor={f.tem_site}
                onChange={(v) => mudar({ tem_site: v })}
              />
            </div>
            <div>
              <Rotulo>Como os clientes encontram</Rotulo>
              <Chips
                colunas={3}
                opcoes={OPCOES_COMO_ENCONTRAM.map((s) => ({ valor: s.valor, rotulo: s.rotulo }))}
                valor={f.como_encontram}
                onChange={(v) => mudar({ como_encontram: v })}
              />
            </div>
          </div>
        )}
      </Secao>

      {/* ---------- Venda ---------- */}
      <Secao titulo="Venda">
        <div className="space-y-5">
          <div>
            <Rotulo>Tipo de venda</Rotulo>
            <Chips
              opcoes={TIPOS_VENDA.map((t) => ({
                valor: t.valor,
                rotulo: (
                  <span className="flex flex-col">
                    <span>{t.rotulo}</span>
                    <span className="text-xs text-zinc-400">{formatarMoeda(t.preco)}</span>
                  </span>
                ),
              }))}
              valor={f.tipo_venda}
              onChange={(v) => mudar({ tipo_venda: v })}
            />
          </div>

          <div>
            <Rotulo>Quantidade de {f.tipo_venda === 'kit' ? 'kits' : 'unidades'}</Rotulo>
            <div className="flex items-center gap-3">
              <Botao
                variante="secundario"
                className="size-12 p-0 text-xl"
                onClick={() => mudar({ quantidade: Math.max(1, (f.quantidade ?? 1) - 1) })}
                aria-label="Diminuir"
              >
                −
              </Botao>
              <input
                id="quantidade"
                className={`${classeCampo} w-20 text-center text-lg font-semibold tabular-nums`}
                inputMode="numeric"
                value={f.quantidade ?? ''}
                onChange={(e) => mudar({ quantidade: Math.max(1, Number(soDigitos(e.target.value)) || 1) })}
              />
              <Botao
                variante="secundario"
                className="size-12 p-0 text-xl"
                onClick={() => mudar({ quantidade: (f.quantidade ?? 0) + 1 })}
                aria-label="Aumentar"
              >
                +
              </Botao>
              <div className="ml-auto text-right">
                <div className="text-2xl font-bold tabular-nums">{plaquinhas}</div>
                <div className="text-xs text-zinc-400">plaquinha{plaquinhas === 1 ? '' : 's'} física{plaquinhas === 1 ? '' : 's'}</div>
              </div>
            </div>
          </div>

          <div>
            <Rotulo erro={mostrarErro(erros.valor)}>Valor total</Rotulo>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-zinc-400">R$</span>
              <input
                id="valor"
                className={`${classeCampo} pl-11 text-xl font-bold tabular-nums`}
                inputMode="decimal"
                value={valorTexto}
                onChange={(e) => {
                  setValorTexto(e.target.value.replace(/[^\d,.]/g, ''))
                  setValorManual(true)
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              {valorManual && Math.abs(valor - valorCalculado) > 0.001 ? (
                <>
                  Valor ajustado (tabela: {formatarMoeda(valorCalculado)}).{' '}
                  <button
                    type="button"
                    className="text-marca underline"
                    onClick={() => {
                      setValorManual(false)
                      setValorTexto(textoValor(valorCalculado))
                    }}
                  >
                    Usar valor da tabela
                  </button>
                </>
              ) : (
                <>
                  {f.quantidade} × {formatarMoeda(precoTipo(f.tipo_venda))}. Pode editar para desconto ou combinação diferente.
                </>
              )}
            </p>
          </div>

          <div>
            <Rotulo erro={mostrarErro(erros.forma_pagamento)}>Forma de pagamento</Rotulo>
            <Chips colunas={4} opcoes={FORMAS_PAGAMENTO} valor={f.forma_pagamento} onChange={(v) => mudar({ forma_pagamento: v })} />
          </div>

          <div>
            <Rotulo>Pagamento</Rotulo>
            <Chips opcoes={STATUS_PAGAMENTO} valor={f.status_pagamento} onChange={(v) => mudar({ status_pagamento: v })} />
          </div>

          <label className="block">
            <Rotulo erro={mostrarErro(erros.vendedor_id)}>Vendedor responsável</Rotulo>
            <select
              id="vendedor"
              className={classeCampo}
              value={f.vendedor_id ?? ''}
              onChange={(e) => mudar({ vendedor_id: e.target.value || null })}
            >
              <option value="">Selecione…</option>
              {perfis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <Rotulo>Observações</Rotulo>
            <textarea
              id="observacoes"
              className={`${classeCampo} min-h-24`}
              placeholder="Como foi a venda? Algo combinado com o cliente?"
              value={f.observacoes ?? ''}
              onChange={(e) => mudar({ observacoes: e.target.value })}
            />
          </label>
        </div>
      </Secao>

      {/* ---------- Ações ---------- */}
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-borda bg-fundo/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {nova && (
          <Botao disabled={salvando} className="py-4 text-lg" onClick={() => void salvar('validada', 'Venda registrada e validada ✓')}>
            Registrar venda · {formatarMoeda(valor || 0)}
          </Botao>
        )}
        {status === 'pendente' && !nova && (
          <Botao disabled={salvando} className="py-4 text-lg" onClick={() => void salvar('validada', 'Venda validada ✓')}>
            Validar venda · {formatarMoeda(valor || 0)}
          </Botao>
        )}
        {status === 'validada' && (
          <Botao disabled={salvando} className="py-4" onClick={() => void salvar('validada', 'Alterações salvas ✓')}>
            Salvar alterações
          </Botao>
        )}
        {status === 'cancelada' && (
          <Botao disabled={salvando} variante="secundario" onClick={() => void salvar('pendente', 'Venda reaberta como pendente')}>
            Reabrir venda
          </Botao>
        )}
        {!nova && status !== 'cancelada' &&
          (confirmarCancelamento ? (
            <div className="grid grid-cols-2 gap-2">
              <Botao variante="secundario" onClick={() => setConfirmarCancelamento(false)}>
                Voltar
              </Botao>
              <Botao variante="perigo" disabled={salvando} onClick={() => void salvar('cancelada', 'Venda cancelada')}>
                Confirmar cancelamento
              </Botao>
            </div>
          ) : (
            <Botao variante="fantasma" onClick={() => setConfirmarCancelamento(true)}>
              Cancelar venda
            </Botao>
          ))}
      </div>
    </div>
  )
}

function Secao({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-borda bg-cartao/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  )
}

function Info({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{rotulo}</dt>
      <dd className="text-zinc-200">{children}</dd>
    </div>
  )
}
