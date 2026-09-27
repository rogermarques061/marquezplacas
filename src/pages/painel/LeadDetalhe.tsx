import { AtSign, MessageCircle, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Botao, classeCampo } from '../../components/ui'
import { api } from '../../lib/api'
import { ETAPAS, OPCOES_TEM_SITE, SEGMENTOS, TEMPERATURAS, rotulo, type Etapa } from '../../lib/constantes'
import { formatarDataHora, formatarMoeda, formatarWhatsapp, linkWhatsapp } from '../../lib/formatos'
import type { HistoricoLead, LeadCompleto, LeadEditavel, Perfil } from '../../lib/tipos'

/** ISO → valor de <input type="datetime-local"> no fuso do aparelho */
function paraInputData(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function LeadDetalhe({
  lead,
  perfis,
  fechar,
  aoSalvar,
}: {
  lead: LeadCompleto
  perfis: Perfil[]
  fechar: () => void
  aoSalvar: () => void
}) {
  const [historico, setHistorico] = useState<HistoricoLead[]>([])
  const [anotacoes, setAnotacoes] = useState(lead.anotacoes ?? '')
  const [status, setStatus] = useState<'salvando' | 'salvo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.listarHistorico(lead.id).then(setHistorico).catch(() => {})
  }, [lead.id, lead.etapa])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [fechar])

  async function salvar(dados: LeadEditavel) {
    setStatus('salvando')
    setErro(null)
    try {
      await api.atualizarLead(lead.id, dados)
      aoSalvar()
      setStatus('salvo')
      setTimeout(() => setStatus((s) => (s === 'salvo' ? null : s)), 1500)
    } catch (e) {
      setErro((e as Error).message)
      setStatus(null)
    }
  }

  const nomePerfil = (id: string | null) => perfis.find((p) => p.id === id)?.nome ?? 'Sistema'
  const rotuloEtapa = (e: Etapa | null) => ETAPAS.find((x) => x.valor === e)?.rotulo ?? '—'
  const primeiroNome = lead.venda.nome.split(' ')[0]

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={lead.venda.nome}>
      <button type="button" aria-label="Fechar" onClick={fechar} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <aside className="animar-entrada relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-borda bg-fundo pb-[env(safe-area-inset-bottom)]">
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-borda bg-fundo/95 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold tracking-tight">{lead.venda.nome}</h2>
            <p className="text-sm text-zinc-500">
              {rotulo(SEGMENTOS, lead.venda.segmento)} · plaquinha {formatarMoeda(lead.venda.valor_total)}
            </p>
          </div>
          <span className="pt-1 text-xs text-zinc-500">{status === 'salvando' ? 'Salvando…' : status === 'salvo' ? 'Salvo ✓' : ''}</span>
          <button type="button" onClick={fechar} className="rounded-lg p-1.5 text-zinc-400 hover:bg-cartao" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex flex-col gap-6 px-5 py-5">
          {erro && <p className="text-sm text-red-400">{erro}</p>}

          <div className="grid grid-cols-2 gap-2">
            <a
              href={linkWhatsapp(lead.venda.whatsapp, `Oi, ${primeiroNome}! Aqui é da Marquez Digital 👋`)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 py-3 text-sm font-bold text-emerald-300"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
            {lead.venda.instagram ? (
              <a
                href={`https://instagram.com/${lead.venda.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-borda bg-cartao py-3 text-sm font-semibold text-zinc-200"
              >
                <AtSign className="size-4" /> {lead.venda.instagram}
              </a>
            ) : (
              <span className="flex items-center justify-center rounded-xl border border-dashed border-borda text-xs text-zinc-600">
                Sem Instagram
              </span>
            )}
          </div>
          <p className="-mt-3 text-sm text-zinc-400 tabular-nums">
            {formatarWhatsapp(lead.venda.whatsapp)} · Site hoje: {rotulo(OPCOES_TEM_SITE, lead.venda.tem_site)}
          </p>

          <Campo titulo="Etapa do funil">
            <div className="grid grid-cols-2 gap-2">
              {ETAPAS.map((e) => (
                <button
                  key={e.valor}
                  type="button"
                  aria-pressed={lead.etapa === e.valor}
                  onClick={() => lead.etapa !== e.valor && void salvar({ etapa: e.valor })}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium ${
                    lead.etapa === e.valor ? 'border-marca bg-marca/15 text-white' : 'border-borda bg-cartao text-zinc-300'
                  } ${e.valor === 'perdido' ? 'col-span-2' : ''}`}
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ background: e.cor }} />
                  {e.rotulo}
                </button>
              ))}
            </div>
          </Campo>

          <Campo titulo="Temperatura">
            <div className="grid grid-cols-3 gap-2">
              {TEMPERATURAS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  aria-pressed={lead.temperatura === t.valor}
                  onClick={() => void salvar({ temperatura: t.valor })}
                  className={`rounded-xl border py-2.5 text-sm font-semibold ${
                    lead.temperatura === t.valor ? `border-transparent ${t.classe}` : 'border-borda bg-cartao text-zinc-400'
                  }`}
                >
                  {t.emoji} {t.rotulo}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">Definida automaticamente pela resposta “já tem site?”. Pode ajustar.</p>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo titulo="Data da reunião">
              <input
                id="data-reuniao"
                type="datetime-local"
                className={`${classeCampo} px-3 text-sm`}
                defaultValue={paraInputData(lead.data_reuniao)}
                onChange={(e) => void salvar({ data_reuniao: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </Campo>
            <Campo titulo="Vendedor">
              <select
                id="responsavel"
                className={`${classeCampo} px-3 text-sm`}
                value={lead.responsavel_id ?? ''}
                onChange={(e) => void salvar({ responsavel_id: e.target.value || null })}
              >
                <option value="">Ninguém</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-borda bg-cartao px-4 py-3">
            <span>
              <span className="block text-sm font-semibold">Manutenção ativa</span>
              <span className="text-xs text-zinc-500">{formatarMoeda(lead.valor_manutencao)}/mês · entra no MRR</span>
            </span>
            <input
              id="manutencao"
              type="checkbox"
              className="size-5 accent-marca"
              checked={lead.manutencao_ativa}
              onChange={(e) => void salvar({ manutencao_ativa: e.target.checked })}
            />
          </label>

          <Campo titulo="Anotações">
            <textarea
              id="anotacoes"
              className={`${classeCampo} min-h-28 text-sm`}
              placeholder="O que foi conversado, objeções, próximos passos…"
              value={anotacoes}
              onChange={(e) => setAnotacoes(e.target.value)}
            />
            {anotacoes !== (lead.anotacoes ?? '') && (
              <Botao className="mt-2 w-full py-2.5 text-sm" onClick={() => void salvar({ anotacoes: anotacoes.trim() || null })}>
                Salvar anotações
              </Botao>
            )}
          </Campo>

          <Campo titulo="Histórico">
            <ol className="relative ml-1 border-l border-borda">
              {historico.map((h) => (
                <li key={h.id} className="relative pb-4 pl-5 last:pb-0">
                  <span
                    className="absolute top-1.5 -left-[5px] size-2.5 rounded-full ring-4 ring-fundo"
                    style={{ background: ETAPAS.find((e) => e.valor === h.etapa_nova)?.cor }}
                  />
                  <p className="text-sm text-zinc-200">
                    {h.etapa_anterior ? (
                      <>
                        {rotuloEtapa(h.etapa_anterior)} → <strong>{rotuloEtapa(h.etapa_nova)}</strong>
                      </>
                    ) : (
                      <strong>Entrou no funil</strong>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatarDataHora(h.created_at)} · {nomePerfil(h.usuario_id)}
                  </p>
                </li>
              ))}
              {historico.length === 0 && <li className="pl-5 text-sm text-zinc-500">Sem movimentações.</li>}
            </ol>
          </Campo>
        </div>
      </aside>
    </div>
  )
}

function Campo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold tracking-[0.12em] text-zinc-500 uppercase">{titulo}</h3>
      {children}
    </div>
  )
}
