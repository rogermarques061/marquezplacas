import type { ComoEncontram, Segmento, TemSite } from './constantes'

export type Papel = 'admin' | 'vendedor'
export type TipoVenda = 'unidade' | 'kit'
export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao' | 'outro'
export type StatusPagamento = 'pago' | 'aguardando'
export type StatusVenda = 'pendente' | 'validada' | 'cancelada'

export interface Perfil {
  id: string
  nome: string
  email: string | null
  papel: Papel
  notificacoes_ativas: boolean
}

export interface Venda {
  id: string
  origem: 'formulario' | 'manual'
  nome: string
  whatsapp: string
  instagram: string | null
  segmento: Segmento | null
  tem_site: TemSite | null
  como_encontram: ComoEncontram | null
  aceite_contato: boolean
  tipo_venda: TipoVenda | null
  quantidade: number | null
  total_plaquinhas: number | null
  valor_total: number | null
  forma_pagamento: FormaPagamento | null
  status_pagamento: StatusPagamento
  status_venda: StatusVenda
  vendedor_id: string | null
  observacoes: string | null
  created_at: string
  validada_em: string | null
  cancelada_em: string | null
}

/** Campos que o painel pode gravar (total_plaquinhas e datas são do banco). */
export type VendaEditavel = Partial<
  Omit<Venda, 'id' | 'total_plaquinhas' | 'created_at' | 'validada_em' | 'cancelada_em'>
>

export interface DadosFormulario {
  nome: string
  whatsapp: string
  instagram: string | null
  segmento: Segmento | null
  temSite: TemSite | null
  comoEncontram: ComoEncontram | null
  aceite: boolean
}
