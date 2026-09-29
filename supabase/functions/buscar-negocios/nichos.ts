// Classificação dos negócios do OpenStreetMap nos nichos da Marquez.
// As tags do OSM dizem o tipo da loja; o nome ajuda a separar, por exemplo,
// uma nail designer de uma clínica de estética (as duas são shop=beauty).

export type Nicho = 'restaurante' | 'nail' | 'estetica' | 'salao' | 'sobrancelha' | 'barbearia' | 'tatuador' | 'otica'

export const NICHOS: Nicho[] = ['restaurante', 'nail', 'estetica', 'salao', 'sobrancelha', 'barbearia', 'tatuador', 'otica']

/** Filtros do Overpass para cada nicho (vários nichos compartilham a mesma tag). */
const FILTROS: Record<Nicho, string[]> = {
  restaurante: ['["amenity"~"^(restaurant|fast_food|cafe|ice_cream|food_court)$"]'],
  nail: ['["shop"="beauty"]'],
  estetica: ['["shop"="beauty"]', '["shop"="massage"]'],
  sobrancelha: ['["shop"="beauty"]'],
  salao: ['["shop"="hairdresser"]'],
  barbearia: ['["shop"="hairdresser"]'],
  tatuador: ['["shop"="tattoo"]'],
  otica: ['["shop"="optician"]'],
}

export function consultaOverpass(lat: number, lng: number, raio: number, nichos: Nicho[]): string {
  const filtros = [...new Set(nichos.flatMap((n) => FILTROS[n]))]
  const partes = filtros.map((f) => `nwr(around:${raio},${lat},${lng})${f}["name"];`).join('')
  return `[out:json][timeout:25];(${partes});out center tags;`
}

const RE = {
  nail: /\b(nail|nails|unha|unhas|esmalt|manicure|pedicure)/i,
  sobrancelha: /(sobrancelh|brow|c[ií]lio|lash|micropigment|design de olhar)/i,
  barbearia: /(barbe|barber)/i,
  estetica: /(est[eé]tic|spa\b|depila|massag|pele|skin|beleza|beauty|laser)/i,
}

export function classificar(tags: Record<string, string>): Nicho | null {
  const nome = `${tags.name ?? ''} ${tags.brand ?? ''}`
  const amenity = tags.amenity
  const shop = tags.shop

  if (amenity && /^(restaurant|fast_food|cafe|ice_cream|food_court)$/.test(amenity)) return 'restaurante'
  if (shop === 'tattoo') return 'tatuador'
  if (shop === 'optician') return 'otica'
  if (shop === 'hairdresser') {
    if (tags.hairdresser === 'barber' || RE.barbearia.test(nome)) return 'barbearia'
    return 'salao'
  }
  if (shop === 'beauty' || shop === 'massage') {
    const tipo = tags.beauty ?? ''
    if (tipo.includes('nails') || RE.nail.test(nome)) return 'nail'
    if (/brow|lash/.test(tipo) || RE.sobrancelha.test(nome)) return 'sobrancelha'
    if (RE.barbearia.test(nome)) return 'barbearia'
    return 'estetica'
  }
  return null
}

export function soDigitos(v?: string) {
  return (v ?? '').replace(/\D/g, '')
}

/** Telefone brasileiro só com dígitos e DDD (tira +55). */
export function telefoneBR(...candidatos: (string | undefined)[]): string | null {
  for (const c of candidatos) {
    if (!c) continue
    for (const pedaco of c.split(/[;,/]/)) {
      let d = soDigitos(pedaco)
      if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
      if (d.startsWith('0') && d.length >= 11) d = d.slice(1)
      if (d.length === 10 || d.length === 11) return d
    }
  }
  return null
}

export function instagramDe(tags: Record<string, string>): string | null {
  const v = tags['contact:instagram'] ?? tags.instagram
  if (!v) return null
  const m = v.match(/instagram\.com\/([A-Za-z0-9._]+)/)
  return (m ? m[1] : v.replace(/^@/, '')).trim() || null
}

export function enderecoDe(tags: Record<string, string>): string | null {
  const rua = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ')
  const bairro = tags['addr:suburb'] ?? tags['addr:neighbourhood']
  const texto = [rua, bairro].filter(Boolean).join(' · ')
  return texto || null
}
