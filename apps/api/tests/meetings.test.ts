import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../src/db/database.ts'
import { seed } from '../src/seed.ts'
import type { Entry } from '../../web/src/lib/week.ts'
import { layoutDay, conflicts } from '../../web/src/lib/week.ts'

function section(id: number, day: number, start: number, end: number): Entry {
  return {
    kind: 'draft',
    section: {
      id,
      subjectId: id,
      code: 'T' + id,
      name: 'Turma ' + id,
      hours: 60,
      capacity: 2,
      occupied: 0,
      professor: 'Ana',
      meetings: [{ day, start, end }],
    },
  }
}
test('grade reaproveita faixas em encontros consecutivos e sinaliza apenas a parte sobreposta', () => {
  const entries = [
    section(1, 1, 480, 600),
    section(2, 1, 510, 570),
    section(3, 1, 570, 600),
    section(4, 1, 600, 660),
    section(5, 2, 510, 570),
  ]
  assert.deepEqual(
    layoutDay(entries, 1).blocks.map((b) => b.lane),
    [0, 1, 1, 0],
  )
  const overlaps = conflicts([...entries, { ...section(6, 1, 510, 570), kind: 'offer' }])
  assert.deepEqual(
    overlaps.map((o) => [o.first.id, o.second.id, o.slot.start, o.slot.end]),
    [
      [1, 2, 510, 570],
      [1, 3, 570, 600],
    ],
  )
})
test('migração de uma base anterior preserva matrículas e horários posteriores da secretaria', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'matricula-legado-'))
  const path = join(dir, 'teste.sqlite')
  let db = openDatabase(path)
  t.after(() => {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })
  seed(db)
  db.exec(
    'INSERT INTO enrollments(studentId,sectionId,hours) VALUES (1,1,60); DROP TABLE meetings; PRAGMA user_version=0',
  )
  db.close()
  db = openDatabase(path)
  assert.equal(db.prepare('SELECT count(*) AS n FROM meetings').get()!.n, 18)
  assert.equal(db.prepare('SELECT occupied FROM section_details WHERE id=1').get()!.occupied, 1)
  db.exec('DELETE FROM meetings WHERE sectionId=1')
  db.close()
  db = openDatabase(path)
  assert.equal(db.prepare('SELECT count(*) AS n FROM meetings WHERE sectionId=1').get()!.n, 0)
})
