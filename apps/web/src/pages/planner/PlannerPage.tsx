import { useState, useEffect } from 'react'
import type { Enrollment, Offer, Planner } from '@matricula/contracts'
import { api, useData } from '../../lib/api'
import { navigate } from '../../lib/location'
import { clock, conflicts, days, scheduleText } from '../../lib/week'
import type { Entry } from '../../lib/week'
import { Modal, Notice, Status } from '../../components/shared'
import { Catalog } from './Catalog'
import { Selection } from './Selection'
import { Timetable } from './Timetable'
import { CourseProgress } from './Progress'
import './planner.css'

export function PlannerPage({ query, destination }: { query: string; destination: string }) {
  const [preview, setPreview] = useState<Offer | null>(null),
    [cancel, setCancel] = useState<Enrollment | null>(null),
    [inspect, setInspect] = useState<Entry | null>(null)
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState({ text: '', error: false })
  const params = new URLSearchParams(query),
    q = params.get('q') ?? '',
    eligible = params.get('elegiveis') === '1'
  params.set('agrupar', 'disciplina')
  params.delete('simular')
  if (preview) params.set('simular', String(preview.id))
  const { data, error, pending, retry } = useData<Planner>('/aluno/planejamento?' + params, true)
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === 'matricula:dados') retry()
    }
    const focus = () => {
      if (!document.hidden) retry()
    }
    addEventListener('storage', sync)
    document.addEventListener('visibilitychange', focus)
    return () => {
      removeEventListener('storage', sync)
      document.removeEventListener('visibilitychange', focus)
    }
  }, [retry])
  const ready = !!data
  useEffect(() => {
    if (!ready) return
    if (destination.endsWith('/ofertas')) {
      window.scrollTo(0, 0)
      return
    }
    if (destination.endsWith('/progresso')) {
      const el = document.querySelector<HTMLDetailsElement>('#progresso')
      if (el) el.open = true
    }
    document
      .getElementById(
        destination.endsWith('/progresso')
          ? 'progresso'
          : destination.endsWith('/matriculas')
            ? 'matriculas'
            : 'planejamento',
      )
      ?.scrollIntoView({ block: 'start' })
  }, [destination, ready])
  if (!data) return <Status error={error} retry={retry} />
  const confirmed = new Set(data.confirmed.map((s) => s.id))
  const candidate =
    preview && !confirmed.has(preview.id)
      ? (data.drafts.find((s) => s.id === preview.id) ?? preview)
      : null
  const entries: Entry[] = data.confirmed.map((section) => ({ section, kind: 'confirmed' }))
  if (candidate) entries.push({ section: candidate, kind: 'draft' })
  const clashes = conflicts(entries)
  function filter(v: boolean) {
    const p = new URLSearchParams(query)
    if (v) p.set('elegiveis', '1')
    else p.delete('elegiveis')
    p.delete('page')
    navigate(location.pathname + (p.size ? '?' + p : ''))
  }
  async function save(section: Offer | Enrollment) {
    setBusy(true)
    const removing = 'enrollmentId' in section
    try {
      if (removing) await api('/aluno/matriculas/' + section.enrollmentId, 'DELETE')
      else await api('/aluno/matriculas', 'POST', { sectionId: section.id })
      if (preview?.id === section.id) setPreview(null)
      setNotice({
        text: (removing ? 'Matrícula cancelada em ' : 'Matrícula confirmada em ') + section.name + '.',
        error: false,
      })
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true })
    } finally {
      setBusy(false)
      setCancel(null)
      setInspect(null)
      retry()
    }
  }
  const locked = busy || pending || !!error
  return (
    <div id="planejamento">
      <header className="dashboard-heading">
        <h1>Planejamento de matrícula</h1>
        <p>Semestre atual</p>
      </header>
      <div className="academic-summary">
        <div>
          <small>Carga matriculada</small>
          <strong>{data.progress.semesterHours}h</strong>
        </div>
        <div>
          <small>Saldo do semestre</small>
          <strong>{data.progress.semesterLimit - data.progress.semesterHours}h</strong>
        </div>
        <div>
          <small>Turmas confirmadas</small>
          <strong>{data.confirmed.length}</strong>
        </div>
      </div>
      <Notice text={notice.text} error={notice.error} />
      {error && <Status error={error} retry={retry} />}
      <div className="dashboard-columns">
        <Catalog
          data={data}
          q={q}
          eligible={eligible}
          filter={filter}
          confirmed={confirmed}
          preview={candidate?.id ?? null}
          locked={locked}
          enroll={save}
          view={(s) => {
            setPreview(candidate?.id === s.id ? null : s)
            if (matchMedia('(max-width:760px)').matches)
              document.getElementById('grade')?.scrollIntoView()
          }}
        />
        <div id="grade">
          <Timetable entries={entries} onInspect={setInspect} />
          {candidate && (
            <div className="preview-note">
              <strong>Prévia · {candidate.name}</strong>
              <p>{scheduleText(candidate.meetings)}</p>
              <button className="text-btn" onClick={() => setPreview(null)}>
                Fechar prévia
              </button>
            </div>
          )}
          {clashes.map((c) => (
            <p className="clashes" key={[c.first.id, c.second.id, c.slot.day, c.slot.start].join('-')}>
              Conflito de horário · {days[c.slot.day - 1]} {clock(c.slot.start)}–{clock(c.slot.end)} ·{' '}
              {c.first.name} e {c.second.name}
            </p>
          ))}
          <Selection confirmed={data.confirmed} locked={locked} cancel={setCancel} />
        </div>
      </div>
      <details id="progresso" className="plan-progress">
        <summary>Progresso no curso</summary>
        <CourseProgress data={data.progress} />
      </details>
      {inspect && (
        <Modal title={inspect.section.name} close={() => setInspect(null)}>
          <p>{scheduleText(inspect.section.meetings)}</p>
          {inspect.kind === 'draft' && candidate && (
            <button
              className="primary"
              disabled={locked || !!candidate.unavailable}
              onClick={() => save(candidate)}
            >
              Matricular-se
            </button>
          )}
        </Modal>
      )}
      {cancel && (
        <Modal
          title="Cancelar matrícula?"
          close={() => {
            if (!busy) setCancel(null)
          }}
        >
          <p>A vaga de {cancel.name} será liberada.</p>
          <div className="actions">
            <button className="secondary" disabled={busy} onClick={() => setCancel(null)}>
              Manter matrícula
            </button>
            <button className="primary" disabled={locked} onClick={() => save(cancel)}>
              Confirmar cancelamento
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
