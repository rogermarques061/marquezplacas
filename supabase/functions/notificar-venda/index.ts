// Chamada pelo trigger vendas_notificar (pg_net) a cada formulário enviado.
// Manda Web Push para todos os aparelhos de usuários com notificações ativas.
// Chaves VAPID e segredo ficam no Vault do banco (função config_push).
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SEGMENTOS: Record<string, string> = {
  alimentacao: 'Alimentação',
  beleza_estetica: 'Beleza e Estética',
  saude: 'Saúde',
  loja_varejo: 'Loja e Varejo',
  servicos: 'Serviços',
  outro: 'Outro',
}

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

  const { venda_id, nome, segmento } = await req.json()

  const { data: inscricoes, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, subscription_json, profiles!inner(notificacoes_ativas)')
    .eq('profiles.notificacoes_ativas', true)
  if (error) return new Response(error.message, { status: 500 })

  const segmentoTexto = SEGMENTOS[segmento] ?? 'segmento não informado'
  const payload = JSON.stringify({
    title: 'Opa! Mais uma plaquinha vendida 🔥',
    body: `${nome} (${segmentoTexto})`,
    url: `/painel/vendas/${venda_id}`,
    tag: `venda-${venda_id}`,
  })

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
