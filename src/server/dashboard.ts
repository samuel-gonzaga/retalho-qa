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

/** O resumo e a versão dos dados do SQLite no momento em que ele foi calculado. */
type Cached = { summary: Dashboard; dataVersion: number }

type Holder = typeof globalThis & { [CACHE_KEY]?: WeakMap<Db, Cached> }

function cache(): WeakMap<Db, Cached> {
  const holder = globalThis as Holder
  holder[CACHE_KEY] ??= new WeakMap()
  return holder[CACHE_KEY]
}

/**
 * `data_version` muda quando outra conexão grava no banco (o seed com o servidor aberto, por
 * exemplo). As gravações desta conexão não o mudam: essas invalidam o cache pelas ações (RF-39).
 */
function dataVersion(db: Db): number {
  return db.pragma('data_version', { simple: true }) as number
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
  const version = dataVersion(db)
  let cached = cache().get(db)
  if (!cached || cached.dataVersion !== version) {
    cached = { summary: compute(db), dataVersion: version }
    cache().set(db, cached)
  }
  return { ...cached.summary }
}

export function invalidateDashboard(): void {
  cache().delete(getDb())
}
