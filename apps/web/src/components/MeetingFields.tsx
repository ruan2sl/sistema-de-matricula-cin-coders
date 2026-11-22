import { useState } from 'react'
import type { Meeting } from '@matricula/contracts'
import { clock, days } from '../lib/week'

export function MeetingFields({ initial = [] }: { initial?: Meeting[] }) {
  const [slots, setSlots] = useState(
    initial.map((m, id) => ({ id, day: m.day, start: clock(m.start), end: clock(m.end) })),
  )
  const [next, setNext] = useState(slots.length)
  function edit(id: number, patch: Partial<{ day: number; start: string; end: string }>) {
    setSlots((old) => old.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)))
  }
  return (
    <fieldset className="meeting-fields">
      <legend>Encontros semanais</legend>
      {slots.map((slot, index) => (
        <div className="meeting-row" key={slot.id}>
          <label>
            Dia
            <select
              name="day"
              aria-label={'Dia do encontro ' + (index + 1)}
              value={slot.day}
              onChange={(e) => edit(slot.id, { day: Number(e.target.value) })}
            >
              {days.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Início
            <input
              type="time"
              name="start"
              aria-label={'Início do encontro ' + (index + 1)}
              required
              value={slot.start}
              onChange={(e) => edit(slot.id, { start: e.target.value })}
            />
          </label>
          <label>
            Fim
            <input
              type={slot.end === '24:00' ? 'text' : 'time'}
              name="end"
              aria-label={'Fim do encontro ' + (index + 1)}
              required
              value={slot.end}
              onChange={(e) => edit(slot.id, { end: e.target.value })}
            />
          </label>
          <button
            type="button"
            aria-label={'Remover encontro ' + (index + 1)}
            className="secondary"
            onClick={() => setSlots((old) => old.filter((s) => s.id !== slot.id))}
          >
            ×
          </button>
        </div>
      ))}
      {slots.length === 0 && <p className="muted">Horário a definir.</p>}
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setSlots((old) => [...old, { id: next, day: 1, start: '08:00', end: '10:00' }])
          setNext(next + 1)
        }}
      >
        Adicionar encontro
      </button>
    </fieldset>
  )
}
export function readMeetings(form: FormData): Meeting[] {
  const starts = form.getAll('start'),
    ends = form.getAll('end')
  function minutes(raw: FormDataEntryValue) {
    const [h, m] = String(raw).split(':').map(Number)
    return h * 60 + m
  }
  return form
    .getAll('day')
    .map((value, index) => ({
      day: Number(value),
      start: minutes(starts[index]),
      end: minutes(ends[index]),
    }))
}
