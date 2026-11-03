/**
 * Produtos: cadastro, edição e busca (RF-01 a RF-05).
 */
import { getDb } from '@/db/client'
import { LIKE_ESCAPE, likePattern } from '@/db/sql'
import { ERROR_MESSAGES as E } from '@/domain/messages'
import { fromHundredths } from '@/domain/numbers'
import { searchKey } from '@/domain/text'
import { rollPriceCents, type Unit } from '@/domain/units'
import { validateProductInput, type ProductInput } from '@/domain/validation'
import { now } from './clock'
import { ApiError, notFound, unwrap } from './errors'
import { requireJson } from './http'

export type ProductRow = {
  id: number
  code: string
  name: string
  unit: Unit
  price_cents: number
  roll_length_centi: number | null
  created_at: string
  updated_at: string
}

export type Product = {
  id: number
  code: string
  name: string
  unit: Unit
  priceCents: number
  rollLength: number | null
  rollPriceCents: number | null
  createdAt: string
  updatedAt: string
}

function toProduct(row: ProductRow): Product {
  const isRoll = row.unit === 'roll' && row.roll_length_centi !== null
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    unit: row.unit,
    priceCents: row.price_cents,
    rollLength: row.roll_length_centi === null ? null : fromHundredths(row.roll_length_centi),
    rollPriceCents: isRoll ? rollPriceCents(row.roll_length_centi ?? 0, row.price_cents) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function productSearchKey(input: ProductInput): string {
  return `${searchKey(input.name)} ${searchKey(input.code)}`
}

export function findProductRow(id: number): ProductRow | undefined {
  return getDb().prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined
}

function requireProduct(id: number | null): ProductRow {
  const row = id === null ? undefined : findProductRow(id)
  if (!row) throw notFound('Produto')
  return row
}

function assertUniqueCode(code: string, exceptId = 0): void {
  const taken = getDb()
    .prepare('SELECT 1 FROM products WHERE code = ? AND id <> ?')
    .get(code, exceptId)
  if (taken) throw new ApiError('DUPLICATE_PRODUCT_CODE', E.duplicateProductCode(code))
}

/** RF-04: trecho do nome ou do código, sem diferenciar maiúsculas, minúsculas e acentos. */
export function listProducts(query = ''): Product[] {
  const rows = getDb()
    .prepare(`SELECT * FROM products WHERE search_key LIKE ? ${LIKE_ESCAPE} ORDER BY search_key`)
    .all(likePattern(searchKey(query))) as ProductRow[]
  return rows.map(toProduct)
}

export function getProduct(id: number | null): Product {
  return toProduct(requireProduct(id))
}

export function createProduct(body: unknown): Product {
  const input = unwrap(validateProductInput(requireJson(body)))
  assertUniqueCode(input.code)
  const at = now()
  const info = getDb()
    .prepare(
      `INSERT INTO products
        (code, name, search_key, unit, price_cents, roll_length_centi, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.code,
      input.name,
      productSearchKey(input),
      input.unit,
      input.priceCents,
      input.rollLengthCenti,
      at,
      at,
    )
  return getProduct(Number(info.lastInsertRowid))
}

/** RF-03: os itens já lançados guardam a própria cópia e não mudam. */
export function updateProduct(id: number | null, body: unknown): Product {
  const row = requireProduct(id)
  const input = unwrap(validateProductInput(requireJson(body)))
  assertUniqueCode(input.code, row.id)
  getDb()
    .prepare(
      `UPDATE products
       SET code = ?, name = ?, search_key = ?, unit = ?, price_cents = ?, roll_length_centi = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.code,
      input.name,
      productSearchKey(input),
      input.unit,
      input.priceCents,
      input.rollLengthCenti,
      now(),
      row.id,
    )
  return getProduct(row.id)
}
