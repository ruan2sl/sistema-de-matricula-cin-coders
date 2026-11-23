import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { loadDemoMeetings, openDatabase, transaction } from './db/database.ts'
import type { Db } from './db/database.ts'

export function seed(db: Db) {
  return transaction(db, () => {
    const empty = !db.prepare('SELECT id FROM courses LIMIT 1').get()
    if (empty) {
      db.exec(readFileSync(new URL('./db/demo.sql', import.meta.url), 'utf8'))
      loadDemoMeetings(db)
    }
    const added = db.prepare(`INSERT INTO users(username,name,role,courseId)
      SELECT 'carla','Carla Alves','aluno',id FROM courses WHERE name='Ciência da Computação'
      ON CONFLICT(username) DO NOTHING`).run()
    return empty || added.changes > 0
  })
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const db = openDatabase()
  console.log(seed(db) ? 'Dados de demonstração carregados.' : 'Base já inicializada.')
  db.close()
}
