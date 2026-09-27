// Dados de exemplo para o modo demonstração (sem Supabase). Vive só na memória da aba.
import type { Api } from './api'
import { plaquinhasTipo } from './constantes'
import { soDigitos } from './mascaras'
import type { Perfil, Venda } from './tipos'

export const PERFIL_DEMO: Perfil = {
  id: 'demo-roger',
  nome: 'Roger',
  email: 'roger@marquez.digital',
  papel: 'admin',
  notificacoes_ativas: false,
}

const perfis: Perfil[] = [
  PERFIL_DEMO,
  { id: 'demo-ana', nome: 'Ana', email: 'ana@marquez.digital', papel: 'vendedor', notificacoes_ativas: true },
]

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
    base({ id: 'd5', nome: 'Loja Flor de Lis', whatsapp: '11955550005', segmento: 'loja_varejo', tem_site: 'nao_tem', como_encontram: 'instagram', tipo_venda: 'unidade', quantidade: 2, valor_total: 150, forma_pagamento: 'cartao', status_pagamento: 'pago', status_venda: 'validada', vendedor_id: 'demo-ana', observacoes: 'Desconto de R$10 por levar 2.', created_at: horasAtras(50), validada_em: horasAtras(49) }),
  ]
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
      vendas = [
        base({
          id: crypto.randomUUID(),
          nome: d.nome.trim(),
          whatsapp: soDigitos(d.whatsapp),
          instagram: d.instagram?.replace(/^@/, '') || null,
          segmento: d.segmento,
          tem_site: d.temSite,
          como_encontram: d.comoEncontram,
        }),
        ...vendas,
      ]
      avisar()
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
      avisar()
      return nova
    },
    async criarVenda(dados) {
      await espera()
      const rascunho = base({ id: crypto.randomUUID(), ...dados, origem: 'manual', status_venda: 'pendente' })
      const nova = aplicar(rascunho, { status_venda: dados.status_venda ?? 'pendente' })
      vendas = [nova, ...vendas]
      avisar()
      return nova
    },
    async listarPerfis() {
      return perfis
    },
    ouvirVendas(aoMudar) {
      ouvintes.add(aoMudar)
      return () => ouvintes.delete(aoMudar)
    },
  }
}
