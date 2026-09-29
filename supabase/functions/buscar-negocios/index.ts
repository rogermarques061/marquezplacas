// Busca negócios dos nichos da Marquez perto de um endereço ou coordenada,
// usando OpenStreetMap (Photon/Nominatim para o endereço, Overpass para as lojas).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { classificar, consultaOverpass, enderecoDe, instagramDe, NICHOS, telefoneBR, type Nicho } from './nichos.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const AGENTE = 'MarquezPlacas/1.0 (prospeccao; contato@marquez.digital)'
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

/** fetch com limite de tempo: um serviço lento não pode travar a busca. */
function buscarCom(url: URL | string, ms: number) {
  return fetch(url, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(ms) })
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

type Lugar = { lat: number; lng: number; nome: string }

/** Photon (komoot) primeiro; Nominatim de reserva. Os dois usam dados do OpenStreetMap. */
async function geocodificar(endereco: string): Promise<Lugar | null> {
  try {
    const url = new URL('https://photon.komoot.io/api/')
    // bbox do Brasil, para "Centro" não cair em outro país
    url.search = new URLSearchParams({ q: endereco, limit: '1', bbox: '-74.0,-34.0,-34.0,5.5' }).toString()
    const r = await buscarCom(url, 8000)
    if (r.ok) {
      const [f] = (await r.json()).features ?? []
      if (!f) return null
      const p = f.properties ?? {}
      const nome = [p.name, p.district ?? p.city, p.state].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')
      return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], nome: nome || endereco }
    }
    console.error('photon', r.status)
  } catch (e) {
    console.error('photon', e)
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({ q: endereco, format: 'json', limit: '1', countrycodes: 'br', 'accept-language': 'pt-BR' }).toString()
  const r = await buscarCom(url, 8000)
  if (!r.ok) {
    console.error('nominatim', r.status)
    throw new Error('Não foi possível localizar o endereço agora. Tente de novo em instantes.')
  }
  const [lugar] = await r.json()
  if (!lugar) return null
  return { lat: Number(lugar.lat), lng: Number(lugar.lon), nome: String(lugar.display_name).split(',').slice(0, 3).join(',') }
}

async function overpass(consulta: string) {
  let ultimoErro = ''
  for (const base of OVERPASS) {
    try {
      const inicio = Date.now()
      const r = await buscarCom(`${base}?data=${encodeURIComponent(consulta)}`, 20000)
      if (r.ok) {
        const dados = await r.json()
        console.log('overpass ok', base, `${Date.now() - inicio}ms`)
        return dados
      }
      ultimoErro = `${r.status}`
      console.error('overpass', base, r.status)
    } catch (e) {
      ultimoErro = (e as Error).name === 'TimeoutError' ? 'demorou demais' : (e as Error).message
      console.error('overpass', base, ultimoErro)
    }
  }
  throw new Error(`O serviço de mapas está ocupado (${ultimoErro}). Tente de novo em instantes.`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Só quem tem acesso ao painel
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: membro } = await supabase.rpc('is_membro')
  if (!membro) return resposta({ erro: 'Faça login novamente.' }, 401)

  try {
    const corpo = await req.json()
    const raio = Math.min(Math.max(Number(corpo.raio) || 1500, 300), 5000)
    const nichos: Nicho[] = (Array.isArray(corpo.nichos) ? corpo.nichos : NICHOS).filter((n: string) => NICHOS.includes(n as Nicho))
    if (!nichos.length) return resposta({ erro: 'Escolha pelo menos um nicho.' }, 400)

    let centro: Lugar | null = null
    if (Number.isFinite(corpo.lat) && Number.isFinite(corpo.lng)) {
      centro = { lat: corpo.lat, lng: corpo.lng, nome: 'Sua localização' }
    } else if (typeof corpo.endereco === 'string' && corpo.endereco.trim()) {
      const inicio = Date.now()
      centro = await geocodificar(corpo.endereco.trim())
      console.log('endereco', `${Date.now() - inicio}ms`)
      if (!centro) return resposta({ erro: 'Endereço não encontrado. Tente bairro + cidade, ex.: "Centro, Niterói".' }, 404)
    } else {
      return resposta({ erro: 'Informe um endereço ou use sua localização.' }, 400)
    }

    const dados = await overpass(consultaOverpass(centro.lat, centro.lng, raio, nichos))
    const vistos = new Set<string>()
    const negocios = []
    for (const e of dados.elements ?? []) {
      const tags = e.tags ?? {}
      const nicho = classificar(tags)
      if (!nicho || !nichos.includes(nicho) || !tags.name) continue
      const lat = e.lat ?? e.center?.lat
      const lng = e.lon ?? e.center?.lon
      if (lat == null || lng == null) continue
      const chave = `${tags.name.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      negocios.push({
        fonte_id: `${e.type}/${e.id}`,
        nome: tags.name,
        nicho,
        lat,
        lng,
        endereco: enderecoDe(tags),
        telefone: telefoneBR(tags['contact:whatsapp'], tags.phone, tags['contact:phone'], tags['contact:mobile']),
        instagram: instagramDe(tags),
        site: tags.website ?? tags['contact:website'] ?? null,
      })
    }

    return resposta({ centro, raio, negocios })
  } catch (e) {
    return resposta({ erro: (e as Error).message }, 502)
  }
})
