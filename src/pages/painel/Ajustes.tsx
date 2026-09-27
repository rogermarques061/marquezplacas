import { Bell, BellOff, Check, Copy, Link2, Share, Smartphone, SquarePlus, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import logo from '../../assets/logo.svg'
import { Botao, Chips, RotuloCampo, Selo, classeCampo } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { appInstalado, ativarPush, desativarPush, ehIOS, estadoPush, notificacaoTeste, type EstadoPush } from '../../lib/push'
import { modoDemo } from '../../lib/supabase'
import type { Papel, Perfil } from '../../lib/tipos'

export default function Ajustes() {
  const { perfil } = useAuth()
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="mb-2">
        <p className="rotulo">Conta e equipe</p>
        <h1 className="titulo mt-2 text-[32px] leading-none lg:text-[40px]">Ajustes</h1>
      </header>
      <Notificacoes />
      <MeuPerfil />
      <LinkFormulario />
      {perfil?.papel === 'admin' && <Equipe />}
    </div>
  )
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-borda bg-cartao p-5 lg:p-6">
      <h2 className="text-[15px] font-semibold">{titulo}</h2>
      {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------ Notificações */

function Notificacoes() {
  const [estado, setEstado] = useState<EstadoPush>('carregando')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [previa, setPrevia] = useState(false)

  useEffect(() => {
    estadoPush().then(setEstado)
  }, [])

  async function alternar() {
    setOcupado(true)
    setErro(null)
    try {
      setEstado(estado === 'ativo' ? await desativarPush() : await ativarPush())
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function testar() {
    if (modoDemo) {
      setPrevia(true)
      setTimeout(() => setPrevia(false), 4000)
      return
    }
    await notificacaoTeste().catch((e: Error) => setErro(e.message))
  }

  const ativo = estado === 'ativo'

  return (
    <Secao
      titulo="Notificações neste aparelho"
      descricao="Aviso na hora em que um cliente envia o formulário. Tocar no aviso abre a venda."
    >
      {estado === 'instalar-ios' ? (
        <InstalarIOS />
      ) : estado === 'sem-suporte' ? (
        <Aviso>Este navegador não recebe notificações. No celular, use o app instalado na tela inicial.</Aviso>
      ) : estado === 'sem-chave' ? (
        <Aviso>Notificações ainda não configuradas no servidor (falta a chave VAPID). Veja o README.</Aviso>
      ) : estado === 'bloqueado' ? (
        <Aviso>
          As notificações foram bloqueadas para este app. Libere nas configurações do aparelho (Notificações → Marquez) e volte
          aqui.
        </Aviso>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-md border border-borda bg-cartao-2 p-4">
            <span className={`grid size-10 shrink-0 place-items-center rounded-md ${ativo ? 'prata chanfro' : 'bg-borda text-apagado'}`}>
              {ativo ? <Bell className="size-5" /> : <BellOff className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{estado === 'carregando' ? 'Verificando…' : ativo ? 'Ativadas' : 'Desativadas'}</p>
              <p className="text-xs text-apagado">{ativo ? 'Você recebe um aviso a cada formulário enviado.' : 'Você não recebe avisos neste aparelho.'}</p>
            </div>
            <Interruptor ligado={ativo} desabilitado={ocupado || estado === 'carregando'} onChange={() => void alternar()} />
          </div>
          {ativo && (
            <Botao variante="secundario" onClick={() => void testar()} className="self-start">
              Enviar notificação de teste
            </Botao>
          )}
        </div>
      )}
      {erro && <p className="mt-3 text-sm text-perigo">{erro}</p>}
      {!appInstalado() && !ehIOS() && estado !== 'sem-suporte' && <InstalarAndroid />}

      {previa && (
        <div className="animar-entrada fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 z-50 flex w-[min(92vw,380px)] -translate-x-1/2 gap-3 rounded-lg border border-borda-2 bg-[#24232c]/95 p-3.5 shadow-2xl backdrop-blur">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-fundo">
            <img src={logo} alt="" className="h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="flex justify-between gap-2 text-[13px] font-semibold">
              Opa! Mais uma plaquinha vendida 🔥 <span className="font-normal text-apagado">agora</span>
            </p>
            <p className="text-[13px] text-suave">Teste (Beleza e Estética)</p>
          </div>
        </div>
      )}
    </Secao>
  )
}

function Interruptor({ ligado, desabilitado, onChange }: { ligado: boolean; desabilitado?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label="Notificações"
      disabled={desabilitado}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-50 ${
        ligado ? 'border-transparent bg-prata-2' : 'border-borda-2 bg-borda'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5.5 rounded-full shadow transition-all ${ligado ? 'left-[22px] bg-fundo' : 'left-0.5 bg-suave'}`}
      />
    </button>
  )
}

function Aviso({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-alerta/30 bg-alerta/[0.05] p-4 text-sm leading-relaxed text-alerta">{children}</p>
}

function Passo({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="titulo w-5 shrink-0 text-lg leading-6 text-apagado tabular-nums">{n}</span>
      <span className="text-sm leading-6 text-suave">{children}</span>
    </li>
  )
}

function InstalarIOS() {
  return (
    <div className="rounded-md border border-borda bg-cartao-2 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Smartphone className="size-4" /> No iPhone, instale o app primeiro
      </p>
      <p className="mt-1 text-xs text-apagado">A Apple só libera notificações para apps na Tela de Início (iOS 16.4 ou mais novo).</p>
      <ol className="mt-4 flex flex-col gap-2.5">
        <Passo n={1}>
          Abra este painel no <strong className="text-texto">Safari</strong>.
        </Passo>
        <Passo n={2}>
          Toque em <Share className="inline size-4 -translate-y-px" /> <strong className="text-texto">Compartilhar</strong>.
        </Passo>
        <Passo n={3}>
          Escolha <SquarePlus className="inline size-4 -translate-y-px" /> <strong className="text-texto">Adicionar à Tela de Início</strong>.
        </Passo>
        <Passo n={4}>Abra o app Marquez pela tela inicial e volte aqui em Ajustes.</Passo>
      </ol>
    </div>
  )
}

interface EventoInstalar extends Event {
  prompt(): Promise<void>
}

function InstalarAndroid() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null)
  useEffect(() => {
    const pegar = (e: Event) => {
      e.preventDefault()
      setEvento(e as EventoInstalar)
    }
    window.addEventListener('beforeinstallprompt', pegar)
    return () => window.removeEventListener('beforeinstallprompt', pegar)
  }, [])
  if (!evento) return null
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-borda pt-4">
      <p className="text-sm text-suave">Instale o app para abrir direto da tela inicial.</p>
      <Botao variante="secundario" onClick={() => void evento.prompt().then(() => setEvento(null))}>
        Instalar app
      </Botao>
    </div>
  )
}

/* -------------------------------------------------------------- Meu perfil */

function MeuPerfil() {
  const { perfil, recarregarPerfil } = useAuth()
  const [nome, setNome] = useState(perfil?.nome ?? '')
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      await api.atualizarMeuPerfil({ nome: nome.trim() })
      await recarregarPerfil()
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  return (
    <Secao titulo="Meu perfil">
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <RotuloCampo>Nome</RotuloCampo>
            <input id="meu-nome" className={classeCampo} value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <div>
            <RotuloCampo>E-mail</RotuloCampo>
            <p className="truncate rounded-md border border-borda px-3.5 py-3 text-[15px] text-apagado">{perfil?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Botao type="submit" variante="secundario" disabled={nome.trim().length < 2 || nome.trim() === perfil?.nome}>
            Salvar nome
          </Botao>
          {salvo && (
            <span className="flex items-center gap-1 text-sm text-ok">
              <Check className="size-4" /> Salvo
            </span>
          )}
          {erro && <span className="text-sm text-perigo">{erro}</span>}
        </div>
      </form>
    </Secao>
  )
}

/* ------------------------------------------------------------ Link público */

function LinkFormulario() {
  const url = modoDemo ? 'https://seu-dominio.com.br/' : `${location.origin}/`
  const [copiado, setCopiado] = useState(false)

  function copiar() {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2000)
      })
      .catch(() => {
        const campo = document.getElementById('link-formulario') as HTMLInputElement | null
        campo?.select()
      })
  }

  return (
    <Secao
      titulo="Link do formulário"
      descricao="Para quando o cliente preferir preencher no celular dele. A venda cai nas pendentes sem vendedor definido."
    >
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-apagado" />
          <input id="link-formulario" readOnly value={url} className={`${classeCampo} pl-9 font-mono text-sm`} onFocus={(e) => e.target.select()} />
        </div>
        <Botao variante="secundario" onClick={copiar} className="shrink-0">
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </Botao>
      </div>
    </Secao>
  )
}

/* ------------------------------------------------------------------ Equipe */

const PAPEIS = [
  { valor: 'vendedor', rotulo: 'Vendedor' },
  { valor: 'admin', rotulo: 'Admin' },
] as const

function Equipe() {
  const { perfil } = useAuth()
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)

  const carregar = useCallback(() => {
    api.listarPerfis().then(setPerfis).catch((e: Error) => setErro(e.message))
  }, [])
  useEffect(carregar, [carregar])

  async function acao(f: () => Promise<void>) {
    setErro(null)
    try {
      await f()
      carregar()
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  return (
    <Secao titulo="Equipe" descricao="Admin vê tudo e gerencia a equipe. Vendedor vê e valida vendas e trabalha os leads.">
      <ul className="divide-y divide-borda rounded-md border border-borda">
        {perfis.map((p) => {
          const eu = p.id === perfil?.id
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <div className="chanfro chanfro-sm grid size-9 shrink-0 place-items-center bg-cartao-2 font-display text-sm font-bold text-prata">
                {p.nome.trim()[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {p.nome} {eu && <span className="font-normal text-apagado">(você)</span>}
                </p>
                <p className="truncate text-xs text-apagado">{p.email}</p>
              </div>
              {eu ? (
                <Selo cor="neutro">{p.papel}</Selo>
              ) : removendo === p.id ? (
                <div className="flex gap-1.5">
                  <Botao variante="fantasma" className="px-3 py-2" onClick={() => setRemovendo(null)}>
                    Voltar
                  </Botao>
                  <Botao variante="perigo" className="px-3 py-2" onClick={() => void acao(() => api.removerUsuario(p.id)).then(() => setRemovendo(null))}>
                    Remover acesso
                  </Botao>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <select
                    id={`papel-${p.id}`}
                    aria-label={`Papel de ${p.nome}`}
                    value={p.papel}
                    onChange={(e) => void acao(() => api.alterarPapel(p.id, e.target.value as Papel))}
                    className="h-9 rounded-md border border-borda bg-cartao-2 px-2.5 text-sm outline-none focus:border-prata-2"
                  >
                    {PAPEIS.map((x) => (
                      <option key={x.valor} value={x.valor}>
                        {x.rotulo}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setRemovendo(p.id)}
                    className="grid size-9 place-items-center rounded-md text-apagado hover:bg-perigo/10 hover:text-perigo"
                    title="Remover acesso"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {erro && <p className="mt-3 text-sm text-perigo">{erro}</p>}
      <Convidar aoConvidar={carregar} />
    </Secao>
  )
}

function Convidar({ aoConvidar }: { aoConvidar: () => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<Papel>('vendedor')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setResultado(null)
    try {
      await api.convidarUsuario({ email: email.trim(), nome: nome.trim(), papel })
      setResultado({ ok: true, texto: `Convite enviado para ${email.trim()}. A pessoa recebe um link para criar a senha.` })
      setNome('')
      setEmail('')
      aoConvidar()
    } catch (e) {
      setResultado({ ok: false, texto: (e as Error).message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="mt-6 border-t border-borda pt-6">
      <h3 className="rotulo mb-4">Convidar por e-mail</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input id="convite-nome" className={classeCampo} placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input
          id="convite-email"
          className={classeCampo}
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Chips opcoes={PAPEIS} valor={papel} onChange={setPapel} />
        </div>
        <Botao type="submit" disabled={enviando || !email.includes('@')} className="ml-auto">
          <UserPlus className="size-4" /> {enviando ? 'Enviando…' : 'Enviar convite'}
        </Botao>
      </div>
      {resultado && <p className={`mt-3 text-sm ${resultado.ok ? 'text-ok' : 'text-perigo'}`}>{resultado.texto}</p>}
    </form>
  )
}
