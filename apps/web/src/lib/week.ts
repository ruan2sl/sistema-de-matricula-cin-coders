import type { Meeting, Section } from '@matricula/contracts'

export const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
export function clock(minutes: number) {
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')
}
export function scheduleText(slots: Meeting[]) {
  return (
    slots
      .map((slot) => `${days[slot.day - 1].slice(0, 3)} ${clock(slot.start)}–${clock(slot.end)}`)
      .join(' · ') || 'Horário a definir'
  )
}
export type Kind = 'offer' | 'draft' | 'confirmed'
export interface Entry {
  section: Section
  kind: Kind
}
export interface Block extends Entry, Meeting {
  lane: number
}

// Encontros ordenados reutilizam a primeira faixa que já terminou.
export function layoutDay(entries: Entry[], day: number) {
  const meetings = entries
    .flatMap((entry) =>
      entry.section.meetings.filter((m) => m.day === day).map((slot) => ({ ...entry, ...slot })),
    )
    .sort((a, b) => a.start - b.start || a.end - b.end || a.section.id - b.section.id)
  const ends: number[] = []
  const blocks: Block[] = meetings.map((meeting) => {
    const free = ends.findIndex((end) => end <= meeting.start)
    const lane = free === -1 ? ends.length : free
    ends[lane] = meeting.end
    return { ...meeting, lane }
  })
  return { blocks, lanes: Math.max(1, ends.length) }
}

export function conflicts(entries: Entry[]) {
  const result: { first: Section; second: Section; slot: Meeting }[] = []
  const planned = entries.filter((e) => e.kind !== 'offer')
  for (let day = 1; day <= 7; day++) {
    const { blocks } = layoutDay(planned, day)
    for (let i = 0; i < blocks.length; i++) {
      const a = blocks[i]
      for (let j = i + 1; j < blocks.length && blocks[j].start < a.end; j++) {
        const b = blocks[j]
        result.push({
          first: a.section,
          second: b.section,
          slot: { day, start: b.start, end: Math.min(a.end, b.end) },
        })
      }
    }
  }
  return result
}
