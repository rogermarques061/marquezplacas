import { assertEquals } from 'jsr:@std/assert@1'
import { classificar, telefoneBR } from './nichos.ts'

Deno.test('classifica pelos tipos e pelo nome', () => {
  assertEquals(classificar({ amenity: 'restaurant', name: 'Cantina' }), 'restaurante')
  assertEquals(classificar({ shop: 'hairdresser', hairdresser: 'barber', name: 'X' }), 'barbearia')
  assertEquals(classificar({ shop: 'hairdresser', name: 'Barbearia do Zé' }), 'barbearia')
  assertEquals(classificar({ shop: 'hairdresser', name: 'Studio Hair' }), 'salao')
  assertEquals(classificar({ shop: 'beauty', beauty: 'nails', name: 'X' }), 'nail')
  assertEquals(classificar({ shop: 'beauty', name: 'Esmalteria Bella' }), 'nail')
  assertEquals(classificar({ shop: 'beauty', name: 'Design de Sobrancelhas Ana' }), 'sobrancelha')
  assertEquals(classificar({ shop: 'beauty', name: 'Clínica Pele' }), 'estetica')
  assertEquals(classificar({ shop: 'tattoo', name: 'Ink' }), 'tatuador')
  assertEquals(classificar({ shop: 'optician', name: 'Ótica' }), 'otica')
  assertEquals(classificar({ shop: 'bakery', name: 'Padaria' }), null)
})

Deno.test('telefone brasileiro', () => {
  assertEquals(telefoneBR('+55 11 98765-4321'), '11987654321')
  assertEquals(telefoneBR('(21) 3333-4444'), '2133334444')
  assertEquals(telefoneBR('0xx11 98765-4321'.replace('xx', '')), '11987654321')
  assertEquals(telefoneBR(undefined, '+55 21 99999-8888;+55 21 3333-2222'), '21999998888')
  assertEquals(telefoneBR('123'), null)
})
