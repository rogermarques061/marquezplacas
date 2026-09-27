const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function formatarMoeda(v: number | null | undefined) {
  return moeda.format(v ?? 0)
}

export function formatarDataHora(iso: string) {
  return dataHora.format(new Date(iso))
}

export function tempoAtras(iso: string) {
  const seg = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(seg)
  if (abs < 60) return 'agora'
  if (abs < 3600) return relativo.format(Math.round(seg / 60), 'minute')
  if (abs < 86400) return relativo.format(Math.round(seg / 3600), 'hour')
  if (abs < 86400 * 7) return relativo.format(Math.round(seg / 86400), 'day')
  return dataHora.format(new Date(iso))
}

/** 11987654321 → (11) 98765-4321 */
export function formatarWhatsapp(d: string) {
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

export function linkWhatsapp(d: string, texto?: string) {
  const q = texto ? `?text=${encodeURIComponent(texto)}` : ''
  return `https://wa.me/55${d}${q}`
}
