import type { Enrollment, WaitEntry } from '@matricula/contracts'
import { scheduleText } from '../../lib/week'
export function Selection({
  waitlist,
  leave,
  confirmed,
  locked,
  cancel,
}: {
  waitlist: WaitEntry[]
  leave: (id: number) => void
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
      {waitlist.length > 0 && (
        <section aria-label="Lista de espera">
          <h3>Lista de espera</h3>
          {waitlist.map(entry => (
            <article key={entry.id}>
              <div><strong>{entry.name}</strong><p>Turma {entry.sectionId} · {entry.professor}</p></div>
              {entry.reason ? <p>Inscrição encerrada: {entry.reason}</p> : (
                <>
                  <p>Em espera · {entry.position}ª posição</p>
                  <button className="text-btn" disabled={locked} onClick={() => leave(entry.id)}>Sair da fila</button>
                </>
              )}
            </article>
          ))}
        </section>
      )}
    </section>
  )
}
