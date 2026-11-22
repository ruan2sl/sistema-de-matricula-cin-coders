import type { Meeting } from '@matricula/contracts'
import type { Db } from '../db/database.ts'
import { rows } from '../db/queries.ts'
import { HttpError } from '../http/input.ts'

export function parseMeetings(input: unknown): Meeting[] {
  if (!Array.isArray(input)) throw new HttpError(400, 'Informe uma lista de horários.')
  const slots = input
    .map((value): Meeting => {
      const { day, start, end } = value ?? {}
      if (
        ![day, start, end].every(Number.isInteger) ||
        day < 1 ||
        day > 7 ||
        start < 0 ||
        end > 1440 ||
        start >= end
      ) {
        throw new HttpError(400, 'Confira o dia da semana e os horários de início e fim.')
      }
      return { day, start, end }
    })
    .sort((a, b) => a.day - b.day || a.start - b.start)
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].day === slots[i - 1].day && slots[i].start < slots[i - 1].end) {
      throw new HttpError(400, 'Os encontros de uma mesma turma devem ter horários distintos.')
    }
  }
  return slots
}

export function replaceMeetings(db: Db, sectionId: number, slots: Meeting[]) {
  db.prepare('DELETE FROM meetings WHERE sectionId=?').run(sectionId)
  const insert = db.prepare('INSERT INTO meetings(sectionId,day,start,end) VALUES (?,?,?,?)')
  for (const slot of slots) insert.run(sectionId, slot.day, slot.start, slot.end)
}

export function withMeetings<T extends { id: number }>(db: Db, sections: T[]) {
  const ids = sections.map((section) => section.id)
  const grouped = new Map<number, Meeting[]>()
  if (ids.length) {
    const records = rows<Meeting & { sectionId: number }>(
      db,
      'SELECT * FROM meetings WHERE sectionId IN (SELECT value FROM json_each(?)) ORDER BY day,start',
      JSON.stringify(ids),
    )
    for (const { sectionId, ...slot } of records) {
      const list = grouped.get(sectionId) ?? []
      list.push(slot)
      grouped.set(sectionId, list)
    }
  }
  return sections.map((section) => ({ ...section, meetings: grouped.get(section.id) ?? [] }))
}
