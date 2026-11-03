/**
 * Mensagens de erro da seção 11 da especificação. Cada uma diz o que houve e como corrigir.
 */
import { formatBRL } from './money'
import type { OrderStatus } from './order-state'

/** Seção 11.2: mensagens por campo, usadas em `fields` dos erros de validação. */
export const FIELD_MESSAGES = {
  productCode: 'Use de 3 a 12 letras maiúsculas ou números, sem espaços.',
  productName: 'Informe o nome com 2 a 80 caracteres.',
  productUnit: 'Escolha a unidade: metro, rolo ou unidade.',
  productPrice: 'Informe um preço entre R$ 0,01 e R$ 99.999,99.',
  rollLength: 'Informe o comprimento do rolo entre 0,01 e 500 m, com até 2 casas decimais.',
  rollLengthNotApplicable: 'O comprimento só se aplica a produtos vendidos em rolo.',
  customerType: 'Escolha pessoa física (PF) ou pessoa jurídica (PJ).',
  customerName: 'Informe o nome com 2 a 120 caracteres.',
  cpf: 'CPF inválido. Confira os 11 dígitos.',
  cnpj: 'CNPJ inválido. Confira os 14 caracteres.',
  cep: 'CEP inválido. Use 8 dígitos, no formato 00000-000.',
  customer: 'Escolha um cliente cadastrado.',
  discount: 'Informe um desconto de 0 % a 100 %, com até 2 casas decimais.',
  freight: 'Informe um frete de R$ 0,00 a R$ 9.999,99.',
  paymentMethod: 'Escolha Pix, boleto ou cartão.',
  installments: 'Escolha de 1 a 3 parcelas.',
  product: 'Escolha um produto cadastrado.',
  quantityRange: 'Informe uma quantidade entre 0,01 e 1.000.',
  quantityDecimals: 'Use no máximo 2 casas decimais.',
  quantityInteger: 'Rolos e unidades são vendidos só em quantidades inteiras.',
  amount: 'Informe um valor maior que R$ 0,00.',
  statusFilter:
    'Filtro de estado inválido. Use draft, finalized, partially_invoiced, invoiced ou canceled.',
} as const

/** Como cada estado aparece no meio de uma frase ("o pedido está faturado"). */
const STATUS_PHRASES: Record<OrderStatus, string> = {
  draft: 'em rascunho',
  finalized: 'finalizado',
  partially_invoiced: 'parcialmente faturado',
  invoiced: 'faturado',
  canceled: 'cancelado',
}

const TRANSITION_VERBS = {
  finalize: 'finalizar',
  cancel: 'cancelar',
  invoice: 'emitir nota para',
} as const

export type TransitionAction = keyof typeof TRANSITION_VERBS

export type Entity = 'Produto' | 'Cliente' | 'Pedido' | 'Item' | 'Nota'

/** Seção 11.1: mensagens dos códigos de erro. */
export const ERROR_MESSAGES = {
  invalidJson: 'Não foi possível ler os dados enviados. Envie um JSON válido.',
  notFound: (entity: Entity) =>
    `${entity} não ${entity === 'Nota' ? 'encontrada' : 'encontrado'}. Confira o número informado.`,
  duplicateProductCode: (code: string) =>
    `Já existe um produto com o código ${code}. Escolha outro código.`,
  duplicateDocument: (kind: 'CPF' | 'CNPJ') =>
    `Já existe um cliente com este ${kind}. Busque o cadastro existente.`,
  duplicateItem: 'Este produto já está no pedido. Altere a quantidade do item existente.',
  orderNotEditable: (status: OrderStatus) =>
    `O pedido está ${STATUS_PHRASES[status]} e não aceita alterações. ` +
    'Só pedidos em rascunho podem ser alterados.',
  invalidTransition: (action: TransitionAction, status: OrderStatus) => {
    const message = `Não é possível ${TRANSITION_VERBS[action]} um pedido ${STATUS_PHRASES[status]}.`
    const hasInvoices = status === 'partially_invoiced' || status === 'invoiced'
    return action === 'cancel' && hasInvoices
      ? `${message} Cancele as notas emitidas antes de cancelar o pedido.`
      : message
  },
  validation: 'Alguns campos estão inválidos. Corrija os campos indicados e tente de novo.',
  orderIncomplete: 'Adicione ao menos um item antes de finalizar o pedido.',
  reasonRequired: 'Informe o motivo do cancelamento, com 10 a 200 caracteres.',
  amountExceedsBalance: (amountCents: number, balanceCents: number) =>
    `O valor da nota (${formatBRL(amountCents)}) passa do saldo a faturar ` +
    `(${formatBRL(balanceCents)}). Informe até ${formatBRL(balanceCents)}.`,
  unexpected: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
} as const
