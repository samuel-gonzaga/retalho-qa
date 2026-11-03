/**
 * Conexão SQLite única por processo (RNF-04). O caminho vem de RETALHO_DB_PATH;
 * ':memory:' dá um banco descartável, usado pelos testes.
 */
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { SCHEMA } from './schema'

export type Db = Database.Database

const DEFAULT_PATH = 'data/retalho.db'
const HOLDER_KEY = '__retalhoDb'

type Holder = typeof globalThis & { [HOLDER_KEY]?: Db }

export function databasePath(): string {
  return process.env.RETALHO_DB_PATH || DEFAULT_PATH
}

function open(): Db {
  const path = databasePath()
  const inMemory = path === ':memory:'
  if (!inMemory) mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  if (!inMemory) db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}

// Guardada em globalThis para sobreviver ao recarregamento de módulos do `next dev`.
export function getDb(): Db {
  const holder = globalThis as Holder
  holder[HOLDER_KEY] ??= open()
  return holder[HOLDER_KEY]
}

/** Fecha a conexão atual e abre outra. Com ':memory:', o banco novo começa vazio. */
export function resetDatabase(): Db {
  const holder = globalThis as Holder
  holder[HOLDER_KEY]?.close()
  holder[HOLDER_KEY] = undefined
  return getDb()
}
