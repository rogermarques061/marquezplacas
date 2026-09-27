import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { metaBatida, montarAviso, type DadosVenda } from './mensagens.ts'

const base: DadosVenda = {
  venda_id: 'v1', nome: 'Cliente', valor: 130, tipo_venda: 'kit', quantidade: 1, vendedor: 'Roger', total_dia: 130, vendas_dia: 1,
}

Deno.test('meta batida só quando a venda cruza o múltiplo de 500', () => {
  assertEquals(metaBatida(390, 130), null)
  assertEquals(metaBatida(520, 130), 500)
  assertEquals(metaBatida(500, 80), 500)
  assertEquals(metaBatida(580, 80), null)
  assertEquals(metaBatida(1040, 650), 1000) // cruzou 500 e 1000 de uma vez: vale a maior
  assertEquals(metaBatida(3510, 130), 3500)
})

Deno.test('primeira venda do dia', () => {
  const a = montarAviso(base)
  assertEquals(a.title, 'Primeira venda do dia! Começou com o pé direito.')
  assertStringIncludes(a.body, 'Valor de R$')
  assertStringIncludes(a.body, '130,00')
  assertEquals(a.url, '/painel/vendas/v1')
})

Deno.test('vendas seguintes mudam o título', () => {
  const t2 = montarAviso({ ...base, vendas_dia: 2, total_dia: 210, valor: 80 }).title
  const t3 = montarAviso({ ...base, vendas_dia: 3, total_dia: 290, valor: 80 }).title
  assertEquals(t2, 'Opa! Mais uma plaquinha vendida.')
  assertEquals(t2 === t3, false)
})

Deno.test('meta de 500 e 3000', () => {
  const m500 = montarAviso({ ...base, vendas_dia: 4, total_dia: 520, valor: 130 })
  assertEquals(m500.title, 'Você é uma máquina! R$ 500 hoje. 🔥')
  assertStringIncludes(m500.body, 'Próxima meta')
  assertStringIncludes(m500.body, '1.000')
  assertEquals(m500.url, '/painel')
  const m3000 = montarAviso({ ...base, vendas_dia: 20, total_dia: 3040, valor: 130 })
  assertStringIncludes(m3000.title, 'TRÊS MIL')
  const m3500 = montarAviso({ ...base, vendas_dia: 25, total_dia: 3510, valor: 130 })
  assertStringIncludes(m3500.title, '3.500')
})
