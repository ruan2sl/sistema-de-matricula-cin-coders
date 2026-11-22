import { useEffect, useRef, useState } from 'react'
import type { Enrollment, Offer, Planner, Section } from '@matricula/contracts'
import { api, useData } from '../../lib/api'
import { navigate } from '../../lib/location'
import { conflicts, days, clock, scheduleText } from '../../lib/week'
import type { Entry } from '../../lib/week'
import { Modal, Notice, Status } from '../../components/shared'
import { Catalog } from './Catalog'
import { Selection } from './Selection'
import { CourseProgress } from './Progress'
import { Timetable, statusName } from './Timetable'
import './planner.css'

function readDraft(key: string): number[] {
  try {
    const ids: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]')
    return Array.isArray(ids) ? ids.filter((id) => Number.isSafeInteger(id) && id > 0) : []
  } catch {
    return []
  }
}

export function PlannerPage({
  query,
  destination,
  owner,
}: {
  query: string
  destination: string
  owner: number
}) {
  const key = 'matricula:rascunho:' + owner
  const [ids, setIds] = useState<number[]>(() => readDraft(key))
  const [recent, setRecent] = useState<Map<number, Offer>>(() => new Map())
  const [showOffers, setShowOffers] = useState(true)
  const [day, setDay] = useState(1)
  const [inspect, setInspect] = useState<number | null>(null)
  const [canceling, setCanceling] = useState<Enrollment | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ text: '', error: false })
  const [progressOpen, setProgressOpen] = useState(destination.endsWith('/progresso'))
  const params = new URLSearchParams(query)
  const q = params.get('q') ?? ''
  const eligible = params.get('elegiveis') === '1'
  params.delete('simular')
  if (ids.length) params.set('simular', ids.join(','))
  const { data, error, retry, pending } = useData<Planner>('/aluno/planejamento?' + params, true)
  useEffect(() => {
    const updated = (event: StorageEvent) => {
      if (event.key === 'matricula:dados') retry()
    }
    const visible = () => {
      if (document.visibilityState === 'visible') retry()
    }
    addEventListener('storage', updated)
    document.addEventListener('visibilitychange', visible)
    return () => {
      removeEventListener('storage', updated)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [retry])
  const previousPath = useRef('')
  const ready = !!data
  useEffect(() => {
    if (!ready || previousPath.current === destination) return
    const initial = previousPath.current === ''
    previousPath.current = destination
    if (initial && destination.endsWith('/ofertas')) return
    if (destination.endsWith('/progresso')) setProgressOpen(true)
    const target = destination.endsWith('/progresso')
      ? 'progresso'
      : destination.endsWith('/matriculas')
        ? 'matriculas'
        : 'planejamento'
    const frame = requestAnimationFrame(() =>
      document.getElementById(target)?.scrollIntoView({ block: 'start' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [destination, ready])
  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(ids))
  }, [ids, key])
  if (!data) return <Status error={error} retry={retry} />
  const confirmed = new Map(data.confirmed.map((section) => [section.id, section]))
  const known = new Map([
    ...recent,
    ...data.items.map((s) => [s.id, s] as const),
    ...data.drafts.map((s) => [s.id, s] as const),
  ])
  const drafts = ids.flatMap((id) => {
    const section = known.get(id)
    return section && !confirmed.has(id) ? [section] : []
  })
  const draftSet = new Set(drafts.map((s) => s.id))
  const entries: Entry[] = [
    ...data.confirmed.map((section) => ({ section, kind: 'confirmed' as const })),
    ...drafts.map((section) => ({ section, kind: 'draft' as const })),
    ...data.items
      .filter((s) => !draftSet.has(s.id) && !confirmed.has(s.id))
      .map((section) => ({ section, kind: 'offer' as const })),
  ]
  const clashes = conflicts(entries)
  const inspected = entries.find((entry) => entry.section.id === inspect)
  function toggleDraft(offer: Offer, reveal = false) {
    if (
      reveal &&
      !ids.includes(offer.id) &&
      offer.meetings.length &&
      matchMedia('(max-width:760px)').matches
    ) {
      setDay(offer.meetings[0].day)
      document.getElementById('grade-semanal')?.scrollIntoView({ block: 'start' })
    }
    setRecent((old) => new Map(old).set(offer.id, offer))
    setIds((old) => (old.includes(offer.id) ? old.filter((id) => id !== offer.id) : [...old, offer.id]))
    setInspect(null)
  }
  function filter(value: boolean) {
    const next = new URLSearchParams(location.search)
    if (value) next.set('elegiveis', '1')
    else next.delete('elegiveis')
    next.delete('page')
    navigate(location.pathname + (next.size ? '?' + next : ''))
  }
  async function mutate(section: Section, enrollmentId?: number) {
    setBusy(true)
    setNotice({ text: '', error: false })
    try {
      if (enrollmentId !== undefined) await api('/aluno/matriculas/' + enrollmentId, 'DELETE')
      else await api('/aluno/matriculas', 'POST', { sectionId: section.id })
      setIds((old) => old.filter((id) => id !== section.id))
      setNotice({
        text:
          (enrollmentId !== undefined ? 'Matrícula cancelada em ' : 'Matrícula confirmada em ') +
          section.name +
          '.',
        error: false,
      })
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true })
    } finally {
      setBusy(false)
      setInspect(null)
      setCanceling(null)
      retry()
    }
  }
  const locked = busy || pending || !!error
  return (
    <>
      <header className="page-head planner-head" id="planejamento">
        <div>
          <p className="eyebrow">Semestre atual</p>
          <h1>Planejamento de matrícula</h1>
        </div>
        <div className="load">
          <small>CH do semestre</small>
          <strong>
            {data.progress.semesterHours}h <span>/ {data.progress.semesterLimit}h</span>
          </strong>
        </div>
      </header>
      <Notice text={notice.text} error={notice.error} />
      {error && <Status error={error} retry={retry} />}
      <div className="planner-columns">
        <div className="planning-week" id="grade-semanal">
          <Timetable
            day={day}
            setDay={setDay}
            entries={entries}
            onInspect={(entry) => setInspect(entry.section.id)}
            showOffers={showOffers}
            setShowOffers={setShowOffers}
          />
          {clashes.length > 0 && (
            <div className="clashes" role="status">
              <strong>Conflito de horário</strong>
              {clashes.map(({ first, second, slot }) => (
                <p key={[first.id, second.id, slot.day, slot.start].join('-')}>
                  {days[slot.day - 1]}, {clock(slot.start)}–{clock(slot.end)} · {first.name} (T{first.id}
                  ) e {second.name} (T{second.id})
                </p>
              ))}
            </div>
          )}
        </div>
        <Catalog
          data={data}
          q={q}
          eligible={eligible}
          filter={filter}
          confirmed={new Set(confirmed.keys())}
          draftSet={draftSet}
          pending={pending}
          locked={busy || !!error}
          toggleDraft={(s) => toggleDraft(s, true)}
        />
        <Selection
          drafts={drafts}
          confirmed={data.confirmed}
          locked={locked}
          busy={busy}
          toggleDraft={toggleDraft}
          confirm={mutate}
          cancel={setCanceling}
        />
      </div>
      <details
        id="progresso"
        className="plan-progress"
        open={progressOpen}
        onToggle={(e) => setProgressOpen(e.currentTarget.open)}
      >
        <summary>Progresso no curso</summary>
        <CourseProgress data={data.progress} />
      </details>
      {inspected && (
        <Modal title={inspected.section.name} close={() => setInspect(null)}>
          <p>
            {inspected.section.code} · Turma {inspected.section.id} · {statusName[inspected.kind]}
          </p>
          <p>
            {inspected.section.professor} · {inspected.section.hours}h
          </p>
          <p>{scheduleText(inspected.section.meetings)}</p>
          {known.get(inspected.section.id)?.unavailable && inspected.kind !== 'confirmed' && (
            <p className="reason">{known.get(inspected.section.id)?.unavailable}</p>
          )}
          <div className="actions">
            {inspected.kind === 'confirmed' ? (
              <button
                className="secondary"
                disabled={locked}
                onClick={() => {
                  setInspect(null)
                  setCanceling(confirmed.get(inspected.section.id)!)
                }}
              >
                Cancelar matrícula
              </button>
            ) : (
              <button
                className="primary"
                disabled={locked}
                onClick={() => toggleDraft(known.get(inspected.section.id)!)}
              >
                {inspected.kind === 'draft' ? 'Retirar da seleção' : 'Simular turma'}
              </button>
            )}
          </div>
        </Modal>
      )}
      {canceling && (
        <Modal
          title="Cancelar matrícula?"
          close={() => {
            if (!busy) setCanceling(null)
          }}
        >
          <p>
            A vaga de <strong>{canceling.name}</strong> será liberada e {canceling.hours}h sairão da
            carga em curso.
          </p>
          <div className="actions">
            <button className="secondary" disabled={busy} onClick={() => setCanceling(null)}>
              Manter matrícula
            </button>
            <button
              className="primary"
              disabled={locked}
              onClick={() => mutate(canceling, canceling.enrollmentId)}
            >
              Confirmar cancelamento
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
