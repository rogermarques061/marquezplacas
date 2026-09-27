// Chamada pelos triggers vendas_notificar_* (pg_net) a cada venda validada.
// Manda Web Push para todos os aparelhos de usuários com notificações ativas.
// Chaves VAPID e segredo ficam no Vault do banco (função config_push).
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { montarAviso, type DadosVenda } from './mensagens.ts'

interface Config {
  vapid_publica?: string
  vapid_privada?: string
  vapid_contato?: string
  notificar_venda_segredo?: string
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

let config: Config | null = null
async function carregarConfig(): Promise<Config> {
  if (config) return config
  const { data, error } = await supabase.rpc('config_push')
  if (error) throw error
  config = data as Config
  webpush.setVapidDetails(config.vapid_contato ?? 'mailto:contato@marquez.digital', config.vapid_publica!, config.vapid_privada!)
  return config
}

Deno.serve(async (req) => {
  const cfg = await carregarConfig()
  if (!cfg.notificar_venda_segredo || req.headers.get('x-segredo') !== cfg.notificar_venda_segredo) {
    return new Response('não autorizado', { status: 401 })
  }

  const { venda_id } = await req.json()

  const { data: dados, error: erroDados } = await supabase.rpc('dados_notificacao', { p_venda_id: venda_id })
  if (erroDados) return new Response(erroDados.message, { status: 500 })
  if (!dados) return new Response('venda não encontrada', { status: 404 })
  const payload = JSON.stringify(montarAviso({ ...(dados as DadosVenda), valor: Number(dados.valor), total_dia: Number(dados.total_dia) }))

  const { data: inscricoes, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, subscription_json, profiles!inner(notificacoes_ativas)')
    .eq('profiles.notificacoes_ativas', true)
  if (error) return new Response(error.message, { status: 500 })

  const expiradas: string[] = []
  const resultados = await Promise.allSettled(
    (inscricoes ?? []).map((i) =>
      webpush.sendNotification(i.subscription_json, payload, { TTL: 60 * 60 * 24, urgency: 'high' }).catch((e: { statusCode?: number }) => {
        // 404/410: aparelho desinstalou ou revogou a permissão
        if (e.statusCode === 404 || e.statusCode === 410) expiradas.push(i.id)
        else console.error('falha ao enviar push', i.endpoint, e)
        throw e
      }),
    ),
  )

  if (expiradas.length) await supabase.from('push_subscriptions').delete().in('id', expiradas)

  const enviadas = resultados.filter((r) => r.status === 'fulfilled').length
  return Response.json({ enviadas, falhas: resultados.length - enviadas, removidas: expiradas.length })
})
