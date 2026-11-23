import { courseColor } from '../../lib/courseColor'
import type { Entry } from '../../lib/week'
import { days, clock, layoutDay } from '../../lib/week'

export function Timetable({
  entries,
  onInspect,
}: {
  entries: Entry[]
  onInspect: (entry: Entry) => void
}) {
  const meetings = entries.flatMap((e) => e.section.meetings)
  const start = Math.floor(Math.min(480, ...meetings.map((m) => m.start)) / 60) * 60
  const end = Math.ceil(Math.max(1080, ...meetings.map((m) => m.end)) / 60) * 60
  const hours = Array.from({ length: (end - start) / 60 }, (_, i) => start + i * 60)
  const columns = days.filter((_, i) => i < 5 || meetings.some((m) => m.day === i + 1))
  return (
    <section className="schedule-panel" aria-labelledby="week-title">
      <h2 id="week-title">Grade semanal</h2>
      <div className="calendar-scroll">
        <div
          className="vertical-grid"
          style={{ gridTemplateColumns: '40px repeat(' + columns.length + ', minmax(50px,1fr))' }}
        >
          <span className="weekday">Hora</span>
          {columns.map((d) => (
            <strong className="weekday" key={d}>
              {d.slice(0, 3)}
            </strong>
          ))}
          <div className="hour-axis">
            {hours.map((h) => (
              <span key={h}>{clock(h)}</span>
            ))}
          </div>
          {columns.map((name) => {
            const { blocks, lanes } = layoutDay(entries, days.indexOf(name) + 1)
            return (
              <div key={name} aria-label={name} className="vertical-day">
                {blocks.map((b) => {
                  const label =
                    name +
                    ' ' +
                    clock(b.start) +
                    '–' +
                    clock(b.end) +
                    ' · ' +
                    b.section.name +
                    ' · ' +
                    (b.kind === 'draft' ? 'Prévia' : 'Matrícula confirmada')
                  return (
                    <button
                      key={b.section.id + '-' + b.start}
                      title={label}
                      aria-label={label}
                      onClick={() => onInspect(b)}
                      className={'calendar-event ' + b.kind}
                      style={{
                        ...courseColor(b.section.subjectId, b.section.id),
                        top: ((b.start - start) / (end - start)) * 100 + '%',
                        height: ((b.end - b.start) / (end - start)) * 100 + '%',
                        left: (b.lane / lanes) * 100 + '%',
                        width: 100 / lanes + '%',
                      }}
                    >
                      <strong>{b.section.code}</strong>
                      <small>T{b.section.id}</small>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <div className="calendar-key">
        <span>● Matriculada</span>
        <span>┄ Prévia</span>
      </div>
    </section>
  )
}
