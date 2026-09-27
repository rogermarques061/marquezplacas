import { criarDemo } from './demo'
import { soDigitos } from './mascaras'
import { modoDemo, supabase } from './supabase'
import type { DadosFormulario, Lead, Perfil, Venda, VendaEditavel } from './tipos'

/** Tudo que as telas precisam do backend. No modo demonstração roda em memória. */
export interface Api {
  enviarFormulario(d: DadosFormulario): Promise<void>
  listarVendas(): Promise<Venda[]>
  obterVenda(id: string): Promise<Venda | null>
  atualizarVenda(id: string, dados: VendaEditavel): Promise<Venda>
  criarVenda(dados: VendaEditavel & { nome: string; whatsapp: string }): Promise<Venda>
  listarPerfis(): Promise<Perfil[]>
  listarLeads(): Promise<Lead[]>
  /** Avisa quando qualquer venda muda (novo formulário, validação etc.). Retorna o "desligar". */
  ouvirVendas(aoMudar: () => void): () => void
}

function falhou(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message)
}

/** numeric(10,2) chega como string; o app trabalha com number. */
function normalizarVenda(v: Venda): Venda {
  return { ...v, valor_total: v.valor_total == null ? null : Number(v.valor_total) }
}

const apiSupabase: Api = {
  async enviarFormulario(d) {
    const { error } = await supabase.rpc('enviar_formulario', {
      p_nome: d.nome.trim(),
      p_whatsapp: soDigitos(d.whatsapp),
      p_instagram: d.instagram || null,
      p_segmento: d.segmento,
      p_tem_site: d.temSite,
      p_como_encontram: d.comoEncontram,
      p_aceite_contato: d.aceite,
    })
    falhou(error)
  },

  async listarVendas() {
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
    falhou(error)
    return (data as Venda[]).map(normalizarVenda)
  },

  async obterVenda(id) {
    const { data, error } = await supabase.from('vendas').select('*').eq('id', id).maybeSingle()
    falhou(error)
    return data ? normalizarVenda(data as Venda) : null
  },

  async atualizarVenda(id, dados) {
    const { data, error } = await supabase.from('vendas').update(dados).eq('id', id).select().single()
    falhou(error)
    return normalizarVenda(data as Venda)
  },

  async criarVenda(dados) {
    const { data, error } = await supabase
      .from('vendas')
      .insert({ ...dados, origem: 'manual' })
      .select()
      .single()
    falhou(error)
    return normalizarVenda(data as Venda)
  },

  async listarPerfis() {
    const { data, error } = await supabase.from('profiles').select('*').order('nome')
    falhou(error)
    return data as Perfil[]
  },

  async listarLeads() {
    const { data, error } = await supabase.from('leads').select('*')
    falhou(error)
    return (data as Lead[]).map((l) => ({
      ...l,
      valor_site: Number(l.valor_site),
      valor_manutencao: Number(l.valor_manutencao),
    }))
  },

  ouvirVendas(aoMudar) {
    const canal = supabase
      .channel(`vendas-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, aoMudar)
      .subscribe()
    return () => void supabase.removeChannel(canal)
  },
}

export const api: Api = modoDemo ? criarDemo() : apiSupabase
