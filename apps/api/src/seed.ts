import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { openDatabase, transaction } from './db/database.ts'
import type { Db } from './db/database.ts'

export function seed(db: Db) {
  return transaction(db, () => {
    if (db.prepare('SELECT id FROM courses LIMIT 1').get()) return false
    db.exec(readFileSync(new URL('./db/demo.sql', import.meta.url), 'utf8'))
    return true
  })
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const db = openDatabase()
  console.log(seed(db) ? 'Dados de demonstração carregados.' : 'Base já inicializada.')
  db.close()
}
