import type { Offer, Page } from '@matricula/contracts'
import { Empty, groupName, Pager, Search } from '../../components/shared'
import { scheduleText } from '../../lib/week'
interface Props {
  data: Page<Offer>
  q: string
  eligible: boolean
  filter: (v: boolean) => void
  confirmed: Set<number>
  preview: number | null
  view: (s: Offer) => void
  enroll: (s: Offer) => void
  locked: boolean
}
export function Catalog({ data, q, eligible, filter, confirmed, preview, view, enroll, locked }: Props) {
  return (
    <section className="catalog" aria-labelledby="offers-title">
      <div className="section-title">
        <h2 id="offers-title">Ofertas de turmas</h2>
        <small>{data.total} turmas</small>
      </div>
      <Search q={q} placeholder="Buscar disciplina ou código" />
      <label className="check-label">
        <input type="checkbox" checked={eligible} onChange={(e) => filter(e.target.checked)} /> Somente
        turmas em que posso me matricular
      </label>
      {!data.items.length && <Empty q={q} message="Nenhuma turma disponível para este filtro." />}
      <ul className="offer-cards">
        {data.items.map((s) => (
          <li key={s.id}>
            <div className="course-code">
              <strong>{s.code}</strong>
              <span>Turma {s.id}</span>
            </div>
            <h3>{s.name}</h3>
            <p>
              {s.professor} · {s.hours}h
            </p>
            <small>{groupName[s.group]}</small>
            <p className="course-times">{scheduleText(s.meetings)}</p>
            <strong className="seats">{s.capacity - s.occupied} vagas disponíveis</strong>
            {confirmed.has(s.id) ? (
              <p className="registered">Matrícula confirmada</p>
            ) : (
              <>
                <div className="course-buttons">
                  <button className="secondary" aria-pressed={preview === s.id} onClick={() => view(s)}>
                    {preview === s.id ? 'Fechar prévia' : 'Ver na grade'}
                  </button>
                  <button
                    className="primary"
                    disabled={locked || !!s.unavailable}
                    onClick={() => enroll(s)}
                  >
                    Matricular-se
                  </button>
                </div>
                {s.unavailable && <small>{s.unavailable}</small>}
              </>
            )}
          </li>
        ))}
      </ul>
      <Pager page={data} q={q} />
    </section>
  )
}
