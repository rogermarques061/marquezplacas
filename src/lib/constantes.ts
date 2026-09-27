// Valores dos enums do banco + rótulos exibidos na interface.

export const PRECO_UNIDADE = 80
export const PRECO_KIT = 130
export const PRECO_SITE = 647
export const PRECO_MANUTENCAO = 97

export type Segmento = 'alimentacao' | 'beleza_estetica' | 'saude' | 'loja_varejo' | 'servicos' | 'outro'
export type TemSite = 'sim_funciona' | 'sim_desatualizado' | 'nao_tem'
export type ComoEncontram = 'indicacao' | 'instagram' | 'google' | 'passam_na_frente' | 'outro'

export interface Opcao<T extends string> {
  valor: T
  rotulo: string
  emoji: string
}

export const SEGMENTOS: Opcao<Segmento>[] = [
  { valor: 'alimentacao', rotulo: 'Alimentação', emoji: '🍔' },
  { valor: 'beleza_estetica', rotulo: 'Beleza e Estética', emoji: '💅' },
  { valor: 'saude', rotulo: 'Saúde', emoji: '🩺' },
  { valor: 'loja_varejo', rotulo: 'Loja e Varejo', emoji: '🛍️' },
  { valor: 'servicos', rotulo: 'Serviços', emoji: '🛠️' },
  { valor: 'outro', rotulo: 'Outro', emoji: '✨' },
]

export const OPCOES_TEM_SITE: Opcao<TemSite>[] = [
  { valor: 'sim_funciona', rotulo: 'Sim, e funciona bem', emoji: '✅' },
  { valor: 'sim_desatualizado', rotulo: 'Sim, mas tá desatualizado', emoji: '🕸️' },
  { valor: 'nao_tem', rotulo: 'Não tenho', emoji: '🚫' },
]

export const OPCOES_COMO_ENCONTRAM: Opcao<ComoEncontram>[] = [
  { valor: 'indicacao', rotulo: 'Indicação', emoji: '🗣️' },
  { valor: 'instagram', rotulo: 'Instagram', emoji: '📸' },
  { valor: 'google', rotulo: 'Google', emoji: '🔎' },
  { valor: 'passam_na_frente', rotulo: 'Passam na frente', emoji: '🚶' },
  { valor: 'outro', rotulo: 'Outro', emoji: '✨' },
]

export function rotulo<T extends string>(opcoes: Opcao<T>[], valor: T | null | undefined) {
  return opcoes.find((o) => o.valor === valor)?.rotulo ?? '—'
}
