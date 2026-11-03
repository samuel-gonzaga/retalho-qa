/**
 * Rótulos da interface: vocabulário único (RNF-09) e botões sem atalhos reservados (RF-40).
 */
import type { OrderStatus } from './order-state'
import type { PaymentMethod } from './pricing'
import type { Unit } from './units'

export const ACTION_LABELS = {
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
} as const

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Rascunho',
  finalized: 'Finalizado',
  partially_invoiced: 'Parcialmente faturado',
  invoiced: 'Faturado',
  canceled: 'Cancelado',
}

export const INVOICE_STATUS_LABELS = { issued: 'Emitida', canceled: 'Cancelada' } as const

export const UNIT_LABELS: Record<Unit, string> = { meter: 'metro', roll: 'rolo', unit: 'unidade' }

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  card: 'Cartão',
}

export type ButtonLabel = { text: string; ariaKeyShortcuts: string | undefined }

/** RF-40: o botão que salva o pedido em rascunho. */
export function saveButton(): ButtonLabel {
  return { text: ACTION_LABELS.save, ariaKeyShortcuts: undefined }
}

/** Teclas que o navegador já usa com Ctrl ou ⌘ (RF-40). */
const RESERVED_KEYS = new Set(['S', 'P', 'N', 'T', 'W', 'R', 'F', 'D', 'L', 'H', 'J', 'O'])
const SHORTCUT =
  /(?:ctrl|control|cmd|command|meta|⌘)\s*\+?\s*(?:(?:shift|alt)\s*\+\s*)*([a-z])(?![a-z])/gi

/** Diz se um texto (rótulo, dica ou aria-keyshortcuts) anuncia um atalho reservado. */
export function announcesReservedShortcut(text: string): boolean {
  for (const match of text.matchAll(SHORTCUT)) {
    if (RESERVED_KEYS.has((match[1] ?? '').toUpperCase())) return true
  }
  return false
}
