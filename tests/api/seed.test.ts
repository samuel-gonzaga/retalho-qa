import { describe, expect, it } from 'vitest'
import { getDb, resetDatabase } from '@/db/client'
import { seedDatabase } from '@/db/seed-data'
import { isValidCnpj, isValidCpf } from '@/domain/documents'
import { ORDER_STATUSES } from '@/domain/order-state'

const TABLES = ['products', 'customers', 'orders', 'order_items', 'order_history', 'invoices']

function dump(): string {
  const db = getDb()
  return JSON.stringify(
    TABLES.map((table) => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()),
  )
}

describe('RNF-03 · massa de dados determinística', () => {
  it('rodar o seed duas vezes produz bancos com o mesmo conteúdo', () => {
    resetDatabase()
    seedDatabase()
    const first = dump()
    resetDatabase()
    seedDatabase()
    expect(dump()).toBe(first)
  })

  it('gera documentos válidos e pedidos em todos os estados', () => {
    resetDatabase()
    const summary = seedDatabase()
    expect(summary).toMatchObject({ products: 18, customers: 15, orders: 12 })

    const customers = getDb().prepare('SELECT type, document FROM customers').all() as {
      type: 'PF' | 'PJ'
      document: string
    }[]
    for (const { type, document } of customers) {
      expect(type === 'PF' ? isValidCpf(document) : isValidCnpj(document)).toBe(true)
    }

    const statuses = getDb().prepare('SELECT DISTINCT status FROM orders').pluck().all()
    expect([...statuses].sort()).toEqual([...ORDER_STATUSES].sort())
  })
})
