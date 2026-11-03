/**
 * Painel: vendido, faturado e a faturar (RF-36 a RF-39), com cache invalidado a cada ação
 * que muda os números.
 */
import { getDb, type Db } from '@/db/client'

export type Dashboard = {
  soldCents: number
  invoicedCents: number
  toInvoiceCents: number
}

// Em globalThis para que rotas e páginas, mesmo em bundles diferentes, vejam o mesmo cache.
const CACHE_KEY = '__retalhoDashboardCache'

type Holder = typeof globalThis & { [CACHE_KEY]?: WeakMap<Db, Dashboard> }

function cache(): WeakMap<Db, Dashboard> {
  const holder = globalThis as Holder
  holder[CACHE_KEY] ??= new WeakMap()
  return holder[CACHE_KEY]
}

function sum(db: Db, sql: string): number {
  return db.prepare(sql).pluck().get() as number
}

function compute(db: Db): Dashboard {
  return {
    soldCents: sum(
      db,
      `SELECT COALESCE(SUM(total_cents), 0) FROM orders
       WHERE status IN ('finalized', 'partially_invoiced', 'invoiced')`,
    ),
    invoicedCents: sum(
      db,
      `SELECT COALESCE(SUM(amount_cents), 0) FROM invoices WHERE status = 'issued'`,
    ),
    toInvoiceCents: sum(
      db,
      `SELECT COALESCE(SUM(balance_cents), 0) FROM orders
       WHERE status IN ('finalized', 'partially_invoiced')`,
    ),
  }
}

export function getDashboard(): Dashboard {
  const db = getDb()
  let summary = cache().get(db)
  if (!summary) {
    summary = compute(db)
    cache().set(db, summary)
  }
  return { ...summary }
}

export function invalidateDashboard(): void {
  cache().delete(getDb())
}
