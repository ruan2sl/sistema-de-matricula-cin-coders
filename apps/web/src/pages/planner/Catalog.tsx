import { useState } from 'react'
import { courseColor } from '../../lib/courseColor'
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
  const groups = new Map<number, Offer[]>()
  for (const offer of data.items) {
    const list = groups.get(offer.subjectId) ?? []
    list.push(offer)
    groups.set(offer.subjectId, list)
  }
  return (
    <section className="catalog" aria-labelledby="offers-title">
      <div className="section-title">
        <h2 id="offers-title">Ofertas de turmas</h2>
        <small>
          {data.total} {data.total === 1 ? 'disciplina' : 'disciplinas'}
        </small>
      </div>
      <Search q={q} placeholder="Buscar disciplina ou código" />
      <label className="check-label">
        <input type="checkbox" checked={eligible} onChange={(e) => filter(e.target.checked)} /> Somente
        turmas em que posso me matricular
      </label>
      {!data.items.length && <Empty q={q} message="Nenhuma turma disponível para este filtro." />}
      <ul className="offer-cards">
        {Array.from(groups, ([id, options]) => (
          <CourseCard key={id} options={options} {...{ confirmed, preview, view, enroll, locked }} />
        ))}
      </ul>
      <Pager page={data} q={q} />
    </section>
  )
}
function CourseCard({
  options,
  confirmed,
  preview,
  view,
  enroll,
  locked,
}: Pick<Props, 'confirmed' | 'preview' | 'view' | 'enroll' | 'locked'> & { options: Offer[] }) {
  const [chosen, setChosen] = useState<number | null>(null)
  const s =
    options.find((o) => o.id === chosen) ??
    options.find((o) => o.id === preview) ??
    options.find((o) => confirmed.has(o.id)) ??
    options[0]
  return (
    <li style={courseColor(s.subjectId, s.id)}>
      <div className="course-code">
        <strong>{s.code}</strong>
        <span>Turma {s.id}</span>
      </div>
      <h3>{s.name}</h3>
      {options.length > 1 && (
        <div className="teacher-options" role="group" aria-label={'Escolher turma de ' + s.name}>
          {options.map((o) => (
            <button
              type="button"
              key={o.id}
              aria-pressed={o.id === s.id}
              onClick={() => {
                setChosen(o.id)
                if (preview !== o.id) view(o)
              }}
            >
              T{o.id} · {o.professor}
            </button>
          ))}
        </div>
      )}
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
            <button className="primary" disabled={locked || !!s.unavailable} onClick={() => enroll(s)}>
              Matricular-se
            </button>
          </div>
          {s.unavailable && <small>{s.unavailable}</small>}
        </>
      )}
    </li>
  )
}
