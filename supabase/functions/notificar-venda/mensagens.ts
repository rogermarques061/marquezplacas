// Textos das notificações. Cada venda validada gera um aviso; quando o
// faturamento do DIA passa de uma meta (R$ 500, 1.000, 1.500...), o aviso
// vira comemoração. Para mudar os textos, é só editar as listas abaixo.

export interface DadosVenda {
  venda_id: string
  nome: string
  valor: number
  tipo_venda: 'unidade' | 'kit' | null
  quantidade: number | null
  vendedor: string | null
  /** Faturamento do dia já contando esta venda. */
  total_dia: number
  /** Quantas vendas validadas no dia, contando esta. */
  vendas_dia: number
}

export interface Aviso {
  title: string
  body: string
  url: string
  tag: string
}

const PASSO_META = 500

/** Venda comum: o título muda a cada venda do dia. */
const TITULOS_VENDA = [
  'Opa! Mais uma plaquinha vendida.',
  'Plim! Caiu mais uma na conta.',
  'Tá chovendo plaquinha hoje!',
  'Mais uma! Segue o baile.',
  'Venda confirmada. Bora que tá rendendo!',
  'Mais um negócio que vai lotar de avaliação.',
  'É venda atrás de venda!',
  'Olha ela aí de novo: mais uma vendida!',
  'Quem vende assim não para mais.',
  'Mais uma plaquinha indo trabalhar por aí.',
]

const TITULO_PRIMEIRA = 'Primeira venda do dia! Começou com o pé direito.'
const TITULO_GRAUDA = 'Venda graúda! Essa pesou no caixa.'

/** Metas do dia. */
const METAS: Record<number, string> = {
  500: 'Você é uma máquina! R$ 500 hoje. 🔥',
  1000: 'Mil reais no dia! Quatro dígitos, respeita. 💰',
  1500: 'R$ 1.500 hoje. Ninguém segura! 🚀',
  2000: 'Dois mil no dia! Tá voando. ✈️',
  2500: 'R$ 2.500! Isso já é outro nível. 👑',
  3000: 'TRÊS MIL NO DIA! Lenda da plaquinha. 🏆',
}

/** Depois de R$ 3.000, a cada R$ 500 a mais. */
const TITULOS_RECORDE = [
  'R$ {total} hoje. Recorde atrás de recorde! 🏆',
  'R$ {total} no dia. Isso nem parece real. 🤯',
  'R$ {total}! Alguém chama a imprensa. 📰',
  'R$ {total} hoje. Você zerou o jogo. 🎮',
]

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const moedaCheia = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/** Maior meta (múltiplo de 500) que esta venda fez o dia ultrapassar, ou null. */
export function metaBatida(totalDia: number, valor: number): number | null {
  const antes = totalDia - valor
  const meta = Math.floor(totalDia / PASSO_META) * PASSO_META
  return meta >= PASSO_META && antes < meta ? meta : null
}

export function montarAviso(d: DadosVenda): Aviso {
  const valor = moeda.format(d.valor)
  const meta = metaBatida(d.total_dia, d.valor)

  if (meta !== null) {
    const titulo =
      METAS[meta] ??
      TITULOS_RECORDE[(meta / PASSO_META) % TITULOS_RECORDE.length].replace('{total}', moedaCheia.format(meta).replace('R$', '').trim())
    const proxima = meta + PASSO_META
    const complemento =
      meta >= 3000 && !METAS[proxima] ? 'Daqui pra frente é só recorde.' : `Próxima meta: ${moedaCheia.format(proxima)}.`
    return {
      title: titulo,
      body: `A venda de ${valor} levou o dia para ${moeda.format(d.total_dia)}. ${complemento}`,
      url: '/painel',
      tag: `meta-${meta}`,
    }
  }

  const titulo =
    d.vendas_dia === 1
      ? TITULO_PRIMEIRA
      : d.valor >= 260
        ? TITULO_GRAUDA
        : TITULOS_VENDA[(d.vendas_dia - 2) % TITULOS_VENDA.length]

  const partes = [`Valor de ${valor}`, `${d.vendas_dia}ª venda de hoje`]
  if (d.vendedor) partes.push(d.vendedor)
  return {
    title: titulo,
    body: partes.join(' · '),
    url: `/painel/vendas/${d.venda_id}`,
    tag: `venda-${d.venda_id}`,
  }
}
