import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  OPCOES_COMO_ENCONTRAM,
  OPCOES_TEM_SITE,
  SEGMENTOS,
  type ComoEncontram,
  type Opcao,
  type Segmento,
  type TemSite,
} from '../lib/constantes'
import { mascaraInstagram, mascaraWhatsapp, soDigitos, whatsappValido } from '../lib/mascaras'
import { supabase } from '../lib/supabase'

interface Respostas {
  nome: string
  whatsapp: string
  instagram: string
  aceite: boolean
  segmento: Segmento | null
  temSite: TemSite | null
  comoEncontram: ComoEncontram | null
}

const TOTAL_PERGUNTAS = 4

export default function Formulario() {
  const [passo, setPasso] = useState(0) // 0..3 perguntas, 4 = obrigado
  const [r, setR] = useState<Respostas>({
    nome: '',
    whatsapp: '',
    instagram: '',
    aceite: false,
    segmento: null,
    temSite: null,
    comoEncontram: null,
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const avancando = useRef(false) // evita toque duplo enviar/pular duas vezes

  async function enviar(final: Respostas) {
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.rpc('enviar_formulario', {
      p_nome: final.nome.trim(),
      p_whatsapp: soDigitos(final.whatsapp),
      p_instagram: final.instagram || null,
      p_segmento: final.segmento,
      p_tem_site: final.temSite,
      p_como_encontram: final.comoEncontram,
      p_aceite_contato: final.aceite,
    })
    setEnviando(false)
    if (error) {
      console.error(error)
      setErro('Não conseguimos enviar agora. Confira sua internet e tente de novo.')
      return
    }
    setPasso(4)
  }

  function escolher<K extends 'segmento' | 'temSite' | 'comoEncontram'>(campo: K, valor: Respostas[K]) {
    if (avancando.current || enviando) return
    avancando.current = true
    const novo = { ...r, [campo]: valor }
    setR(novo)
    // pequeno atraso para o toque ficar visível antes de avançar
    setTimeout(async () => {
      if (passo === TOTAL_PERGUNTAS - 1) await enviar(novo)
      else setPasso((p) => p + 1)
      avancando.current = false
    }, 180)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {passo < TOTAL_PERGUNTAS && (
        <header className="mb-8">
          <div className="mb-4 flex items-center justify-between text-sm text-zinc-400">
            <button
              type="button"
              onClick={() => setPasso((p) => p - 1)}
              disabled={passo === 0 || enviando}
              className="-ml-2 rounded-lg px-2 py-1 disabled:invisible"
            >
              ← Voltar
            </button>
            <span>
              {passo + 1} de {TOTAL_PERGUNTAS}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-borda">
            <div
              className="h-full rounded-full bg-gradient-to-r from-marca to-marca-2 transition-all duration-300"
              style={{ width: `${((passo + 1) / TOTAL_PERGUNTAS) * 100}%` }}
            />
          </div>
        </header>
      )}

      <main key={passo} className="animar-entrada flex flex-1 flex-col">
        {passo === 0 && <PassoContato r={r} setR={setR} avancar={() => setPasso(1)} />}

        {passo === 1 && (
          <Pergunta
            titulo="Qual é o segmento do seu negócio?"
            opcoes={SEGMENTOS}
            selecionado={r.segmento}
            onEscolher={(v) => escolher('segmento', v)}
          />
        )}

        {passo === 2 && (
          <Pergunta
            titulo="Seu negócio já tem site?"
            opcoes={OPCOES_TEM_SITE}
            selecionado={r.temSite}
            onEscolher={(v) => escolher('temSite', v)}
          />
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

        {passo === 3 && enviando && <p className="mt-6 text-center text-zinc-400">Enviando…</p>}
        {erro && (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{erro}</p>
            <button
              type="button"
              onClick={() => void enviar(r)}
              className="mt-3 font-semibold text-white underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {passo === 4 && <Obrigado nome={r.nome} />}
      </main>

      <footer className="mt-8 text-center text-xs text-zinc-600">Marquez Digital</footer>
    </div>
  )
}

function PassoContato({
  r,
  setR,
  avancar,
}: {
  r: Respostas
  setR: (r: Respostas) => void
  avancar: () => void
}) {
  const [tentou, setTentou] = useState(false)
  const nomeOk = r.nome.trim().length >= 2
  const zapOk = whatsappValido(r.whatsapp)
  const valido = nomeOk && zapOk && r.aceite

  function submit(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (valido) avancar()
  }

  const campo =
    'w-full rounded-xl border border-borda bg-cartao px-4 py-3.5 text-base text-white placeholder:text-zinc-500 outline-none focus:border-marca focus:ring-2 focus:ring-marca/30'

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col" noValidate>
      <h1 className="text-2xl font-bold leading-tight">
        Obrigado pela compra! 🎉
        <span className="mt-1 block text-base font-normal text-zinc-400">
          Leva menos de 1 minuto. Primeiro, seus dados de contato:
        </span>
      </h1>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-zinc-300">Seu nome</span>
          <input
            className={campo}
            autoComplete="name"
            placeholder="Como podemos te chamar?"
            value={r.nome}
            onChange={(e) => setR({ ...r, nome: e.target.value })}
          />
          {tentou && !nomeOk && <Erro>Digite seu nome</Erro>}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-zinc-300">WhatsApp (com DDD)</span>
          <input
            className={campo}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(11) 98765-4321"
            value={r.whatsapp}
            onChange={(e) => setR({ ...r, whatsapp: mascaraWhatsapp(e.target.value) })}
          />
          {tentou && !zapOk && <Erro>WhatsApp inválido — confira o DDD e o número</Erro>}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-zinc-300">
            @ do Instagram <span className="text-zinc-500">(opcional)</span>
          </span>
          <input
            className={campo}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="@seunegocio"
            value={r.instagram}
            onChange={(e) => setR({ ...r, instagram: mascaraInstagram(e.target.value) })}
          />
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-borda bg-cartao p-4">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-marca"
            checked={r.aceite}
            onChange={(e) => setR({ ...r, aceite: e.target.checked })}
          />
          <span className="text-sm text-zinc-300">Aceito receber contato da Marquez Digital no WhatsApp</span>
        </label>
        {tentou && !r.aceite && <Erro>É preciso aceitar para continuar</Erro>}
      </div>

      <button
        type="submit"
        className="mt-auto w-full rounded-2xl bg-gradient-to-r from-marca to-marca-2 py-4 text-lg font-semibold text-white shadow-lg shadow-marca/20 active:scale-[0.98] sm:mt-10"
      >
        Continuar →
      </button>
    </form>
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
      <h1 className="mb-6 text-2xl font-bold leading-tight">{titulo}</h1>
      <div className="space-y-3">
        {opcoes.map((o) => {
          const ativo = o.valor === selecionado
          return (
            <button
              key={o.valor}
              type="button"
              disabled={desabilitado}
              onClick={() => onEscolher(o.valor)}
              className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left text-lg font-medium transition active:scale-[0.98] disabled:opacity-60 ${
                ativo
                  ? 'border-marca bg-marca/15 text-white'
                  : 'border-borda bg-cartao text-zinc-200 hover:border-zinc-600'
              }`}
            >
              <span className="text-2xl">{o.emoji}</span>
              {o.rotulo}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Obrigado({ nome }: { nome: string }) {
  const primeiroNome = nome.trim().split(/\s+/)[0]
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-6 grid size-24 place-items-center rounded-full bg-gradient-to-br from-marca to-marca-2 text-5xl shadow-xl shadow-marca/30">
        ✓
      </div>
      <h1 className="text-3xl font-bold">Valeu, {primeiroNome}! 🙌</h1>
      <p className="mt-3 max-w-xs text-zinc-400">
        Recebemos seus dados. Em breve a gente fala com você no WhatsApp para te ajudar a tirar o máximo
        da sua plaquinha.
      </p>
    </div>
  )
}

function Erro({ children }: { children: ReactNode }) {
  return <span className="mt-1.5 block text-sm text-red-400">{children}</span>
}
