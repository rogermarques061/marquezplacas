import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Botao, Marca, classeCampo } from '../components/ui'
import { api } from '../lib/api'
import {
  OPCOES_COMO_ENCONTRAM,
  OPCOES_TEM_SITE,
  SEGMENTOS,
  type ComoEncontram,
  type Opcao,
  type Segmento,
  type TemSite,
} from '../lib/constantes'
import { mascaraInstagram, mascaraWhatsapp, whatsappValido } from '../lib/mascaras'

interface Respostas {
  nome: string
  whatsapp: string
  instagram: string
  aceite: boolean
  segmento: Segmento | null
  temSite: TemSite | null
  comoEncontram: ComoEncontram | null
}

const VAZIO: Respostas = {
  nome: '',
  whatsapp: '',
  instagram: '',
  aceite: false,
  segmento: null,
  temSite: null,
  comoEncontram: null,
}

const PERGUNTAS = 4

/**
 * Formulário do comprador, uma pergunta por tela.
 * - `publico`: aberto pelo link, o cliente preenche no próprio celular.
 * - `atendimento`: o vendedor gera pelo painel e entrega o celular ao cliente.
 */
export default function Formulario({
  modo = 'publico',
  aoSair,
  aoConferir,
}: {
  modo?: 'publico' | 'atendimento'
  aoSair?: () => void
  aoConferir?: (vendaId: string) => void
}) {
  // -1 = tela "passe o celular" (só no atendimento), 0..3 perguntas, 4 = obrigado
  const [passo, setPasso] = useState(modo === 'atendimento' ? -1 : 0)
  const [r, setR] = useState<Respostas>(VAZIO)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [vendaId, setVendaId] = useState<string | null>(null)
  const avancando = useRef(false) // evita toque duplo enviar/pular duas vezes

  async function enviar(final: Respostas) {
    setEnviando(true)
    setErro(null)
    try {
      setVendaId(await api.enviarFormulario(final))
      setPasso(4)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível enviar. Confira a internet e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  function escolher<K extends 'segmento' | 'temSite' | 'comoEncontram'>(campo: K, valor: Respostas[K]) {
    if (avancando.current || enviando) return
    avancando.current = true
    const novo = { ...r, [campo]: valor }
    setR(novo)
    // pequeno atraso para o toque ficar visível antes de avançar
    setTimeout(async () => {
      if (passo === PERGUNTAS - 1) await enviar(novo)
      else setPasso((p) => p + 1)
      avancando.current = false
    }, 200)
  }

  function novoFormulario() {
    setR(VAZIO)
    setVendaId(null)
    setPasso(0)
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="flex h-10 items-center justify-between">
        <Marca subtitulo="Marquez Digital" />
        {modo === 'atendimento' && passo < 4 && (
          <button type="button" onClick={aoSair} className="rotulo px-1 py-2 hover:text-suave">
            Cancelar
          </button>
        )}
      </header>

      {passo >= 0 && passo < PERGUNTAS && <Progresso passo={passo} voltar={() => setPasso((p) => p - 1)} bloqueado={enviando} />}

      <main key={passo} className="animar-entrada flex flex-1 flex-col pt-8">
        {passo === -1 && <Entregar comecar={() => setPasso(0)} />}
        {passo === 0 && <PassoContato r={r} setR={setR} avancar={() => setPasso(1)} />}
        {passo === 1 && (
          <Pergunta titulo="Qual é o segmento do seu negócio?" opcoes={SEGMENTOS} selecionado={r.segmento} onEscolher={(v) => escolher('segmento', v)} />
        )}
        {passo === 2 && (
          <Pergunta titulo="Seu negócio já tem site?" opcoes={OPCOES_TEM_SITE} selecionado={r.temSite} onEscolher={(v) => escolher('temSite', v)} />
        )}
        {passo === 3 && (
          <Pergunta
            titulo="Como seus clientes te encontram hoje?"
            opcoes={OPCOES_COMO_ENCONTRAM}
            selecionado={r.comoEncontram}
            onEscolher={(v) => escolher('comoEncontram', v)}
            desabilitado={enviando}
          />
        )}
        {passo === 3 && enviando && <p className="rotulo mt-6 text-center">Enviando…</p>}
        {erro && (
          <div className="mt-6 rounded-md border border-perigo/40 bg-perigo/5 p-4 text-sm text-perigo">
            <p>{erro}</p>
            <button type="button" onClick={() => void enviar(r)} className="mt-2 font-semibold text-texto underline underline-offset-4">
              Tentar novamente
            </button>
          </div>
        )}
        {passo === 4 && (
          <Obrigado nome={r.nome}>
            {modo === 'atendimento' && vendaId && (
              <div className="mt-auto w-full border-t border-borda pt-5">
                <p className="rotulo mb-3 text-center">Área do vendedor</p>
                <div className="grid grid-cols-2 gap-2">
                  <Botao variante="secundario" onClick={novoFormulario}>
                    Novo formulário
                  </Botao>
                  <Botao onClick={() => aoConferir?.(vendaId)}>
                    Conferir venda <ArrowRight className="size-4" />
                  </Botao>
                </div>
              </div>
            )}
          </Obrigado>
        )}
      </main>
    </div>
  )
}

/** Barra de progresso em segmentos inclinados, como as barras da logo. */
function Progresso({ passo, voltar, bloqueado }: { passo: number; voltar: () => void; bloqueado: boolean }) {
  return (
    <div className="mt-6 flex items-center gap-4">
      <button
        type="button"
        onClick={voltar}
        disabled={passo === 0 || bloqueado}
        aria-label="Voltar"
        className="-ml-1.5 grid size-8 place-items-center rounded-md text-suave hover:bg-cartao disabled:invisible"
      >
        <ArrowLeft className="size-4" />
      </button>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: PERGUNTAS }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 -skew-x-[35deg] transition-colors duration-300 ${i <= passo ? 'prata' : 'bg-borda'}`} />
        ))}
      </div>
      <span className="font-mono text-xs text-apagado tabular-nums">
        {String(passo + 1).padStart(2, '0')}/{String(PERGUNTAS).padStart(2, '0')}
      </span>
    </div>
  )
}

function Entregar({ comecar }: { comecar: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center">
        <p className="rotulo">Formulário do cliente</p>
        <h1 className="titulo mt-3 text-[40px] leading-[1.02]">
          Passe o celular
          <br />
          <span className="texto-prata">para o cliente.</span>
        </h1>
        <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-suave">
          São 4 perguntas rápidas. Quando ele terminar, a venda aparece nas suas pendentes para você conferir e validar.
        </p>
      </div>
      <Botao onClick={comecar} className="w-full py-4 text-base">
        Começar <ArrowRight className="size-4" />
      </Botao>
    </div>
  )
}

function PassoContato({ r, setR, avancar }: { r: Respostas; setR: (r: Respostas) => void; avancar: () => void }) {
  const [tentou, setTentou] = useState(false)
  const nomeOk = r.nome.trim().length >= 2
  const zapOk = whatsappValido(r.whatsapp)
  const valido = nomeOk && zapOk && r.aceite

  function submit(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (valido) avancar()
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col" noValidate>
      <h1 className="titulo text-[30px] leading-[1.08]">Obrigado pela compra.</h1>
      <p className="mt-2 text-[15px] text-suave">Leva menos de um minuto. Primeiro, seus dados de contato.</p>

      <div className="mt-8 flex flex-col gap-4">
        <Campo rotulo="Seu nome" erro={tentou && !nomeOk && 'Digite seu nome'}>
          <input
            id="nome"
            className={classeCampo}
            autoComplete="name"
            placeholder="Como podemos te chamar?"
            value={r.nome}
            onChange={(e) => setR({ ...r, nome: e.target.value })}
          />
        </Campo>
        <Campo rotulo="WhatsApp com DDD" erro={tentou && !zapOk && 'Confira o DDD e o número'}>
          <input
            id="whatsapp"
            className={`${classeCampo} tabular-nums`}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(11) 98765-4321"
            value={r.whatsapp}
            onChange={(e) => setR({ ...r, whatsapp: mascaraWhatsapp(e.target.value) })}
          />
        </Campo>
        <Campo rotulo="Instagram do negócio" opcional>
          <input
            id="instagram"
            className={classeCampo}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="@seunegocio"
            value={r.instagram}
            onChange={(e) => setR({ ...r, instagram: mascaraInstagram(e.target.value) })}
          />
        </Campo>

        <label
          className={`mt-1 flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition ${
            tentou && !r.aceite ? 'border-perigo/50' : r.aceite ? 'border-prata-2/60' : 'border-borda'
          }`}
        >
          <input
            id="aceite"
            type="checkbox"
            className="peer sr-only"
            checked={r.aceite}
            onChange={(e) => setR({ ...r, aceite: e.target.checked })}
          />
          <span
            className={`chanfro chanfro-sm mt-0.5 grid size-5 shrink-0 place-items-center ${r.aceite ? 'prata' : 'bg-borda-2'}`}
            aria-hidden="true"
          >
            {r.aceite && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          <span className="text-sm leading-snug text-suave">Aceito receber contato da Marquez Digital no WhatsApp.</span>
        </label>
      </div>

      <Botao type="submit" className="mt-auto w-full py-4 text-base sm:mt-10">
        Continuar <ArrowRight className="size-4" />
      </Botao>
    </form>
  )
}

function Campo({ rotulo, erro, opcional, children }: { rotulo: string; erro?: string | false; opcional?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-suave">
        <span>
          {rotulo} {opcional && <span className="text-apagado">(opcional)</span>}
        </span>
        {erro && <span className="text-xs text-perigo">{erro}</span>}
      </span>
      {children}
    </label>
  )
}

function Pergunta<T extends string>({
  titulo,
  opcoes,
  selecionado,
  onEscolher,
  desabilitado,
}: {
  titulo: string
  opcoes: Opcao<T>[]
  selecionado: T | null
  onEscolher: (v: T) => void
  desabilitado?: boolean
}) {
  return (
    <div>
      <h1 className="titulo mb-7 text-[30px] leading-[1.08]">{titulo}</h1>
      <div className="flex flex-col gap-2">
        {opcoes.map((o, i) => {
          const ativo = o.valor === selecionado
          return (
            <button
              key={o.valor}
              type="button"
              disabled={desabilitado}
              onClick={() => onEscolher(o.valor)}
              className={`group flex w-full items-center gap-4 px-4 py-4 text-left transition active:translate-y-px disabled:opacity-60 ${
                ativo ? 'prata chanfro' : 'rounded-md border border-borda bg-cartao hover:border-borda-2'
              }`}
            >
              <span className={`font-mono text-xs tabular-nums ${ativo ? 'text-[#4d4860]' : 'text-apagado'}`}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className={`flex-1 text-[16px] font-medium ${ativo ? '' : 'text-texto'}`}>{o.rotulo}</span>
              <ArrowRight className={`size-4 transition ${ativo ? '' : 'text-apagado opacity-0 group-hover:opacity-100'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Obrigado({ nome, children }: { nome: string; children?: ReactNode }) {
  const primeiroNome = nome.trim().split(/\s+/)[0]
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center">
        <div className="chanfro prata grid size-14 place-items-center">
          <Check className="size-7" strokeWidth={2.5} />
        </div>
        <h1 className="titulo mt-7 text-[40px] leading-[1.02]">
          Valeu, <span className="texto-prata">{primeiroNome}.</span>
        </h1>
        <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-suave">
          Recebemos seus dados. Em breve a gente chama no WhatsApp para te ajudar a tirar o máximo da sua plaquinha.
        </p>
      </div>
      {children}
    </div>
  )
}
