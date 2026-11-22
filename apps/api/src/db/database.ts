import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export type Db = DatabaseSync
export const defaultPath =
  process.env.DB_PATH || fileURLToPath(new URL('../../../../data/matricula.sqlite', import.meta.url))

export function openDatabase(path = defaultPath) {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true })
  const db = new DatabaseSync(path)
  db.function('fold', { deterministic: true }, (value) =>
    String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(),
  )
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL')
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
  return db
}

export function transaction<T>(db: Db, operation: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = operation()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
