import type { SQLInputValue } from 'node:sqlite'
import type { Db } from './database.ts'

export function rows<T>(db: Db, sql: string, ...params: SQLInputValue[]): T[] {
  return db.prepare(sql).all(...params) as unknown as T[]
}
export function first<T>(db: Db, sql: string, ...params: SQLInputValue[]): T | undefined {
  return db.prepare(sql).get(...params) as unknown as T | undefined
}

export function catalogPage<T>(
  db: Db,
  source: 'subjects' | 'section_details',
  search: { q: string; page: number },
) {
  const pageSize = 6
  const where = 'WHERE instr(fold(code || char(32) || name), fold(?)) > 0'
  const total = Number(db.prepare(`SELECT count(*) AS n FROM ${source} ${where}`).get(search.q)!.n)
  const page = Math.min(search.page, Math.max(1, Math.ceil(total / pageSize)))
  const items = rows<T>(
    db,
    `SELECT * FROM ${source} ${where} ORDER BY fold(name), id LIMIT ? OFFSET ?`,
    search.q,
    pageSize,
    (page - 1) * pageSize,
  )
  return { items, total, page, pageSize }
}
