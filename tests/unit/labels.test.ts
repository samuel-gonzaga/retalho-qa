import { describe, expect, it } from 'vitest'
import {
  ACTION_LABELS,
  announcesReservedShortcut,
  INVOICE_STATUS_LABELS,
  saveButton,
  STATUS_LABELS,
} from '@/domain/labels'

describe('RF-40 · botões sem atalhos que conflitam com o navegador', () => {
  it('[BUG-07] o botão de salvar o pedido se chama "Salvar" e não anuncia atalho', () => {
    expect(saveButton()).toEqual({ text: 'Salvar', ariaKeyShortcuts: undefined })
  })

  it.each([
    ['Salvar (Ctrl+S)', true],
    ['Control+S', true],
    ['Imprimir ⌘P', true],
    ['Ctrl + Shift + N', true],
    ['Cmd+O', true],
    ['Salvar', false],
    ['Buscar (Ctrl+K)', false],
    ['Controle de estoque', false],
  ])('"%s" anuncia atalho reservado: %s', (text, expected) => {
    expect(announcesReservedShortcut(text)).toBe(expected)
  })
})

describe('RNF-09 · vocabulário consistente', () => {
  it('usa um único rótulo por ação, como na tabela da especificação', () => {
    expect(ACTION_LABELS).toEqual({
      save: 'Salvar',
      newProduct: 'Novo produto',
      newCustomer: 'Novo cliente',
      newOrder: 'Novo pedido',
      addItem: 'Adicionar item',
      removeItem: 'Remover',
      finalizeOrder: 'Finalizar pedido',
      cancelOrder: 'Cancelar pedido',
      issueInvoice: 'Emitir nota',
      cancelInvoice: 'Cancelar nota',
      search: 'Buscar',
      back: 'Voltar',
    })
  })

  it('nomeia os estados do pedido e as situações da nota', () => {
    expect(Object.values(STATUS_LABELS)).toEqual([
      'Rascunho',
      'Finalizado',
      'Parcialmente faturado',
      'Faturado',
      'Cancelado',
    ])
    expect(Object.values(INVOICE_STATUS_LABELS)).toEqual(['Emitida', 'Cancelada'])
  })
})
