import type { Offer, Page } from '@matricula/contracts'
import { Empty, groupName, Pager, Search } from '../../components/shared'
import { scheduleText } from '../../lib/week'

interface CatalogProps {
  data: Page<Offer>
  q: string
  eligible: boolean
  filter: (value: boolean) => void
  confirmed: ReadonlySet<number>
  draftSet: ReadonlySet<number>
  pending: boolean
  locked: boolean
  toggleDraft: (offer: Offer) => void
}
export function Catalog({
  data,
  q,
  eligible,
  filter,
  confirmed,
  draftSet,
  pending,
  locked,
  toggleDraft,
}: CatalogProps) {
  return (
    <section className="catalog" aria-labelledby="offers-title">
      <div className="section-title">
        <h2 id="offers-title">Ofertas de turmas</h2>
        <span>{data.total} turmas</span>
      </div>
      <Search q={q} placeholder="Buscar disciplina ou código" />
      <label className="check-label eligible">
        <input type="checkbox" checked={eligible} onChange={(e) => filter(e.target.checked)} /> Somente
        turmas em que posso me matricular
      </label>
      {data.items.length === 0 ? (
        <Empty
          q={q}
          message={eligible ? 'Nenhuma turma elegível para este filtro.' : 'Ainda não há ofertas.'}
        />
      ) : (
        <ul className="offer-list" aria-busy={pending}>
          {data.items.map((s) => (
            <li key={s.id}>
              <span className={'course-swatch tone-' + (s.subjectId % 6)} aria-hidden="true" />
              <div className="offer-body">
                <small className="metadata">
                  {s.code} · Turma {s.id}
                </small>
                <h3>{s.name}</h3>
                <p>
                  {s.professor} · {s.hours}h · {groupName[s.group]}
                </p>
                <p>{scheduleText(s.meetings)}</p>
                <small>
                  {s.capacity - s.occupied} de {s.capacity} vagas disponíveis
                </small>
                {s.unavailable && !confirmed.has(s.id) && <p className="reason">{s.unavailable}</p>}
              </div>
              <div className="offer-actions">
                {confirmed.has(s.id) ? (
                  <span className="registered">Matriculada</span>
                ) : (
                  <button
                    className="secondary"
                    aria-label={
                      (draftSet.has(s.id) ? 'Retirar ' : 'Simular ') + s.name + ' · Turma ' + s.id
                    }
                    disabled={locked}
                    onClick={() => toggleDraft(s)}
                  >
                    {draftSet.has(s.id) ? 'Retirar' : 'Simular'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager q={q} page={data} />
    </section>
  )
}
