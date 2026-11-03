/**
 * Massa de dados fictícia com semente fixa (RNF-03). Tudo é criado pelos serviços da
 * aplicação, então a massa passa pelas mesmas regras da API. Nenhum nome se refere a pessoa,
 * empresa ou marca real; os documentos são gerados pelo algoritmo de dígitos verificadores.
 */
import { resetBugOverrides, setActiveBugs } from '@/domain/bugs'
import { cnpjCheckDigits, cpfCheckDigits } from '@/domain/documents'
import type { PaymentMethod } from '@/domain/pricing'
import { resetClock, setClock } from '@/server/clock'
import { createCustomer, type Customer } from '@/server/customers'
import { invalidateDashboard } from '@/server/dashboard'
import { cancelInvoice, issueInvoice } from '@/server/invoices'
import {
  addItem,
  cancelOrder,
  createOrder,
  finalizeOrder,
  getOrder,
  updateOrderHeader,
} from '@/server/orders'
import { createProduct, type Product } from '@/server/products'
import { getDb } from './client'

const SEED = 20_261_103
const START = Date.UTC(2026, 9, 1, 12, 0, 0)
const STEP_MS = 17 * 60 * 1000

type Random = {
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
}

/** Gerador mulberry32: rápido, simples e reproduzível a partir da semente. */
function createRandom(seed: number): Random {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  return { int, pick: (items) => items[int(0, items.length - 1)] as (typeof items)[number] }
}

const PRODUCTS = [
  { code: 'TEC1001', name: 'Linho Misto', unit: 'meter', priceCents: 4990 },
  { code: 'TEC1002', name: 'Algodão Cru', unit: 'meter', priceCents: 1850 },
  { code: 'TEC1003', name: 'Tricoline Estampada', unit: 'meter', priceCents: 3290 },
  { code: 'TEC1004', name: 'Viscose Lisa', unit: 'meter', priceCents: 2740 },
  { code: 'TEC1005', name: 'Sarja Peletizada', unit: 'meter', priceCents: 3800 },
  { code: 'TEC1006', name: 'Oxford Liso', unit: 'meter', priceCents: 1690 },
  { code: 'TEC1007', name: 'Cetim Liso', unit: 'meter', priceCents: 2490 },
  { code: 'TEC1008', name: 'Malha Canelada', unit: 'meter', priceCents: 4450 },
  { code: 'TEC1009', name: 'Brim Pesado', unit: 'meter', priceCents: 3670 },
  { code: 'TEC1010', name: 'Voil Liso', unit: 'meter', priceCents: 2130 },
  { code: 'ROL2001', name: 'Entretela Termocolante', unit: 'roll', priceCents: 400, rollLength: 5 },
  { code: 'ROL2002', name: 'Manta Acrílica', unit: 'roll', priceCents: 650, rollLength: 10 },
  { code: 'ROL2003', name: 'Feltro Colorido', unit: 'roll', priceCents: 333, rollLength: 2.5 },
  { code: 'ROL2004', name: 'Não Tecido Branco', unit: 'roll', priceCents: 120, rollLength: 50 },
  { code: 'AVI3001', name: 'Botão de Madeira 15 mm', unit: 'unit', priceCents: 85 },
  { code: 'AVI3002', name: 'Zíper Invisível 20 cm', unit: 'unit', priceCents: 240 },
  { code: 'AVI3003', name: 'Linha de Costura 500 m', unit: 'unit', priceCents: 690 },
  { code: 'AVI3004', name: 'Fita de Cetim (peça)', unit: 'unit', priceCents: 150 },
] as const

const FIRST_NAMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Elisa',
  'Fábio',
  'Gabriela',
  'Hugo',
  'Isabel',
  'Laura',
  'Marcos',
  'Natália',
  'Otávio',
  'Paula',
  'Rafael',
] as const

const LAST_NAMES = [
  'Almeida',
  'Cardoso',
  'Duarte',
  'Esteves',
  'Freitas',
  'Gomes',
  'Macedo',
  'Nogueira',
  'Pires',
  'Siqueira',
  'Teixeira',
] as const

const COMPANIES = [
  'Ateliê Alfa Costura',
  'Oficina Beta Confecções',
  'Estúdio Gama Moda',
  'Ponto Delta Ateliê',
] as const

const DIGITS = '0123456789'
const ALPHANUMERIC = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function randomChars(random: Random, alphabet: string, length: number): string {
  return Array.from({ length }, () => alphabet[random.int(0, alphabet.length - 1)]).join('')
}

function fictitiousCpf(random: Random): string {
  const base = randomChars(random, DIGITS, 9)
  return base + cpfCheckDigits(base)
}

function fictitiousCnpj(random: Random, alphanumeric: boolean): string {
  const base = randomChars(random, alphanumeric ? ALPHANUMERIC : DIGITS, 8) + '0001'
  return base + cnpjCheckDigits(base)
}

/** CEP local (01000-000 a 09999-999) ou de fora da área de entrega própria. */
function fictitiousCep(random: Random, local: boolean): string {
  const prefix = local ? random.int(1000, 9999) : random.int(10_000, 99_999)
  return `${String(prefix).padStart(5, '0')}-${String(random.int(0, 999)).padStart(3, '0')}`
}

type Scenario =
  | 'draft'
  | 'finalized'
  | 'partial'
  | 'invoiced'
  | 'invoiceCanceled'
  | 'canceledDraft'
  | 'canceledFinalized'

const ORDER_PLAN: Scenario[] = [
  'invoiced',
  'finalized',
  'partial',
  'canceledDraft',
  'invoiced',
  'invoiceCanceled',
  'finalized',
  'partial',
  'canceledFinalized',
  'finalized',
  'draft',
  'draft',
]

function quantityFor(random: Random, product: Product): number {
  if (product.unit === 'meter') return random.int(50, 2000) / 100
  if (product.unit === 'roll') return random.int(1, 4)
  return random.int(1, 24)
}

function buildOrder(
  random: Random,
  customers: Customer[],
  products: Product[],
  scenario: Scenario,
): number {
  const order = createOrder({ customerId: random.pick(customers).id })
  const chosen = new Set<Product>()
  const itemCount = random.int(1, 3)
  while (chosen.size < itemCount) chosen.add(random.pick(products))
  for (const product of chosen) {
    addItem(order.id, { productId: product.id, quantity: quantityFor(random, product) })
  }
  updateOrderHeader(order.id, {
    customerId: order.customer.id,
    discountPct: random.pick([0, 0, 5, 10, 12.5]),
    freightCents: random.pick([0, 1500, 2990, 4500]),
    paymentMethod: random.pick<PaymentMethod>(['pix', 'pix', 'boleto', 'card']),
    installments: random.int(1, 3),
  })

  if (scenario === 'draft') return 1
  if (scenario === 'canceledDraft') {
    cancelOrder(order.id, { reason: 'Cliente pediu para refazer o orçamento' })
    return 1
  }
  finalizeOrder(order.id)
  if (scenario === 'finalized') return 1
  if (scenario === 'canceledFinalized') {
    cancelOrder(order.id, { reason: 'Pagamento não confirmado no prazo' })
    return 1
  }

  const total = getOrder(order.id).totalCents
  const first = Math.max(1, Math.floor(total * 0.4))
  issueInvoice(order.id, { amountCents: first })
  if (scenario === 'partial') return 1
  const rest = issueInvoice(order.id, { amountCents: total - first })
  if (scenario === 'invoiceCanceled') {
    cancelInvoice(rest.invoice.id, { reason: 'Nota emitida com valor errado' })
  }
  return 1
}

function clearDatabase(): void {
  const db = getDb()
  db.transaction(() => {
    for (const table of [
      'invoices',
      'order_history',
      'order_items',
      'orders',
      'customers',
      'products',
    ]) {
      db.prepare(`DELETE FROM ${table}`).run()
    }
  })()
  invalidateDashboard()
}

export type SeedSummary = { products: number; customers: number; orders: number; invoices: number }

/** Apaga os dados e recria a massa. Os defeitos ficam desligados durante o seed. */
export function seedDatabase(): SeedSummary {
  const random = createRandom(SEED)
  let tick = 0
  setClock(() => new Date(START + tick++ * STEP_MS))
  setActiveBugs([])
  try {
    clearDatabase()
    const products = PRODUCTS.map((product) => createProduct(product))

    const customers: Customer[] = []
    for (const [index, first] of FIRST_NAMES.slice(0, 10).entries()) {
      customers.push(
        createCustomer({
          type: 'PF',
          // Passo 7 percorre os 11 sobrenomes sem repetir nenhum.
          name: `${first} ${LAST_NAMES[(index * 7) % LAST_NAMES.length]}`,
          document: fictitiousCpf(random),
          cep: fictitiousCep(random, index % 3 !== 2),
        }),
      )
    }
    customers.push(
      createCustomer({
        type: 'PF',
        name: 'João Barros',
        document: fictitiousCpf(random),
        cep: fictitiousCep(random, true),
      }),
    )
    for (const [index, name] of COMPANIES.entries()) {
      customers.push(
        createCustomer({
          type: 'PJ',
          name,
          document: fictitiousCnpj(random, index % 2 === 0),
          cep: fictitiousCep(random, index !== 3),
        }),
      )
    }

    const orders = ORDER_PLAN.reduce(
      (count, scenario) => count + buildOrder(random, customers, products, scenario),
      0,
    )
    const invoices = getDb().prepare('SELECT COUNT(*) FROM invoices').pluck().get() as number
    return { products: products.length, customers: customers.length, orders, invoices }
  } finally {
    resetBugOverrides()
    resetClock()
  }
}
