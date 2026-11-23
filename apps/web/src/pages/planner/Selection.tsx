import type { Enrollment } from '@matricula/contracts'
import { scheduleText } from '../../lib/week'
export function Selection({
  confirmed,
  locked,
  cancel,
}: {
  confirmed: Enrollment[]
  locked: boolean
  cancel: (s: Enrollment) => void
}) {
  return (
    <section id="matriculas" className="enrolled-panel" aria-labelledby="matriculas-title">
      <h2 id="matriculas-title">Minhas matrículas</h2>
      {!confirmed.length && <p className="muted">Suas turmas confirmadas aparecerão aqui.</p>}
      {confirmed.map((s) => (
        <article key={s.id}>
          <div>
            <strong>{s.name}</strong>
            <p>Turma {s.id} · {s.professor}</p>
          </div>
          <p>{scheduleText(s.meetings)}</p>
          <button className="text-btn" disabled={locked} onClick={() => cancel(s)}>
            Cancelar matrícula
          </button>
        </article>
      ))}
    </section>
  )
}
