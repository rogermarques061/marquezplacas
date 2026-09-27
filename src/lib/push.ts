// Notificações Web Push neste aparelho.
// iPhone: só funciona com o app instalado na Tela de Início (iOS 16.4+).
import { api } from './api'
import { modoDemo } from './supabase'

const CHAVE_VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type EstadoPush = 'carregando' | 'ativo' | 'inativo' | 'bloqueado' | 'instalar-ios' | 'sem-suporte' | 'sem-chave'

export function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function appInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

let demoAtivo = false

async function inscricaoAtual() {
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function estadoPush(): Promise<EstadoPush> {
  if (modoDemo) return demoAtivo ? 'ativo' : 'inativo'
  if (ehIOS() && !appInstalado()) return 'instalar-ios'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'sem-suporte'
  if (!CHAVE_VAPID) return 'sem-chave'
  if (Notification.permission === 'denied') return 'bloqueado'
  return (await inscricaoAtual()) ? 'ativo' : 'inativo'
}

function chaveParaBytes(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const bruto = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0))
}

export async function ativarPush(): Promise<EstadoPush> {
  if (modoDemo) {
    demoAtivo = true
    return 'ativo'
  }
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return permissao === 'denied' ? 'bloqueado' : 'inativo'
  const reg = await navigator.serviceWorker.ready
  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(CHAVE_VAPID!) }))
  await api.salvarInscricaoPush(inscricao.toJSON())
  await api.atualizarMeuPerfil({ notificacoes_ativas: true })
  return 'ativo'
}

export async function desativarPush(): Promise<EstadoPush> {
  if (modoDemo) {
    demoAtivo = false
    return 'inativo'
  }
  const inscricao = await inscricaoAtual()
  if (inscricao) {
    const restantes = await api.removerInscricaoPush(inscricao.endpoint)
    await inscricao.unsubscribe()
    if (restantes === 0) await api.atualizarMeuPerfil({ notificacoes_ativas: false })
  }
  return 'inativo'
}

/** Mostra uma notificação local, para conferir se está chegando neste aparelho. */
export async function notificacaoTeste() {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Opa! Mais uma plaquinha vendida.', {
    body: 'Valor de R$ 130,00 · teste',
    icon: '/pwa-192.png',
    badge: '/badge-96.png',
    tag: 'teste',
    data: { url: '/painel/vendas' },
  })
}
