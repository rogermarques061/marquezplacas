import { SEGMENTOS, type Segmento } from './constantes'
import type { Lead, Perfil, Venda } from './tipos'

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function mesmoMes(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
const soma = (vs: Venda[]) => vs.reduce((t, v) => t + (v.valor_total ?? 0), 0)

export interface Metricas {
  faturamentoHoje: number
  faturamentoMes: number
  faturamentoMesAnteriorAteHoje: number
  vendasHoje: number
  vendasMes: number
  plaquinhasTotal: number
  pendentes: number
  aReceber: number
  ticketMedio: number
  porTipo: { unidade: { vendas: number; valor: number }; kit: { vendas: number; valor: number } }
  porDia: { dia: number; rotulo: string; valor: number; vendas: number; futuro: boolean }[]
  porSegmento: { segmento: Segmento | 'sem'; rotulo: string; vendas: number; valor: number }[]
  ranking: { id: string; nome: string; vendas: number; valor: number }[]
  sitesMes: number
  receitaSitesMes: number
  manutencaoAtivos: number
  mrr: number
}

/** Tudo do dashboard a partir das vendas/leads. Só vendas validadas contam como faturamento. */
export function calcularMetricas(vendas: Venda[], leads: Lead[], perfis: Perfil[], agora = new Date()): Metricas {
  const validadas = vendas.filter((v) => v.status_venda === 'validada' && v.validada_em)
  const data = (v: Venda) => new Date(v.validada_em!)
  const hoje = validadas.filter((v) => mesmoDia(data(v), agora))
  const mes = validadas.filter((v) => mesmoMes(data(v), agora))

  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
  const mesmoPontoMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, agora.getDate(), agora.getHours(), agora.getMinutes())
  const mesAnteriorAteHoje = validadas.filter((v) => data(v) >= inicioMesAnterior && data(v) <= mesmoPontoMesAnterior)

  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const porDia = Array.from({ length: diasNoMes }, (_, i) => {
    const dia = i + 1
    const doDia = mes.filter((v) => data(v).getDate() === dia)
    return {
      dia,
      rotulo: `${String(dia).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}`,
      valor: soma(doDia),
      vendas: doDia.length,
      futuro: dia > agora.getDate(),
    }
  })

  const segmentos = new Map<Segmento | 'sem', { vendas: number; valor: number }>()
  for (const v of mes) {
    const k = v.segmento ?? 'sem'
    const s = segmentos.get(k) ?? { vendas: 0, valor: 0 }
    segmentos.set(k, { vendas: s.vendas + 1, valor: s.valor + (v.valor_total ?? 0) })
  }
  const porSegmento = [...segmentos.entries()]
    .map(([segmento, s]) => ({
      segmento,
      rotulo: SEGMENTOS.find((x) => x.valor === segmento)?.rotulo ?? 'Não informado',
      ...s,
    }))
    .sort((a, b) => b.valor - a.valor)

  const ranking = perfis
    .map((p) => {
      const dele = mes.filter((v) => v.vendedor_id === p.id)
      return { id: p.id, nome: p.nome, vendas: dele.length, valor: soma(dele) }
    })
    .filter((r) => r.vendas > 0)
    .sort((a, b) => b.valor - a.valor)

  const tipo = (t: 'unidade' | 'kit') => {
    const vs = mes.filter((v) => v.tipo_venda === t)
    return { vendas: vs.length, valor: soma(vs) }
  }

  const sitesMes = leads.filter((l) => l.site_fechado_em && mesmoMes(new Date(l.site_fechado_em), agora))
  const ativos = leads.filter((l) => l.manutencao_ativa)

  return {
    faturamentoHoje: soma(hoje),
    faturamentoMes: soma(mes),
    faturamentoMesAnteriorAteHoje: soma(mesAnteriorAteHoje),
    vendasHoje: hoje.length,
    vendasMes: mes.length,
    plaquinhasTotal: validadas.reduce((t, v) => t + (v.total_plaquinhas ?? 0), 0),
    pendentes: vendas.filter((v) => v.status_venda === 'pendente').length,
    aReceber: soma(validadas.filter((v) => v.status_pagamento === 'aguardando')),
    ticketMedio: mes.length ? soma(mes) / mes.length : 0,
    porTipo: { unidade: tipo('unidade'), kit: tipo('kit') },
    porDia,
    porSegmento,
    ranking,
    sitesMes: sitesMes.length,
    receitaSitesMes: sitesMes.reduce((t, l) => t + l.valor_site, 0),
    manutencaoAtivos: ativos.length,
    mrr: ativos.reduce((t, l) => t + l.valor_manutencao, 0),
  }
}
