import type { Section, WaitEntry } from '@matricula/contracts'
import { transaction, type Db } from '../db/database.ts'
import { first, rows } from '../db/queries.ts'
import { HttpError } from '../http/input.ts'
import { blockingReason, fullSection } from './eligibility.ts'

function getSection(db: Db, id: number) {
  const section = first<Section>(db, 'SELECT * FROM section_details WHERE id=?', id)
  if (!section) throw new HttpError(404, 'Turma não encontrada.')
  return section
}

function enrollmentBlock(db: Db, section: Section, studentId: number) {
  const facts = db
    .prepare(
      `SELECT semesterLimit,
    EXISTS(SELECT 1 FROM history WHERE studentId=? AND subjectId=? AND result='aprovada') AS passed,
    EXISTS(SELECT 1 FROM enrollments e JOIN sections s ON s.id=e.sectionId
      WHERE e.studentId=? AND s.subjectId=? AND e.status='ativa') AS enrolled,
    (SELECT coalesce(sum(hours),0) FROM enrollments WHERE studentId=? AND status='ativa') AS semesterHours
    FROM courses JOIN users ON users.courseId=courses.id WHERE users.id=?`,
    )
    .get(studentId, section.subjectId, studentId, section.subjectId, studentId, studentId)!
  return blockingReason(section, {
    passed: Boolean(facts.passed),
    enrolled: Boolean(facts.enrolled),
    semesterHours: Number(facts.semesterHours),
    semesterLimit: Number(facts.semesterLimit),
  })
}

function createEnrollment(db: Db, section: Section, studentId: number) {
  const result = db
    .prepare('INSERT INTO enrollments(studentId,sectionId,hours) VALUES (?,?,?)')
    .run(studentId, section.id, section.hours)
  return { id: Number(result.lastInsertRowid) }
}

export function enrollStudent(db: Db, studentId: number, sectionId: number) {
  return transaction(db, () => {
    const section = getSection(db, sectionId)
    const reason = enrollmentBlock(db, section, studentId)
    if (reason) throw new HttpError(409, reason)
    return createEnrollment(db, section, studentId)
  })
}

export function joinQueue(db: Db, studentId: number, sectionId: number) {
  return transaction(db, () => {
    const reason = enrollmentBlock(db, getSection(db, sectionId), studentId)
    if (reason !== fullSection) throw new HttpError(409, reason ?? 'A turma tem vaga para matrícula direta.')
    const added = db.prepare('INSERT INTO waitlist(studentId,sectionId) VALUES (?,?) ON CONFLICT DO NOTHING')
      .run(studentId, sectionId)
    if (!added.changes) throw new HttpError(409, 'Você já está na fila desta turma.')
    return { id: Number(added.lastInsertRowid) }
  })
}

export function leaveQueue(db: Db, studentId: number, id: number) {
  const removed = db.prepare('DELETE FROM waitlist WHERE id=? AND studentId=? AND reason IS NULL').run(id, studentId)
  if (!removed.changes) throw new HttpError(404, 'Inscrição em espera não encontrada.')
}

export function waitingEntries(db: Db, studentId: number) {
  return rows<WaitEntry>(db, `SELECT w.id,w.sectionId,s.name,s.professor,w.reason,
    CASE WHEN w.reason IS NULL THEN (SELECT count(*) FROM waitlist prior
      WHERE prior.sectionId=w.sectionId AND prior.reason IS NULL AND prior.id<=w.id) END AS position
    FROM waitlist w JOIN section_details s ON s.id=w.sectionId WHERE w.studentId=? ORDER BY w.id`, studentId)
}

// O chamador mantém a transação de escrita que liberou as vagas.
export function fillVacancies(db: Db, sectionId: number) {
  const section = getSection(db, sectionId)
  while (section.occupied < section.capacity) {
    const next = first<{id: number; studentId: number}>(db,
      'SELECT id,studentId FROM waitlist WHERE sectionId=? AND reason IS NULL ORDER BY id LIMIT 1', sectionId)
    if (!next) break
    const reason = enrollmentBlock(db, section, next.studentId)
    if (reason) {
      db.prepare('UPDATE waitlist SET reason=? WHERE id=?').run(reason, next.id)
    } else {
      createEnrollment(db, section, next.studentId)
      db.prepare('DELETE FROM waitlist WHERE id=?').run(next.id)
      section.occupied++
    }
  }
}
