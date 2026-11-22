import type { CSSProperties } from 'react'
import { clock, days, layoutDay } from '../../lib/week'
import type { Entry, Kind } from '../../lib/week'

export const statusName: Record<Kind, string> = {
  offer: 'Oferta',
  draft: 'Simulada',
  confirmed: 'Matriculada',
}
export function Timetable({
  entries,
  onInspect,
  showOffers,
  setShowOffers,
  day: mobileDay,
  setDay: setMobileDay,
}: {
  entries: Entry[]
  onInspect: (entry: Entry) => void
  day: number
  setDay: (day: number) => void
  showOffers: boolean
  setShowOffers: (value: boolean) => void
}) {
  const visible = entries.filter((e) => showOffers || e.kind !== 'offer')
  const slots = visible.flatMap((e) => e.section.meetings)
  const start = Math.floor(Math.min(480, ...slots.map((s) => s.start)) / 120) * 120
  const end = Math.ceil(Math.max(1080, ...slots.map((s) => s.end)) / 120) * 120
  const ticks = Array.from({ length: (end - start) / 120 + 1 }, (_, i) => start + i * 120)
  const shownDays = days
    .map((name, i) => ({ day: i + 1, name }))
    .filter(({ day }) => day <= 5 || slots.some((slot) => slot.day === day))
  const chosenDay = shownDays.some(({ day }) => day === mobileDay) ? mobileDay : 1
  return (
    <section className="timetable" aria-labelledby="week-title">
      <header className="week-head">
        <h2 id="week-title">Grade semanal</h2>
        <label className="check-label">
          <input
            type="checkbox"
            checked={showOffers}
            onChange={(e) => setShowOffers(e.target.checked)}
          />{' '}
          Mostrar ofertas da página
        </label>
      </header>
      <div className="mobile-days" aria-label="Dia da semana">
        {shownDays.map(({ day, name }) => (
          <button
            key={day}
            type="button"
            aria-pressed={day === chosenDay}
            onClick={() => setMobileDay(day)}
          >
            {name.slice(0, 3)}
          </button>
        ))}
      </div>
      <div className="week-grid" style={{ '--columns': ticks.length - 1 } as CSSProperties}>
        <div className="week-axis">
          <span>Dia / hora</span>
          <div>
            {ticks.map((t) => (
              <small key={t} style={{ left: (100 * (t - start)) / (end - start) + '%' }}>
                {clock(t)}
              </small>
            ))}
          </div>
        </div>
        {shownDays.map(({ day, name }) => {
          const { blocks, lanes } = layoutDay(visible, day)
          return (
            <div
              className={'week-row' + (chosenDay === day ? ' mobile-current' : '')}
              key={day}
              aria-label={name}
            >
              <strong className="day-label">{name}</strong>
              <div className="day-track" style={{ '--lanes': lanes } as CSSProperties}>
                {!blocks.length && <span className="no-meeting">Sem encontros</span>}
                {blocks.map((b) => {
                  const s = b.section
                  const label = `${s.name} · ${s.code} · Turma ${s.id} · ${name} ${clock(b.start)}–${clock(b.end)} · ${statusName[b.kind]}`
                  return (
                    <button
                      key={s.id + '-' + b.start}
                      type="button"
                      aria-label={label}
                      title={label}
                      className={`time-block tone-${s.subjectId % 6} ${b.kind}`}
                      style={{
                        left: (100 * (b.start - start)) / (end - start) + '%',
                        width: (100 * (b.end - b.start)) / (end - start) + '%',
                        top: 5 + b.lane * 40,
                      }}
                      onClick={() => onInspect(b)}
                    >
                      <strong>
                        {s.code} <span>· T{s.id}</span>
                      </strong>
                      <small>
                        {clock(b.start)}–{clock(b.end)}
                      </small>
                      <span className="mobile-name">
                        {s.name} · {statusName[b.kind]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="week-legend">
        {(['offer', 'draft', 'confirmed'] as const).map((kind) => (
          <span key={kind}>
            <i className={kind} />
            {statusName[kind]}
          </span>
        ))}
      </div>
    </section>
  )
}
