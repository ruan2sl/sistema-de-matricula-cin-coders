import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Professor, Section, Subject } from '@matricula/contracts'
import { api, useData } from '../lib/api'
import { Modal, Notice, Status } from '../components/shared'
import { MeetingFields, readMeetings } from '../components/MeetingFields'

export type Editor =
  | { kind: 'subject'; item?: Subject }
  | { kind: 'professor' }
  | { kind: 'section' }
  | { kind: 'capacity'; item: Section }
  | { kind: 'schedule'; item: Section }
function SectionFields() {
  const options = useData<{
    subjects: Pick<Subject, 'id' | 'code' | 'name'>[]
    professors: Pick<Professor, 'id' | 'name'>[]
  }>('/secretaria/opcoes')
  if (!options.data) return <Status error={options.error} retry={options.retry} />
  return (
    <>
      <div className="field">
        <label htmlFor="section-subject">Disciplina</label>
        <select id="section-subject" name="subjectId" defaultValue="" required>
          <option value="" disabled>
            Selecione uma disciplina
          </option>
          {options.data.subjects.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="section-professor">Professor</label>
        <select id="section-professor" name="professorId" defaultValue="" required>
          <option value="" disabled>
            Selecione um professor
          </option>
          {options.data.professors.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
export function OfficeForm({
  editor,
  close,
  saved,
}: {
  editor: Editor
  close: () => void
  saved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const subject = editor.kind === 'subject' ? editor.item : undefined
  const titles = {
    subject: subject ? 'Editar disciplina' : 'Cadastrar disciplina',
    professor: 'Cadastrar professor',
    capacity: 'Alterar vagas',
    section: 'Abrir turma',
    schedule: 'Editar horários',
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (editor.kind === 'section' && (!form.has('subjectId') || !form.has('professorId'))) {
      setError('Carregue as opções e selecione a disciplina e o professor.')
      return
    }
    setBusy(true)
    setError('')
    try {
      switch (editor.kind) {
        case 'subject':
          await api(
            '/secretaria/disciplinas' + (subject ? '/' + subject.id : ''),
            subject ? 'PUT' : 'POST',
            { code: form.get('code'), name: form.get('name'), hours: Number(form.get('hours')) },
          )
          break
        case 'professor':
          await api('/secretaria/professores', 'POST', {
            name: form.get('name'),
            email: form.get('email'),
          })
          break
        case 'section':
          await api('/secretaria/turmas', 'POST', {
            subjectId: Number(form.get('subjectId')),
            professorId: Number(form.get('professorId')),
            meetings: readMeetings(form),
            capacity: Number(form.get('capacity')),
          })
          break
        case 'schedule':
          await api('/secretaria/turmas/' + editor.item.id + '/horarios', 'PUT', {
            meetings: readMeetings(form),
          })
          break
        case 'capacity':
          await api('/secretaria/turmas/' + editor.item.id, 'PATCH', {
            capacity: Number(form.get('capacity')),
          })
          break
      }
      saved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={titles[editor.kind]}
      close={() => {
        if (!busy) close()
      }}
    >
      <form className="form-stack" onSubmit={submit}>
        {editor.kind === 'subject' && (
          <>
            <label>
              Código
              <input name="code" required maxLength={24} defaultValue={subject?.code} />
            </label>
            <label>
              Nome da disciplina
              <input name="name" required maxLength={120} defaultValue={subject?.name} />
            </label>
            <label>
              Carga horária (h)
              <input
                name="hours"
                type="number"
                required
                min={15}
                max={120}
                step={15}
                defaultValue={subject?.hours ?? 60}
              />
            </label>
          </>
        )}
        {editor.kind === 'professor' && (
          <>
            <label>
              Nome do professor
              <input name="name" required maxLength={120} />
            </label>
            <label>
              E-mail
              <input name="email" type="email" required maxLength={254} />
            </label>
          </>
        )}
        {editor.kind === 'section' && <SectionFields />}
        {(editor.kind === 'section' || editor.kind === 'schedule') && (
          <MeetingFields initial={editor.kind === 'schedule' ? editor.item.meetings : []} />
        )}
        {editor.kind === 'capacity' && (
          <p>
            {editor.item.name} · Turma {editor.item.id}
            <br />
            {editor.item.occupied} vagas ocupadas
          </p>
        )}
        {(editor.kind === 'capacity' || editor.kind === 'section') && (
          <label>
            Total de vagas
            <input
              name="capacity"
              type="number"
              min={1}
              required
              defaultValue={editor.kind === 'capacity' ? editor.item.capacity : undefined}
            />
          </label>
        )}
        <Notice text={error} error />
        <div className="actions">
          <button className="secondary" type="button" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
