import { enrollStudent, fillVacancies, waitingEntries } from './enrollment.ts'
import type {
  Enrollment,
  HistoryEntry,
  Goals,
  Group,
  Offer,
  Planner,
  Progress,
  Section,
  User,
} from '@matricula/contracts'
import type { Db } from '../db/database.ts'
import { transaction } from '../db/database.ts'
import { first, rows, pagination } from '../db/queries.ts'
import { HttpError } from '../http/input.ts'
import { withMeetings } from './meetings.ts'
import { blockingReason, fullSection } from './eligibility.ts'
import { calculateProgress, classify } from './progress.ts'
import type { Credit } from './progress.ts'

function courseCurriculum(db: Db, courseId: number) {
  const entries = rows<{ subjectId: number; category: Group }>(
    db,
    'SELECT subjectId,category FROM curriculum WHERE courseId=?',
    courseId,
  )
  return new Map(entries.map((row) => [row.subjectId, row.category]))
}

function studentRecords(db: Db, student: User) {
  const courseId = student.courseId!
  const goals = first<Goals & { semesterLimit: number }>(
    db,
    'SELECT * FROM courses WHERE id=?',
    courseId,
  )!
  const curriculum = courseCurriculum(db, courseId)
  const history = rows<HistoryEntry>(
    db,
    `SELECT h.id,h.subjectId,s.code,s.name,h.hours,h.result FROM history h
     JOIN subjects s ON s.id=h.subjectId WHERE h.studentId=? ORDER BY h.id`,
    student.id,
  )
  const approved = history.filter(entry => entry.result === 'aprovada')
  const active = rows<Credit>(
    db,
    `SELECT s.subjectId,e.hours FROM enrollments e JOIN sections s ON s.id=e.sectionId
    WHERE e.studentId=? AND e.status='ativa'`,
    student.id,
  )
  const semesterHours = active.reduce((sum, row) => sum + row.hours, 0)
  return { goals, curriculum, history, approved, active, semesterHours }
}

type Records = ReturnType<typeof studentRecords>

function summarize({ goals, curriculum, history, approved, active, semesterHours }: Records): Progress {
  return {
    history,
    groups: calculateProgress(goals, curriculum, approved, active),
    semesterHours,
    semesterLimit: goals.semesterLimit,
  }
}

export function progress(db: Db, student: User) {
  return summarize(studentRecords(db, student))
}

type Search = { q: string; page: number; eligible?: boolean; grouped?: boolean }

function offerCatalog(db: Db, records: Records, search: Search, selected: number[]) {
  const { curriculum, approved, active, goals, semesterHours } = records
  const passed = new Set(approved.map((row) => row.subjectId))
  const underway = new Set(active.map((row) => row.subjectId))
  const semesterLimit = goals.semesterLimit
  function classifyOffer(section: Section): Offer {
    const unavailable = blockingReason(section, {
      passed: passed.has(section.subjectId),
      enrolled: underway.has(section.subjectId),
      semesterHours,
      semesterLimit,
    })
    return { ...section, canWait: unavailable === fullSection, group: classify(curriculum, section.subjectId), unavailable }
  }
  const matching = rows<Section>(
    db,
    `SELECT * FROM section_details
    WHERE instr(fold(code || ' ' || name),fold(?))>0 ORDER BY fold(name),id`,
    search.q,
  )
    .filter(section => !passed.has(section.subjectId))
    .map(classifyOffer)
    .filter((offer) => !search.eligible || offer.unavailable === null)
  const units = search.grouped
    ? [...new Set(matching.map((s) => s.subjectId))]
    : matching.map((s) => s.id)
  const result = pagination(units.length, search.page)
  const offset = (result.page - 1) * result.pageSize
  const visible = new Set(units.slice(offset, offset + result.pageSize))
  const page = { ...result, items: matching.filter((s) => visible.has(search.grouped ? s.subjectId : s.id)) }
  const drafts = selected.length
    ? rows<Section>(
        db,
        'SELECT * FROM section_details WHERE id IN (SELECT value FROM json_each(?)) ORDER BY id',
        JSON.stringify(selected),
      ).map(classifyOffer)
    : []
  return {
    ...page,
    items: withMeetings(db, page.items),
    drafts: withMeetings(db, drafts),
    semesterHours,
    semesterLimit,
  }
}

export function offers(db: Db, student: User, search: Search) {
  const { drafts, ...page } = offerCatalog(db, studentRecords(db, student), search, [])
  return page
}

export function planner(db: Db, student: User, search: Search, selected: number[]): Planner {
  return transaction(
    db,
    () => {
      const records = studentRecords(db, student)
      return {
        ...offerCatalog(db, records, search, selected),
        progress: summarize(records),
        waitlist: waitingEntries(db, student.id),
        confirmed: enrollments(db, student, records.curriculum),
      }
    },
    'read',
  )
}

export function enroll(db: Db, student: User, sectionId: number) {
  return enrollStudent(db, student.id, sectionId)
}

export function enrollments(
  db: Db,
  student: User,
  curriculum = courseCurriculum(db, student.courseId!),
): Enrollment[] {
  const records = rows<Section & { enrollmentId: number; enrolledHours: number }>(
    db,
    `SELECT s.*,e.id AS enrollmentId,e.hours AS enrolledHours
    FROM enrollments e JOIN section_details s ON s.id=e.sectionId
    WHERE e.studentId=? AND e.status='ativa' ORDER BY fold(s.name), s.id`,
    student.id,
  )
  return withMeetings(db, records).map(({ enrolledHours, ...row }) => ({
    ...row,
    hours: enrolledHours,
    group: classify(curriculum, row.subjectId),
  }))
}
export function cancel(db: Db, studentId: number, id: number) {
  return transaction(db, () => {
    const row = db.prepare(`UPDATE enrollments SET status='cancelada'
      WHERE id=? AND studentId=? AND status='ativa' RETURNING sectionId`).get(id, studentId)
    if (!row) throw new HttpError(404, 'Matrícula ativa não encontrada.')
    fillVacancies(db, Number(row.sectionId))
  })
}
