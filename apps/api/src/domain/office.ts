import type { Db } from '../db/database.ts'
import { transaction } from '../db/database.ts'
import { parseMeetings, replaceMeetings } from './meetings.ts'
import { HttpError, integer, stringField } from '../http/input.ts'

export function saveSubject(db: Db, data: Record<string, unknown>, id?: number) {
  const code = stringField(data.code, 'o código', 24).toUpperCase()
  const name = stringField(data.name, 'o nome')
  const hours = integer(data.hours, 'a carga horária')
  if (hours < 15 || hours > 120 || hours % 15 !== 0)
    throw new HttpError(400, 'A carga horária deve ser múltipla de 15, entre 15h e 120h.')
  return transaction(db, () => {
    if (db.prepare('SELECT id FROM subjects WHERE code=? AND id<>?').get(code, id ?? 0)) {
      throw new HttpError(409, 'Este código de disciplina já está em uso.')
    }
    if (id === undefined) {
      return {
        id: Number(
          db.prepare('INSERT INTO subjects(code,name,hours) VALUES (?,?,?)').run(code, name, hours)
            .lastInsertRowid,
        ),
      }
    }
    if (
      !db.prepare('UPDATE subjects SET code=?,name=?,hours=? WHERE id=?').run(code, name, hours, id)
        .changes
    ) {
      throw new HttpError(404, 'Disciplina não encontrada.')
    }
    return { id }
  })
}
export function createProfessor(db: Db, data: Record<string, unknown>) {
  const name = stringField(data.name, 'o nome')
  const email = stringField(data.email, 'o e-mail', 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Informe um e-mail válido.')
  return transaction(db, () => {
    if (db.prepare('SELECT id FROM professors WHERE email=?').get(email))
      throw new HttpError(409, 'Este e-mail já está cadastrado.')
    return {
      id: Number(
        db.prepare('INSERT INTO professors(name,email) VALUES (?,?)').run(name, email).lastInsertRowid,
      ),
    }
  })
}
export function openSection(db: Db, data: Record<string, unknown>) {
  const subject = integer(data.subjectId, 'a disciplina')
  const professor = integer(data.professorId, 'o professor')
  const capacity = integer(data.capacity, 'as vagas')
  if (!db.prepare('SELECT id FROM subjects WHERE id=?').get(subject))
    throw new HttpError(404, 'Disciplina não encontrada.')
  if (!db.prepare('SELECT id FROM professors WHERE id=?').get(professor))
    throw new HttpError(404, 'Professor não encontrado.')
  const slots = parseMeetings(data.meetings === undefined ? [] : data.meetings)
  return transaction(db, () => {
    const id = Number(
      db
        .prepare('INSERT INTO sections(subjectId,professorId,capacity) VALUES (?,?,?)')
        .run(subject, professor, capacity).lastInsertRowid,
    )
    replaceMeetings(db, id, slots)
    return { id }
  })
}
export function changeMeetings(db: Db, id: number, input: unknown) {
  const slots = parseMeetings(input)
  return transaction(db, () => {
    if (!db.prepare('SELECT id FROM sections WHERE id=?').get(id))
      throw new HttpError(404, 'Turma não encontrada.')
    replaceMeetings(db, id, slots)
    return { id }
  })
}
export function resize(db: Db, id: number, value: unknown) {
  const capacity = integer(value, 'as vagas')
  return transaction(db, () => {
    const section = db.prepare('SELECT occupied FROM section_details WHERE id=?').get(id)
    if (!section) throw new HttpError(404, 'Turma não encontrada.')
    if (capacity < Number(section.occupied))
      throw new HttpError(409, `Já existem ${section.occupied} matrículas ativas nesta turma.`)
    db.prepare('UPDATE sections SET capacity=? WHERE id=?').run(capacity, id)
    return { id }
  })
}
