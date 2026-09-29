// Roteiro de vendas do X1: primeira mensagem e respostas prontas, montadas
// sozinhas com a saudação do horário, o nome do negócio, o nicho e o público.
// A plaquinha sempre aparece com os dois ganhos: avaliação no Google e
// seguidor no Instagram.
import { PRECO_KIT, PRECO_UNIDADE } from './constantes'
import type { Nicho } from './prospeccao'

export type Publico = 'masculino' | 'feminino' | 'misto'

export const PUBLICOS: { valor: Publico; rotulo: string }[] = [
  { valor: 'masculino', rotulo: 'Masculino' },
  { valor: 'feminino', rotulo: 'Feminino' },
  { valor: 'misto', rotulo: 'Misto' },
]

/** Como cada nicho é chamado na conversa e onde o cliente está na hora de avaliar. */
const NICHO: Record<Nicho, { publico: Publico; busca: string; plural: string; onde: string }> = {
  barbearia: { publico: 'masculino', busca: 'barbearia', plural: 'barbearias', onde: 'ainda na cadeira' },
  tatuador: { publico: 'misto', busca: 'tatuador', plural: 'estúdios de tattoo', onde: 'antes de sair do estúdio' },
  nail: { publico: 'feminino', busca: 'manicure', plural: 'nail designers', onde: 'ainda na mesa' },
  sobrancelha: { publico: 'feminino', busca: 'design de sobrancelha', plural: 'studios de sobrancelha', onde: 'ainda na cadeira' },
  estetica: { publico: 'feminino', busca: 'clínica de estética', plural: 'clínicas de estética', onde: 'antes de ir embora' },
  salao: { publico: 'feminino', busca: 'salão de beleza', plural: 'salões', onde: 'ainda na cadeira' },
  restaurante: { publico: 'misto', busca: 'restaurante', plural: 'restaurantes', onde: 'ainda na mesa' },
  otica: { publico: 'misto', busca: 'ótica', plural: 'óticas', onde: 'ainda no balcão' },
  outro: { publico: 'misto', busca: 'loja', plural: 'lojas', onde: 'ainda no balcão' },
}

export const publicoDoNicho = (n: Nicho) => NICHO[n].publico

export function saudacao(agora = new Date()) {
  const h = agora.getHours()
  return h >= 5 && h < 12 ? 'bom dia' : h >= 12 && h < 18 ? 'boa tarde' : 'boa noite'
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/**
 * Nome como a pessoa fala: sem o " - Nova Iguaçu" que o mapa acrescenta, sem
 * parênteses e sem CAIXA ALTA.
 */
export function nomeFalado(nome: string) {
  let n = nome.split(/\s+[-–|]\s+/)[0].replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  if (n.length > 3 && n === n.toUpperCase()) {
    n = n.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, e: string, l: string) => e + l.toUpperCase())
  }
  return n || nome
}

const MASCULINOS = /^(restaurante|studio|estúdio|estudio|salão|salao|espaço|espaco|bar|café|cafe|instituto|ateliê|atelie|atelier|centro|point|empório|emporio|recanto|cantinho|ponto|mundo|clube|club)$/i

/** "a" ou "o" antes do nome: "a Barbearia do Jorge", "o Studio Bella". */
export function artigo(nome: string, nicho: Nicho): 'a' | 'o' {
  const primeira = nome.split(/\s+/)[0]
  if (MASCULINOS.test(primeira)) return 'o'
  if (/a$/i.test(primeira)) return 'a'
  return nicho === 'salao' || nicho === 'restaurante' ? 'o' : 'a'
}

export interface Contexto {
  nome: string
  nicho: Nicho
  publico: Publico
  /** Primeiro nome de quem está mandando. */
  vendedor?: string
  agora?: Date
}

function montar(c: Contexto) {
  const info = NICHO[c.nicho]
  const nome = nomeFalado(c.nome)
  const a = artigo(nome, c.nicho)
  const fem = c.publico === 'feminino'
  const s = saudacao(c.agora)
  const eu = c.vendedor ? ` Aqui é o ${c.vendedor}` : ''
  return {
    nome: `*${nome}*`,
    nomeSimples: nome,
    a,
    da: a === 'a' ? 'da' : 'do',
    busca: info.busca,
    plural: info.plural,
    onde: info.onde,
    cliente: fem ? 'a cliente' : 'o cliente',
    clientes: fem ? 'as clientes' : 'os clientes',
    satisfeito: fem ? 'satisfeita' : 'satisfeito',
    satisfeitos: fem ? 'satisfeitas' : 'satisfeitos',
    quantos: fem ? 'quantas' : 'quantos',
    emoji: fem ? '😊' : c.publico === 'masculino' ? '👊' : '👋',
    abertura:
      c.publico === 'masculino'
        ? `Fala! ${maiuscula(s)}, tudo certo?${eu}.`
        : fem
          ? `Oii, ${s}! Tudo bem?${eu} 😊`
          : `Olá, ${s}! Tudo bem?${eu}.`,
  }
}

export interface Mensagem {
  id: string
  titulo: string
  /** Dica para quem vai mandar (não vai na mensagem). */
  dica?: string
  texto: (c: Contexto) => string
}

/** Primeira mensagem: quatro jeitos de puxar a conversa. O app reveza entre eles. */
export const ABERTURAS: Mensagem[] = [
  {
    id: 'aparecer',
    titulo: 'Aparecer primeiro',
    texto: (c) => {
      const t = montar(c)
      return `${t.abertura}

Vi ${t.a} ${t.nome} no Google Maps. Sabia que quem tem mais avaliação aparece primeiro quando alguém procura "${t.busca} perto de mim"? E a maioria d${t.clientes} ${t.satisfeitos} vai embora sem avaliar e sem seguir vocês no Instagram.

Tenho uma plaquinha que resolve os dois: ${t.cliente} encosta o celular ${t.onde}, avalia no Google e já segue o Insta.

Posso te mandar um vídeo de 20 segundos mostrando?`
    },
  },
  {
    id: 'seguidores',
    titulo: 'Mais seguidores',
    texto: (c) => {
      const t = montar(c)
      return `${t.abertura}

Cada ${t.cliente.slice(2)} que sai ${t.satisfeito} ${t.da} ${t.nome} é um seguidor no Instagram e uma avaliação no Google que vocês podem estar perdendo 👀

Tenho uma plaquinha pro balcão: ${t.cliente} encosta o celular e na hora segue o Insta e avalia no Google. Mais seguidor, mais avaliação, mais gente nova chegando.

Quer ver funcionando? Te mando um vídeo rapidinho.`
    },
  },
  {
    id: 'pergunta',
    titulo: 'Pergunta que provoca',
    texto: (c) => {
      const t = montar(c)
      return `${t.abertura}

Pergunta rápida sobre ${t.a} ${t.nome}: de cada 10 ${t.clientes.slice(3)} que saem ${t.satisfeitos} daí, ${t.quantos} te avaliam no Google ou te seguem no Instagram? 🤔

Normalmente é 1 ou 2. Com uma plaquinha no balcão, ${t.cliente} faz os dois em 3 segundos, só encostando o celular.

Posso te mostrar num vídeo curtinho?`
    },
  },
  {
    id: 'direta',
    titulo: 'Curta e direta',
    texto: (c) => {
      const t = montar(c)
      return `${t.abertura}

Tô instalando umas plaquinhas em ${t.plural} aqui da região e lembrei ${t.da} ${t.nome}: ${t.cliente} encosta o celular e já te avalia no Google e segue no Instagram. Sem app, sem QR code.

Posso te mandar um vídeo de 20s? ${t.emoji}`
    },
  },
]

/** Depois que a pessoa responde: mostrar funcionando, preço e as objeções mais comuns. */
export const RESPOSTAS: Mensagem[] = [
  {
    id: 'video',
    titulo: 'Mostrar funcionando',
    dica: 'Mande junto o vídeo da plaquinha e a foto de uma instalada.',
    texto: (c) => {
      const t = montar(c)
      return `Olha como funciona 👇

${maiuscula(t.cliente)} encosta o celular na plaquinha e abre direto a avaliação do Google. Na outra, abre o Instagram ${t.da} ${t.nome} pra seguir. Funciona em qualquer celular, sem baixar nada.

Essa da foto eu instalei aqui perto. Imagina todo mundo que passa aí avaliando e seguindo vocês ${t.emoji}`
    },
  },
  {
    id: 'preco',
    titulo: 'Quanto é?',
    texto: (c) => {
      const t = montar(c)
      return `A unidade sai R$ ${PRECO_UNIDADE}. Mas o que mais sai é o kit com 2 por R$ ${PRECO_KIT}: uma pro Google e uma pro Instagram.

Você paga uma vez só e ela trabalha todo dia pr${t.a} ${t.nome}. Quer que eu separe o seu kit?`
    },
  },
  {
    id: 'caro',
    titulo: 'Tá caro',
    texto: (c) => {
      const t = montar(c)
      return `Entendo! Mas pensa assim: ${t.cliente.startsWith('a') ? 'uma cliente nova' : 'um cliente novo'} que te achar no Google, ou que voltar porque te segue no Instagram, já paga a plaquinha.

Depois disso é lucro todo dia, por anos. E é pagamento único, sem mensalidade.`
    },
  },
  {
    id: 'ja-peco',
    titulo: 'Já peço avaliação',
    texto: (c) => {
      const t = montar(c)
      return `Show! E ${t.quantos} fazem de verdade? A maioria fala "depois eu faço" e esquece 😅

Com a plaquinha é na hora, ${t.onde}: encostou o celular, avaliou e já seguiu o Insta. Não depende de ninguém lembrar.`
    },
  },
  {
    id: 'pensar',
    titulo: 'Vou pensar',
    texto: () =>
      `Claro, sem pressa! Se quiser, passo aí rapidinho e te mostro funcionando no seu balcão, leva 2 minutinhos.

Que dia fica melhor pra você?`,
  },
  {
    id: 'fechar',
    titulo: 'Fechar a venda',
    texto: (c) => {
      const t = montar(c)
      return `Fechado então! 🙌

Me passa o @ do Instagram ${t.da} ${t.nome} que eu já deixo as duas plaquinhas configuradas, Google e Insta. Prefere Pix ou cartão?`
    },
  },
]

/** Abertura da vez: reveza entre os modelos para as mensagens não saírem todas iguais. */
export function proximaAbertura(): Mensagem {
  let i = 0
  try {
    i = (Number(localStorage.getItem('marquez-abertura')) + 1) % ABERTURAS.length || 0
    localStorage.setItem('marquez-abertura', String(i))
  } catch {
    i = Math.floor(Math.random() * ABERTURAS.length)
  }
  return ABERTURAS[i]
}
