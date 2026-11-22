import { useState } from 'react'
import type { Enrollment, Offer, Page, Progress } from '@matricula/contracts'
import { api, useData } from '../lib/api'
import { Empty, groupName, Modal, Notice, Pager, Search, Status } from '../components/shared'

type OfferPage = Page<Offer> & Pick<Progress, 'semesterHours' | 'semesterLimit'>
export function Offers({ query }: { query: string }) {
  const { data, error, retry } = useData<OfferPage>('/aluno/ofertas' + query)
  const [message, setMessage] = useState({ text: '', error: false })
  const [busy, setBusy] = useState<number | null>(null)
  const q = new URLSearchParams(query).get('q') ?? ''
  async function register(section: Offer) {
    setBusy(section.id)
    try {
      await api('/aluno/matriculas', 'POST', { sectionId: section.id })
      setMessage({ text: 'Matrícula confirmada em ' + section.name + '.', error: false })
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true })
    } finally {
      setBusy(null)
      retry()
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Semestre atual</p>
          <h1>Ofertas de turmas</h1>
        </div>
        {data && (
          <div className="load">
            <small>CH do semestre</small>
            <strong>
              {data.semesterHours}h <span>/ {data.semesterLimit}h</span>
            </strong>
          </div>
        )}
      </div>
      <Search q={q} placeholder="Buscar por disciplina ou código" />
      <Notice text={message.text} error={message.error} />
      {!data ? (
        <Status error={error} retry={retry} />
      ) : (
        <>
          {data.items.length === 0 ? (
            <Empty q={q} message="Ainda não há turmas abertas." />
          ) : (
            <ul className="course-list">
              {data.items.map((offer) => (
                <li key={offer.id}>
                  <div className="course-info">
                    <small className="metadata">
                      {offer.code} · Turma {offer.id}
                    </small>
                    <h2>{offer.name}</h2>
                    <p>
                      {offer.professor} <span>·</span> {offer.hours}h
                    </p>
                  </div>
                  <div className="course-status">
                    <span className={'category ' + offer.group}>{groupName[offer.group]}</span>
                    <small>
                      {offer.capacity - offer.occupied} de {offer.capacity} vagas disponíveis
                    </small>
                  </div>
                  <div className="course-action">
                    <button
                      className="secondary"
                      disabled={!!offer.unavailable || busy !== null}
                      onClick={() => register(offer)}
                    >
                      {busy === offer.id ? 'Matriculando…' : 'Matricular-se'}
                    </button>
                    {offer.unavailable && <small>{offer.unavailable}</small>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pager page={data} q={q} />
        </>
      )}
    </>
  )
}

export function MyEnrollments() {
  const { data, error, retry } = useData<Enrollment[]>('/aluno/matriculas')
  const [chosen, setChosen] = useState<Enrollment | null>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(''),
    [message, setMessage] = useState('')
  async function cancel() {
    if (!chosen) return
    setBusy(true)
    setFailure('')
    try {
      await api('/aluno/matriculas/' + chosen.enrollmentId, 'DELETE')
      setMessage('Matrícula cancelada em ' + chosen.name + '.')
      setChosen(null)
      retry()
    } catch (e) {
      setFailure((e as Error).message)
      retry()
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Semestre atual</p>
          <h1>Minhas matrículas</h1>
        </div>
      </div>
      <Notice text={message} />
      {!data ? (
        <Status error={error} retry={retry} />
      ) : data.length === 0 ? (
        <Empty message="Você ainda não tem matrículas ativas neste semestre." />
      ) : (
        <ul className="course-list">
          {data.map((item) => (
            <li key={item.enrollmentId}>
              <div className="course-info">
                <small className="metadata">
                  {item.code} · Turma {item.id}
                </small>
                <h2>{item.name}</h2>
                <p>
                  {item.professor} <span>·</span> {item.hours}h
                </p>
              </div>
              <span className={'category ' + item.group}>{groupName[item.group]}</span>
              <button
                className="secondary"
                onClick={() => {
                  setFailure('')
                  setChosen(item)
                }}
              >
                Cancelar matrícula
              </button>
            </li>
          ))}
        </ul>
      )}
      {chosen && (
        <Modal
          title="Cancelar matrícula?"
          close={() => {
            if (!busy) setChosen(null)
          }}
        >
          <p>
            A vaga de <strong>{chosen.name}</strong> será liberada e {chosen.hours}h sairão da sua carga
            em curso.
          </p>
          <Notice text={failure} error />
          <div className="actions">
            <button className="secondary" disabled={busy} onClick={() => setChosen(null)}>
              Manter matrícula
            </button>
            <button className="primary" disabled={busy} onClick={cancel}>
              Confirmar cancelamento
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

const progressTitles = {
  obrigatoria: 'Obrigatórias',
  perfil: 'Eletivas de perfil',
  livre: 'Eletivas livres',
}
export function CourseProgress() {
  const { data, error, retry } = useData<Progress>('/aluno/progresso')
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Histórico acadêmico</p>
          <h1>Progresso no curso</h1>
        </div>
      </div>
      {!data ? (
        <Status error={error} retry={retry} />
      ) : (
        <>
          <p className="intro">
            A carga integralizada considera as disciplinas aprovadas. Neste semestre, você tem{' '}
            <strong>{data.semesterHours}h em curso</strong> de um limite de {data.semesterLimit}h.
          </p>
          <div className="progress-list">
            {data.groups.map((row) => (
              <section key={row.group}>
                <header>
                  <h2>{progressTitles[row.group]}</h2>
                  <strong>{row.percent}%</strong>
                </header>
                <progress
                  aria-label={'Conclusão em ' + progressTitles[row.group]}
                  value={row.percent}
                  max={100}
                />
                <dl>
                  {[
                    ['Exigida', row.required],
                    ['Integralizada', row.completed],
                    ['Em curso', row.ongoing],
                    ['Falta concluir', row.remaining],
                  ].map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{value}h</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          <p className="footnote">
            Horas aprovadas em eletivas de perfil acima do mínimo contam como eletivas livres.
          </p>
        </>
      )}
    </>
  )
}
