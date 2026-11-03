/**
 * Clientes: cadastro, edição e busca (RF-06 a RF-11).
 */
import { getDb } from '@/db/client'
import { LIKE_ESCAPE, likePattern } from '@/db/sql'
import { formatCnpj, formatCpf } from '@/domain/documents'
import { ERROR_MESSAGES as E } from '@/domain/messages'
import { searchKey } from '@/domain/text'
import { validateCustomerInput, type CustomerInput } from '@/domain/validation'
import { now } from './clock'
import { ApiError, notFound, unwrap } from './errors'
import { requireJson } from './http'
import { recalculateDraftsOf } from './orders'

type CustomerRow = {
  id: number
  type: 'PF' | 'PJ'
  name: string
  document: string
  cep: string
  created_at: string
  updated_at: string
}

export type Customer = {
  id: number
  type: 'PF' | 'PJ'
  name: string
  document: string
  documentFormatted: string
  cep: string
  createdAt: string
  updatedAt: string
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    document: row.document,
    documentFormatted: row.type === 'PF' ? formatCpf(row.document) : formatCnpj(row.document),
    cep: row.cep,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function requireCustomer(id: number | null): CustomerRow {
  const row =
    id === null
      ? undefined
      : (getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerRow | undefined)
  if (!row) throw notFound('Cliente')
  return row
}

function assertUniqueDocument(input: CustomerInput, exceptId = 0): void {
  const taken = getDb()
    .prepare('SELECT 1 FROM customers WHERE document = ? AND id <> ?')
    .get(input.document, exceptId)
  if (taken) {
    throw new ApiError(
      'DUPLICATE_DOCUMENT',
      E.duplicateDocument(input.type === 'PF' ? 'CPF' : 'CNPJ'),
    )
  }
}

/** RF-11: trecho do nome (sem acentos) ou caracteres do documento, sem máscara. */
export function listCustomers(query = ''): Customer[] {
  const db = getDb()
  const nameTerm = likePattern(searchKey(query))
  const documentTerm = query.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const rows = /\d/.test(documentTerm)
    ? db
        .prepare(
          `SELECT * FROM customers
           WHERE search_key LIKE ? ${LIKE_ESCAPE} OR document LIKE ? ${LIKE_ESCAPE}
           ORDER BY search_key`,
        )
        .all(nameTerm, likePattern(documentTerm))
    : db
        .prepare(
          `SELECT * FROM customers WHERE search_key LIKE ? ${LIKE_ESCAPE} ORDER BY search_key`,
        )
        .all(nameTerm)
  return (rows as CustomerRow[]).map(toCustomer)
}

export function getCustomer(id: number | null): Customer {
  return toCustomer(requireCustomer(id))
}

export function createCustomer(body: unknown): Customer {
  const input = unwrap(validateCustomerInput(requireJson(body)))
  assertUniqueDocument(input)
  const at = now()
  const info = getDb()
    .prepare(
      `INSERT INTO customers (type, name, search_key, document, cep, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(input.type, input.name, searchKey(input.name), input.document, input.cep, at, at)
  return getCustomer(Number(info.lastInsertRowid))
}

/** Editar o cliente recalcula os rascunhos dele; pedidos finalizados ficam congelados (RF-24). */
export function updateCustomer(id: number | null, body: unknown): Customer {
  const row = requireCustomer(id)
  const input = unwrap(validateCustomerInput(requireJson(body)))
  assertUniqueDocument(input, row.id)
  const db = getDb()
  db.transaction(() => {
    db.prepare(
      `UPDATE customers
       SET type = ?, name = ?, search_key = ?, document = ?, cep = ?, updated_at = ?
       WHERE id = ?`,
    ).run(input.type, input.name, searchKey(input.name), input.document, input.cep, now(), row.id)
    recalculateDraftsOf(row.id)
  })()
  return getCustomer(row.id)
}
