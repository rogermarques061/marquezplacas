// Busca no TomTom (Search API): cadastro comercial de lojas, com telefone, e
// cota gratuita diária sem cartão — passou do limite, bloqueia em vez de cobrar.
import { distancia, telefoneBR, type Nicho } from './nichos.ts'
import type { NegocioGoogle as Negocio } from './google.ts'

/** O que pesquisar para cada nicho e o que o resultado precisa ter para valer. */
export const BUSCAS: Record<Nicho, { termos: string[]; confere: RegExp }> = {
  restaurante: {
    termos: ['restaurante', 'lanchonete'],
    confere: /restaur|lanchon|snack|fast.?food|pizz|hamburg|burger|churrasc|grill|comida|food|cafe|café|padaria|bakery|a[çc]a[íi]|sushi|pastel|bar\b/i,
  },
  nail: { termos: ['manicure', 'nail designer'], confere: /nail|unha|manicur|esmalt/i },
  estetica: { termos: ['estética', 'clínica de estética'], confere: /est[ée]tic|beauty|spa\b|depila|laser|skin|pele|massag/i },
  salao: { termos: ['salão de beleza', 'cabeleireiro'], confere: /sal[ãa]o|cabel|hair|beleza|beauty/i },
  sobrancelha: { termos: ['sobrancelha', 'design de sobrancelhas'], confere: /sobrancel|brow|c[íi]lios|lash/i },
  barbearia: { termos: ['barbearia'], confere: /barb/i },
  tatuador: { termos: ['tatuagem', 'tattoo'], confere: /tatu|tattoo|piercing|\bink\b/i },
  otica: { termos: ['ótica'], confere: /[óo]tica|optic|[óo]culos|eyewear/i },
}

export class ErroTomTom extends Error {}

interface Resultado {
  id: string
  poi?: { name?: string; phone?: string; url?: string; categories?: string[]; classifications?: { code?: string }[] }
  address?: { freeformAddress?: string; streetName?: string; streetNumber?: string; municipalitySubdivision?: string }
  position?: { lat: number; lon: number }
}

function falha(status: number): never {
  if (status === 401 || status === 403) {
    throw new ErroTomTom('O TomTom recusou a chave. Confira em Ajustes se ela foi colada certinho.')
  }
  if (status === 429) throw new ErroTomTom('Acabou a cota gratuita do TomTom por hoje; amanhã ela volta.')
  throw new ErroTomTom(`O TomTom não respondeu (${status}).`)
}

async function pesquisar(chave: string, termo: string, lat: number, lng: number, raio: number): Promise<Resultado[]> {
  const url = new URL(`https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(termo)}.json`)
  url.search = new URLSearchParams({
    key: chave,
    lat: String(lat),
    lon: String(lng),
    radius: String(raio),
    limit: '100',
    countrySet: 'BR',
    language: 'pt-BR',
  }).toString()
  const r = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!r.ok) {
    console.error('tomtom', termo, r.status, (await r.text().catch(() => '')).slice(0, 200))
    falha(r.status)
  }
  return (await r.json()).results ?? []
}

/** Endereço/bairro → ponto no mapa. */
export async function localizarNoTomTom(chave: string, endereco: string) {
  const url = new URL(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(endereco)}.json`)
  url.search = new URLSearchParams({ key: chave, countrySet: 'BR', language: 'pt-BR', limit: '1' }).toString()
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!r.ok) {
    console.error('tomtom localizar', r.status)
    return null
  }
  const [l] = ((await r.json()).results ?? []) as Resultado[]
  if (!l?.position) return null
  const nome = (l.address?.freeformAddress ?? endereco).split(',').slice(0, 3).join(',')
  return { lat: l.position.lat, lng: l.position.lon, nome }
}

/** Todas as pesquisas em paralelo; tira repetidos, o que não é do nicho e o que ficou fora do raio. */
export async function buscarNoTomTom(chave: string, lat: number, lng: number, raio: number, nichos: Nicho[]): Promise<Negocio[]> {
  const pedidos = nichos.flatMap((n) => BUSCAS[n].termos.map((t) => pesquisar(chave, t, lat, lng, raio).then((rs) => ({ n, rs }))))
  const resultados = await Promise.all(pedidos)
  const vistos = new Set<string>()
  const negocios: Negocio[] = []
  for (const { n, rs } of resultados) {
    for (const r of rs) {
      const nome = r.poi?.name
      if (!nome || !r.position || vistos.has(r.id)) continue
      const texto = [nome, ...(r.poi?.categories ?? []), ...(r.poi?.classifications ?? []).map((c) => c.code ?? '')].join(' ')
      if (!BUSCAS[n].confere.test(texto)) continue
      const ponto = { lat: r.position.lat, lng: r.position.lon }
      if (distancia({ lat, lng }, ponto) > raio) continue
      vistos.add(r.id)
      const a = r.address ?? {}
      const rua = [a.streetName, a.streetNumber].filter(Boolean).join(', ')
      const url = r.poi?.url ? (r.poi.url.startsWith('http') ? r.poi.url : `https://${r.poi.url}`) : null
      negocios.push({
        fonte_id: `tomtom/${r.id}`,
        nome,
        nicho: n,
        ...ponto,
        endereco: [rua, a.municipalitySubdivision].filter(Boolean).join(' · ') || a.freeformAddress || null,
        telefone: telefoneBR(r.poi?.phone),
        instagram: url?.match(/instagram\.com\/([A-Za-z0-9._]+)/)?.[1] ?? null,
        site: url && !url.includes('instagram.com') ? url : null,
      })
    }
  }
  return negocios
}
