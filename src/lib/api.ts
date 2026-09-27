import { criarDemo } from './demo'
import { soDigitos } from './mascaras'
import { modoDemo, supabase } from './supabase'
import type { DadosFormulario, HistoricoLead, LeadCompleto, LeadEditavel, Papel, Perfil, Venda, VendaEditavel } from './tipos'

/** Tudo que as telas precisam do backend. No modo demonstração roda em memória. */
export interface Api {
  /** Retorna o id da venda pendente criada. */
  enviarFormulario(d: DadosFormulario): Promise<string>
  listarVendas(): Promise<Venda[]>
  obterVenda(id: string): Promise<Venda | null>
  atualizarVenda(id: string, dados: VendaEditavel): Promise<Venda>
  criarVenda(dados: VendaEditavel & { nome: string; whatsapp: string }): Promise<Venda>
  listarPerfis(): Promise<Perfil[]>
  listarLeads(): Promise<LeadCompleto[]>
  atualizarLead(id: string, dados: LeadEditavel): Promise<void>
  listarHistorico(leadId: string): Promise<HistoricoLead[]>
  ouvirLeads(aoMudar: () => void): () => void
  /** Avisa quando qualquer venda muda (novo formulário, validação etc.). Retorna o "desligar". */
  ouvirVendas(aoMudar: () => void): () => void

  // Perfil e equipe
  atualizarMeuPerfil(dados: { nome?: string; notificacoes_ativas?: boolean }): Promise<void>
  alterarPapel(id: string, papel: Papel): Promise<void>
  convidarUsuario(dados: { email: string; nome: string; papel: Papel }): Promise<void>
  removerUsuario(id: string): Promise<void>

  // Push: uma inscrição por aparelho
  salvarInscricaoPush(inscricao: PushSubscriptionJSON): Promise<void>
  /** Remove a inscrição deste aparelho e diz quantos aparelhos do usuário continuam inscritos. */
  removerInscricaoPush(endpoint: string): Promise<number>
}

async function meuId() {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Sessão expirada. Entre novamente.')
  return id
}

/** Erro amigável vindo da Edge Function gerenciar-usuarios. */
async function erroDaFuncao(error: unknown): Promise<never> {
  const ctx = (error as { context?: Response }).context
  const corpo = ctx ? await ctx.json().catch(() => null) : null
  throw new Error(corpo?.erro ?? (error as Error).message)
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
    const { data, error } = await supabase.rpc('enviar_formulario', {
      p_nome: d.nome.trim(),
      p_whatsapp: soDigitos(d.whatsapp),
      p_instagram: d.instagram || null,
      p_segmento: d.segmento,
      p_tem_site: d.temSite,
      p_como_encontram: d.comoEncontram,
      p_aceite_contato: d.aceite,
    })
    falhou(error)
    return data as string
  },

  async listarVendas() {
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000)
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
    const { data, error } = await supabase
      .from('leads')
      .select('*, venda:vendas(nome, whatsapp, instagram, segmento, tem_site, valor_total, validada_em)')
      .order('updated_at', { ascending: false })
    falhou(error)
    return (data as LeadCompleto[]).map((l) => ({
      ...l,
      valor_site: Number(l.valor_site),
      valor_manutencao: Number(l.valor_manutencao),
      venda: { ...l.venda, valor_total: l.venda.valor_total == null ? null : Number(l.venda.valor_total) },
    }))
  },

  async atualizarLead(id, dados) {
    const { error } = await supabase.from('leads').update(dados).eq('id', id)
    falhou(error)
  },

  async listarHistorico(leadId) {
    const { data, error } = await supabase
      .from('lead_historico')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
    falhou(error)
    return data as HistoricoLead[]
  },

  ouvirLeads(aoMudar) {
    const canal = supabase
      .channel(`leads-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, aoMudar)
      .subscribe()
    return () => void supabase.removeChannel(canal)
  },

  ouvirVendas(aoMudar) {
    const canal = supabase
      .channel(`vendas-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, aoMudar)
      .subscribe()
    return () => void supabase.removeChannel(canal)
  },

  async atualizarMeuPerfil(dados) {
    const { error } = await supabase.from('profiles').update(dados).eq('id', await meuId())
    falhou(error)
  },

  async alterarPapel(id, papel) {
    const { error } = await supabase.from('profiles').update({ papel }).eq('id', id)
    falhou(error)
  },

  async convidarUsuario(dados) {
    const { error } = await supabase.functions.invoke('gerenciar-usuarios', { body: { acao: 'convidar', ...dados } })
    if (error) await erroDaFuncao(error)
  },

  async removerUsuario(id) {
    const { error } = await supabase.functions.invoke('gerenciar-usuarios', { body: { acao: 'remover', id } })
    if (error) await erroDaFuncao(error)
  },

  async salvarInscricaoPush(inscricao) {
    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: await meuId(), endpoint: inscricao.endpoint, subscription_json: inscricao, user_agent: navigator.userAgent },
      { onConflict: 'endpoint' },
    )
    falhou(error)
  },

  async removerInscricaoPush(endpoint) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    falhou(error)
    const { count } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', await meuId())
    return count ?? 0
  },
}

export const api: Api = modoDemo ? criarDemo() : apiSupabase
