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
}

export const SEGMENTOS: Opcao<Segmento>[] = [
  { valor: 'alimentacao', rotulo: 'Alimentação' },
  { valor: 'beleza_estetica', rotulo: 'Beleza e Estética' },
  { valor: 'saude', rotulo: 'Saúde' },
  { valor: 'loja_varejo', rotulo: 'Loja e Varejo' },
  { valor: 'servicos', rotulo: 'Serviços' },
  { valor: 'outro', rotulo: 'Outro' },
]

export const OPCOES_TEM_SITE: Opcao<TemSite>[] = [
  { valor: 'sim_funciona', rotulo: 'Sim, e funciona bem' },
  { valor: 'sim_desatualizado', rotulo: 'Sim, mas tá desatualizado' },
  { valor: 'nao_tem', rotulo: 'Não tenho' },
]

export const OPCOES_COMO_ENCONTRAM: Opcao<ComoEncontram>[] = [
  { valor: 'indicacao', rotulo: 'Indicação' },
  { valor: 'instagram', rotulo: 'Instagram' },
  { valor: 'google', rotulo: 'Google' },
  { valor: 'passam_na_frente', rotulo: 'Passam na frente' },
  { valor: 'outro', rotulo: 'Outro' },
]

export function rotulo<T extends string>(opcoes: Opcao<T>[], valor: T | null | undefined) {
  return opcoes.find((o) => o.valor === valor)?.rotulo ?? '—'
}

export const TIPOS_VENDA = [
  { valor: 'unidade', rotulo: 'Unidade', preco: PRECO_UNIDADE, plaquinhas: 1 },
  { valor: 'kit', rotulo: 'Kit com 2', preco: PRECO_KIT, plaquinhas: 2 },
] as const

export const FORMAS_PAGAMENTO = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'cartao', rotulo: 'Cartão' },
  { valor: 'outro', rotulo: 'Outro' },
] as const

export const STATUS_PAGAMENTO = [
  { valor: 'pago', rotulo: 'Pago' },
  { valor: 'aguardando', rotulo: 'Aguardando' },
] as const

export function precoTipo(tipo: 'unidade' | 'kit' | null) {
  return tipo === 'kit' ? PRECO_KIT : tipo === 'unidade' ? PRECO_UNIDADE : 0
}

export function plaquinhasTipo(tipo: 'unidade' | 'kit' | null, quantidade: number | null) {
  if (!tipo || !quantidade) return 0
  return quantidade * (tipo === 'kit' ? 2 : 1)
}

export type Etapa =
  | 'comprou_plaquinha'
  | 'reuniao_agendada'
  | 'reuniao_realizada'
  | 'proposta_enviada'
  | 'fechou_site'
  | 'manutencao_ativa'
  | 'perdido'

/** Etapas do funil, na ordem das colunas do Kanban. `cor` = bolinha da coluna. */
export const ETAPAS: { valor: Etapa; rotulo: string; cor: string }[] = [
  { valor: 'comprou_plaquinha', rotulo: 'Comprou plaquinha', cor: '#6c697a' },
  { valor: 'reuniao_agendada', rotulo: 'Reunião agendada', cor: '#8f8aa6' },
  { valor: 'reuniao_realizada', rotulo: 'Reunião realizada', cor: '#b3aed0' },
  { valor: 'proposta_enviada', rotulo: 'Proposta enviada', cor: '#9085e9' },
  { valor: 'fechou_site', rotulo: 'Fechou site', cor: '#5fbf8f' },
  { valor: 'manutencao_ativa', rotulo: 'Manutenção ativa', cor: '#199e70' },
  { valor: 'perdido', rotulo: 'Perdido', cor: '#e66767' },
]

export type Temperatura = 'quente' | 'morno' | 'frio'

export const TEMPERATURAS: { valor: Temperatura; rotulo: string }[] = [
  { valor: 'quente', rotulo: 'Quente' },
  { valor: 'morno', rotulo: 'Morno' },
  { valor: 'frio', rotulo: 'Frio' },
]
