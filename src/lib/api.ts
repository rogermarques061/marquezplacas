import { criarDemo } from './demo'
import { soDigitos } from './mascaras'
import { modoDemo, supabase } from './supabase'
import type { DadosFormulario, Perfil, Venda, VendaEditavel } from './tipos'

/** Tudo que as telas precisam do backend. No modo demonstração roda em memória. */
export interface Api {
  enviarFormulario(d: DadosFormulario): Promise<void>
  listarVendas(): Promise<Venda[]>
  obterVenda(id: string): Promise<Venda | null>
  atualizarVenda(id: string, dados: VendaEditavel): Promise<Venda>
  criarVenda(dados: VendaEditavel & { nome: string; whatsapp: string }): Promise<Venda>
  listarPerfis(): Promise<Perfil[]>
  /** Avisa quando qualquer venda muda (novo formulário, validação etc.). Retorna o "desligar". */
  ouvirVendas(aoMudar: () => void): () => void
}

function falhou(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message)
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
    return data as Venda[]
  },

  async obterVenda(id) {
    const { data, error } = await supabase.from('vendas').select('*').eq('id', id).maybeSingle()
    falhou(error)
    return data as Venda | null
  },

  async atualizarVenda(id, dados) {
    const { data, error } = await supabase.from('vendas').update(dados).eq('id', id).select().single()
    falhou(error)
    return data as Venda
  },

  async criarVenda(dados) {
    const { data, error } = await supabase
      .from('vendas')
      .insert({ ...dados, origem: 'manual' })
      .select()
      .single()
    falhou(error)
    return data as Venda
  },

  async listarPerfis() {
    const { data, error } = await supabase.from('profiles').select('*').order('nome')
    falhou(error)
    return data as Perfil[]
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
