// Dados de exemplo para o modo demonstração (sem Supabase). Vive só na memória da aba.
import type { Api } from './api'
import { plaquinhasTipo } from './constantes'
import { soDigitos } from './mascaras'
import type { EtapaLead, HistoricoLead, Lead, LeadCompleto, Perfil, Venda } from './tipos'
import type { Segmento, TemSite } from './constantes'

export const PERFIL_DEMO: Perfil = {
  id: 'demo-roger',
  nome: 'Roger',
  email: 'roger@marquez.digital',
  papel: 'admin',
  notificacoes_ativas: false,
}

let perfis: Perfil[] = [
  PERFIL_DEMO,
  { id: 'demo-ana', nome: 'Ana', email: 'ana@marquez.digital', papel: 'vendedor', notificacoes_ativas: true },
  { id: 'demo-lucas', nome: 'Lucas', email: 'lucas@marquez.digital', papel: 'vendedor', notificacoes_ativas: true },
]

/** Gerador pseudoaleatório com semente fixa: a demo mostra sempre os mesmos números. */
function sorteio(semente: number) {
  return () => {
    semente = (semente * 1664525 + 1013904223) % 4294967296
    return semente / 4294967296
  }
}

/** Nomes de negócio coerentes com o segmento, sem repetir. */
const NEGOCIOS: Record<Segmento, string[]> = {
  alimentacao: ['Açaí', 'Pizzaria', 'Doceria', 'Hamburgueria', 'Padaria', 'Café', 'Sorveteria', 'Restaurante'],
  beleza_estetica: ['Studio', 'Salão', 'Espaço', 'Estética', 'Nail Bar', 'Barbearia'],
  saude: ['Clínica', 'Consultório', 'Fisio', 'Odonto'],
  loja_varejo: ['Loja', 'Boutique', 'Ótica', 'Pet Shop', 'Mercadinho'],
  servicos: ['Oficina', 'Lava-Rápido', 'Assistência', 'Chaveiro'],
  outro: ['Academia', 'Escola', 'Ateliê', 'Floricultura'],
}
const SOBRENOMES = ['da Praça', 'Bom Sabor', 'do Centro', 'Mel', 'Vida', 'Bella', 'Premium', 'da Vila', 'Real', 'Aurora', 'Nova Era', 'do Bairro', 'Estrela', 'Canto']
const SEGS: Segmento[] = ['alimentacao', 'alimentacao', 'beleza_estetica', 'beleza_estetica', 'saude', 'loja_varejo', 'servicos', 'outro']
const usados = new Set<string>()
function nomeNegocio(seg: Segmento, r: () => number) {
  for (let i = 0; i < 50; i++) {
    const tipos = NEGOCIOS[seg]
    const nome = `${tipos[Math.floor(r() * tipos.length)]} ${SOBRENOMES[Math.floor(r() * SOBRENOMES.length)]}`
    if (!usados.has(nome)) {
      usados.add(nome)
      return nome
    }
  }
  return `${NEGOCIOS[seg][0]} ${usados.size}`
}
const SITES: TemSite[] = ['nao_tem', 'nao_tem', 'sim_desatualizado', 'sim_funciona']

/** Vendas validadas do mês atual e do anterior, espalhadas pelos dias. */
function gerarHistorico(): Venda[] {
  const r = sorteio(42)
  const hoje = new Date()
  const vendas: Venda[] = []
  for (let diasAtras = 1; diasAtras <= 45; diasAtras++) {
    const qtdNoDia = Math.floor(r() * 3.2)
    for (let i = 0; i < qtdNoDia; i++) {
      const d = new Date(hoje)
      d.setDate(hoje.getDate() - diasAtras)
      d.setHours(9 + Math.floor(r() * 10), Math.floor(r() * 60))
      const kit = r() < 0.55
      const quantidade = r() < 0.8 ? 1 : 2
      const preco = (kit ? 130 : 80) * quantidade
      const segmento = SEGS[Math.floor(r() * SEGS.length)]
      vendas.push(
        base({
          id: `h${vendas.length}`,
          nome: nomeNegocio(segmento, r),
          whatsapp: `119${String(10000000 + Math.floor(r() * 89999999))}`,
          segmento,
          tem_site: SITES[Math.floor(r() * SITES.length)],
          como_encontram: 'indicacao',
          tipo_venda: kit ? 'kit' : 'unidade',
          quantidade,
          valor_total: r() < 0.1 ? preco - 10 : preco,
          forma_pagamento: r() < 0.6 ? 'pix' : r() < 0.5 ? 'cartao' : 'dinheiro',
          status_pagamento: r() < 0.9 ? 'pago' : 'aguardando',
          status_venda: 'validada',
          vendedor_id: perfis[r() < 0.45 ? 0 : r() < 0.6 ? 1 : 2].id,
          created_at: d.toISOString(),
          validada_em: d.toISOString(),
        }),
      )
    }
  }
  return vendas
}

/** Leads das vendas validadas, alguns já avançados no funil. */
function gerarLeads(vendas: Venda[]): Lead[] {
  const r = sorteio(7)
  const etapas: EtapaLead[] = ['comprou_plaquinha', 'comprou_plaquinha', 'reuniao_agendada', 'reuniao_realizada', 'proposta_enviada', 'fechou_site', 'manutencao_ativa', 'perdido']
  return vendas
    .filter((v) => v.status_venda === 'validada')
    .map((v, i) => {
      const etapa = etapas[Math.floor(r() * etapas.length)]
      const fechou = etapa === 'fechou_site' || etapa === 'manutencao_ativa'
      return {
        id: `l${i}`,
        venda_id: v.id,
        etapa,
        temperatura: v.tem_site === 'nao_tem' ? 'quente' : v.tem_site === 'sim_funciona' ? 'frio' : 'morno',
        responsavel_id: v.vendedor_id,
        data_reuniao:
          etapa === 'reuniao_agendada'
            ? new Date(Date.now() + (1 + Math.floor(r() * 5)) * 86400_000 + 14 * 3600_000).toISOString()
            : null,
        valor_site: 647,
        valor_manutencao: 97,
        manutencao_ativa: etapa === 'manutencao_ativa',
        site_fechado_em: fechou ? new Date(Math.min(Date.now() - 3600_000, Math.max(new Date(v.validada_em!).getTime() + 5 * 86400_000, Date.now() - 20 * 86400_000))).toISOString() : null,
        manutencao_desde: null,
        anotacoes: etapa === 'proposta_enviada' ? 'Mandei a proposta pelo WhatsApp. Ficou de responder essa semana.' : null,
        created_at: v.validada_em!,
      }
    })
}

function horasAtras(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString()
}

function base(v: Partial<Venda> & Pick<Venda, 'id' | 'nome' | 'whatsapp'>): Venda {
  const venda: Venda = {
    origem: 'formulario',
    instagram: null,
    segmento: null,
    tem_site: null,
    como_encontram: null,
    aceite_contato: true,
    tipo_venda: null,
    quantidade: null,
    total_plaquinhas: null,
    valor_total: null,
    forma_pagamento: null,
    status_pagamento: 'aguardando',
    status_venda: 'pendente',
    vendedor_id: null,
    observacoes: null,
    created_at: horasAtras(0),
    validada_em: null,
    cancelada_em: null,
    ...v,
  }
  venda.total_plaquinhas = plaquinhasTipo(venda.tipo_venda, venda.quantidade) || null
  return venda
}

export function criarDemo(): Api {
  let vendas: Venda[] = [
    base({ id: 'd1', nome: 'Juliana Rocha', whatsapp: '11987650001', instagram: 'ju.nailsdesign', segmento: 'beleza_estetica', tem_site: 'nao_tem', como_encontram: 'instagram', created_at: horasAtras(0.2) }),
    base({ id: 'd2', nome: 'Pizzaria do Beto', whatsapp: '11976540002', instagram: 'pizzariadobeto', segmento: 'alimentacao', tem_site: 'sim_desatualizado', como_encontram: 'indicacao', created_at: horasAtras(1.5) }),
    base({ id: 'd3', nome: 'Clínica Sorriso', whatsapp: '1133224455', segmento: 'saude', tem_site: 'sim_funciona', como_encontram: 'google', created_at: horasAtras(5) }),
    base({ id: 'd4', nome: 'Barbearia Navalha', whatsapp: '11912340004', instagram: 'navalhabarber', segmento: 'servicos', tem_site: 'nao_tem', como_encontram: 'passam_na_frente', tipo_venda: 'kit', quantidade: 1, valor_total: 130, forma_pagamento: 'pix', status_pagamento: 'pago', status_venda: 'validada', vendedor_id: 'demo-roger', created_at: horasAtras(26), validada_em: horasAtras(25) }),
    ...gerarHistorico(),
    base({ id: 'd5', nome: 'Loja Flor de Lis', whatsapp: '11955550005', segmento: 'loja_varejo', tem_site: 'nao_tem', como_encontram: 'instagram', tipo_venda: 'unidade', quantidade: 2, valor_total: 150, forma_pagamento: 'cartao', status_pagamento: 'pago', status_venda: 'validada', vendedor_id: 'demo-ana', observacoes: 'Desconto de R$10 por levar 2.', created_at: horasAtras(50), validada_em: horasAtras(49) }),
  ]
  let leads = gerarLeads(vendas)
  let historico: HistoricoLead[] = leads.flatMap((l) => {
    const h: HistoricoLead[] = [
      { id: `hi-${l.id}`, lead_id: l.id, etapa_anterior: null, etapa_nova: 'comprou_plaquinha', usuario_id: l.responsavel_id, created_at: l.created_at },
    ]
    if (l.etapa !== 'comprou_plaquinha')
      h.push({ id: `hj-${l.id}`, lead_id: l.id, etapa_anterior: 'comprou_plaquinha', etapa_nova: l.etapa, usuario_id: l.responsavel_id, created_at: l.site_fechado_em ?? new Date(new Date(l.created_at).getTime() + 2 * 86400_000).toISOString() })
    return h
  })

  function criarLead(v: Venda) {
    if (leads.some((l) => l.venda_id === v.id)) return
    const lead: Lead = {
      ...gerarLeads([v])[0],
      id: crypto.randomUUID(),
      etapa: 'comprou_plaquinha',
      manutencao_ativa: false,
      site_fechado_em: null,
      data_reuniao: null,
      anotacoes: null,
      created_at: new Date().toISOString(),
    }
    leads = [lead, ...leads]
    historico = [{ id: crypto.randomUUID(), lead_id: lead.id, etapa_anterior: null, etapa_nova: 'comprou_plaquinha', usuario_id: PERFIL_DEMO.id, created_at: lead.created_at }, ...historico]
  }
  const ouvintes = new Set<() => void>()
  const avisar = () => ouvintes.forEach((f) => f())
  const espera = () => new Promise((ok) => setTimeout(ok, 250))

  function aplicar(v: Venda, dados: Partial<Venda>): Venda {
    const nova = { ...v, ...dados }
    if (dados.status_venda && dados.status_venda !== v.status_venda) {
      nova.validada_em = dados.status_venda === 'validada' ? new Date().toISOString() : null
      nova.cancelada_em = dados.status_venda === 'cancelada' ? new Date().toISOString() : null
    }
    nova.total_plaquinhas = plaquinhasTipo(nova.tipo_venda, nova.quantidade) || null
    return nova
  }

  return {
    async enviarFormulario(d) {
      await espera()
      const id = crypto.randomUUID()
      vendas = [
        base({
          id,
          nome: d.nome.trim(),
          whatsapp: soDigitos(d.whatsapp),
          instagram: d.instagram?.replace(/^@/, '') || null,
          segmento: d.segmento,
          tem_site: d.temSite,
          como_encontram: d.comoEncontram,
          vendedor_id: PERFIL_DEMO.id, // gerado pelo painel: fica com quem abriu
        }),
        ...vendas,
      ]
      avisar()
      return id
    },
    async listarVendas() {
      await espera()
      return [...vendas]
    },
    async obterVenda(id) {
      await espera()
      return vendas.find((v) => v.id === id) ?? null
    },
    async atualizarVenda(id, dados) {
      await espera()
      const atual = vendas.find((v) => v.id === id)
      if (!atual) throw new Error('Venda não encontrada')
      const nova = aplicar(atual, dados)
      vendas = vendas.map((v) => (v.id === id ? nova : v))
      if (nova.status_venda === 'validada') criarLead(nova)
      if (nova.status_venda === 'cancelada') leads = leads.filter((l) => l.venda_id !== id || l.etapa !== 'comprou_plaquinha')
      avisar()
      return nova
    },
    async criarVenda(dados) {
      await espera()
      const rascunho = base({ id: crypto.randomUUID(), ...dados, origem: 'manual', status_venda: 'pendente' })
      const nova = aplicar(rascunho, { status_venda: dados.status_venda ?? 'pendente' })
      vendas = [nova, ...vendas]
      if (nova.status_venda === 'validada') criarLead(nova)
      avisar()
      return nova
    },
    async listarPerfis() {
      return [...perfis]
    },
    async listarLeads() {
      await espera()
      return leads.flatMap((l): LeadCompleto[] => {
        const v = vendas.find((x) => x.id === l.venda_id)
        return v ? [{ ...l, venda: { nome: v.nome, whatsapp: v.whatsapp, instagram: v.instagram, segmento: v.segmento, tem_site: v.tem_site, valor_total: v.valor_total, validada_em: v.validada_em } }] : []
      })
    },
    async atualizarLead(id, dados) {
      await espera()
      leads = leads.map((l) => {
        if (l.id !== id) return l
        const novo = { ...l, ...dados }
        // mesmas regras do trigger leads_before_update
        if (dados.etapa && dados.etapa !== l.etapa) {
          historico = [{ id: crypto.randomUUID(), lead_id: id, etapa_anterior: l.etapa, etapa_nova: dados.etapa, usuario_id: PERFIL_DEMO.id, created_at: new Date().toISOString() }, ...historico]
          if ((dados.etapa === 'fechou_site' || dados.etapa === 'manutencao_ativa') && !novo.site_fechado_em) novo.site_fechado_em = new Date().toISOString()
          if (dados.etapa === 'manutencao_ativa') novo.manutencao_ativa = true
        }
        if (novo.manutencao_ativa && !l.manutencao_ativa) novo.manutencao_desde = new Date().toISOString()
        if (!novo.manutencao_ativa) novo.manutencao_desde = null
        return novo
      })
      avisar()
    },
    async listarHistorico(leadId) {
      return historico.filter((h) => h.lead_id === leadId)
    },
    ouvirLeads(aoMudar) {
      ouvintes.add(aoMudar)
      return () => ouvintes.delete(aoMudar)
    },
    async atualizarMeuPerfil(dados) {
      await espera()
      Object.assign(PERFIL_DEMO, dados)
      perfis = perfis.map((p) => (p.id === PERFIL_DEMO.id ? { ...p, ...dados } : p))
    },
    async alterarPapel(id, papel) {
      await espera()
      perfis = perfis.map((p) => (p.id === id ? { ...p, papel } : p))
    },
    async convidarUsuario({ email, nome, papel }) {
      await espera()
      if (perfis.some((p) => p.email === email)) throw new Error('Esse e-mail já tem acesso.')
      perfis = [...perfis, { id: crypto.randomUUID(), nome: nome || email.split('@')[0], email, papel, notificacoes_ativas: false }]
    },
    async removerUsuario(id) {
      await espera()
      perfis = perfis.filter((p) => p.id !== id)
    },
    async salvarInscricaoPush() {},
    async removerInscricaoPush() {
      return 0
    },
    ouvirVendas(aoMudar) {
      ouvintes.add(aoMudar)
      return () => ouvintes.delete(aoMudar)
    },
  }
}
