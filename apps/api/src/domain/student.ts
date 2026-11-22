import type { Enrollment, Goals, Group, Offer, Progress, Section, User } from '@matricula/contracts'
import type { Db } from '../db/database.ts'
import { transaction } from '../db/database.ts'
import { catalogPage, first, rows } from '../db/queries.ts'
import { HttpError } from '../http/input.ts'
import { calculateProgress, classify } from './progress.ts'
import type { Credit } from './progress.ts'

function studentRecords(db: Db, student: User) {
  const courseId = student.courseId!
  const goals = first<Goals & { semesterLimit: number }>(db, 'SELECT * FROM courses WHERE id=?', courseId)!
  const entries = rows<{ subjectId: number; category: Group }>(db, 'SELECT * FROM curriculum WHERE courseId=?', courseId)
  const curriculum = new Map(entries.map(row => [row.subjectId, row.category]))
  const approved = rows<Credit>(db, `SELECT subjectId,hours FROM history
    WHERE studentId=? AND result='aprovada' ORDER BY id`, student.id)
  const active = rows<Credit>(db, `SELECT s.subjectId,e.hours FROM enrollments e JOIN sections s ON s.id=e.sectionId
    WHERE e.studentId=? AND e.status='ativa'`, student.id)
  const semesterHours = active.reduce((sum, row) => sum + row.hours, 0)
  return { goals, curriculum, approved, active, semesterHours }
}

export function progress(db: Db, student: User): Progress {
  const { goals, curriculum, approved, active, semesterHours } = studentRecords(db, student)
  return { groups: calculateProgress(goals, curriculum, approved, active), semesterHours, semesterLimit: goals.semesterLimit }
}

function eligibility(db: Db, student: User) {
  const { curriculum, approved, active, goals, semesterHours } = studentRecords(db, student)
  const passed = new Set(approved.map(row => row.subjectId))
  const underway = new Set(active.map(row => row.subjectId))
  function reason(section: Section) {
    if (passed.has(section.subjectId)) return 'Disciplina já aprovada.'
    if (underway.has(section.subjectId)) return 'Você já cursa esta disciplina neste semestre.'
    if (section.occupied >= section.capacity) return 'Turma lotada.'
    if (semesterHours + section.hours > goals.semesterLimit) return `Limite de ${goals.semesterLimit}h por semestre. Restam ${goals.semesterLimit - semesterHours}h disponíveis.`
    return null
  }
  return { curriculum, reason, semesterHours, semesterLimit: goals.semesterLimit }
}

export function offers(db: Db, student: User, search: { q: string; page: number }) {
  const page = catalogPage<Section>(db, 'section_details', search)
  const { curriculum, reason, semesterHours, semesterLimit } = eligibility(db, student)
  const items: Offer[] = page.items.map(section => ({
    ...section, group: classify(curriculum, section.subjectId), unavailable: reason(section)
  }))
  return { ...page, items, semesterHours, semesterLimit }
}

export function enroll(db: Db, student: User, sectionId: number) {
  return transaction(db, () => {
    const section = first<Section>(db, 'SELECT * FROM section_details WHERE id=?', sectionId)
    if (!section) throw new HttpError(404, 'Turma não encontrada.')
    const reason = eligibility(db, student).reason(section)
    if (reason) throw new HttpError(409, reason)
    const result = db.prepare('INSERT INTO enrollments(studentId,sectionId,hours) VALUES (?,?,?)')
      .run(student.id, section.id, section.hours)
    return { id: Number(result.lastInsertRowid) }
  })
}

export function enrollments(db: Db, student: User): Enrollment[] {
  const records = rows<Section & { enrollmentId: number; enrolledHours: number }>(db, `SELECT s.*,e.id AS enrollmentId,e.hours AS enrolledHours
    FROM enrollments e JOIN section_details s ON s.id=e.sectionId
    WHERE e.studentId=? AND e.status='ativa' ORDER BY fold(s.name), s.id`, student.id)
  const { curriculum } = studentRecords(db, student)
  return records.map(({ enrolledHours, ...row }) => ({ ...row, hours: enrolledHours, group: classify(curriculum, row.subjectId) }))
}
export function cancel(db: Db, studentId: number, id: number) {
  const result = db.prepare("UPDATE enrollments SET status='cancelada' WHERE id=? AND studentId=? AND status='ativa'").run(id, studentId)
  if (!result.changes) throw new HttpError(404, 'Matrícula ativa não encontrada.')
}
