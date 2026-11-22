import type { Enrollment, Offer } from '@matricula/contracts'
import { scheduleText } from '../../lib/week'
interface SelectionProps {
  drafts: Offer[]
  confirmed: Enrollment[]
  locked: boolean
  busy: boolean
  toggleDraft: (offer: Offer) => void
  confirm: (offer: Offer) => void
  cancel: (section: Enrollment) => void
}
export function Selection({
  drafts,
  confirmed,
  locked,
  busy,
  toggleDraft,
  confirm,
  cancel,
}: SelectionProps) {
  const previewHours = drafts.reduce((n, s) => n + s.hours, 0)
  return (
    <aside className="selection" id="matriculas" aria-label="Seleção e matrículas">
      <section>
        <div className="section-title">
          <h2>Minha seleção</h2>
          <span>{previewHours}h simuladas</span>
        </div>
        {drafts.length === 0 && (
          <p className="blank">Use “Simular” em uma oferta para montar sua grade.</p>
        )}
        <ul className="pick-list">
          {drafts.map((s) => (
            <li key={s.id}>
              <small className="metadata">
                {s.code} · Turma {s.id} · {s.hours}h
              </small>
              <h3>{s.name}</h3>
              <p>{scheduleText(s.meetings)}</p>
              {s.unavailable && <p className="reason">{s.unavailable}</p>}
              <div className="pick-actions">
                <button
                  className="primary"
                  disabled={locked || !!s.unavailable}
                  onClick={() => confirm(s)}
                >
                  Confirmar matrícula
                </button>
                <button className="text-btn" disabled={busy} onClick={() => toggleDraft(s)}>
                  Retirar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <div className="section-title active-title">
          <h2>Minhas matrículas</h2>
          <span>{confirmed.length} ativas</span>
        </div>
        {confirmed.length === 0 && <p className="blank">Você ainda não tem matrículas ativas.</p>}
        <ul className="pick-list">
          {confirmed.map((s) => (
            <li key={s.id}>
              <small className="metadata">
                {s.code} · Turma {s.id} · {s.hours}h
              </small>
              <h3>{s.name}</h3>
              <p>{scheduleText(s.meetings)}</p>
              <button className="text-btn" disabled={locked} onClick={() => cancel(s)}>
                Cancelar matrícula
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
