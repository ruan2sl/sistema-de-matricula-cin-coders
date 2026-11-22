import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Page, Professor, Section, Subject } from '@matricula/contracts'
import { useData } from '../lib/api'
import { Empty, Notice, Pager, Search, Status } from '../components/shared'
import { OfficeForm } from './OfficeForms'
import type { Editor } from './OfficeForms'

function OfficeList({
  title,
  action,
  initial,
  retry,
  children,
}: {
  title: string
  action: string
  initial: Editor
  retry: () => void
  children: (edit: (editor: Editor) => void) => ReactNode
}) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [message, setMessage] = useState('')
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Secretaria de graduação</p>
          <h1>{title}</h1>
        </div>
        <button className="primary" onClick={() => setEditor(initial)}>
          {action}
        </button>
      </div>
      <Notice text={message} />
      {children(setEditor)}
      {editor && (
        <OfficeForm
          editor={editor}
          close={() => setEditor(null)}
          saved={() => {
            setEditor(null)
            setMessage('Alteração salva com sucesso.')
            retry()
          }}
        />
      )}
    </>
  )
}
export function Subjects({ query }: { query: string }) {
  const { data, error, retry } = useData<Page<Subject>>('/secretaria/disciplinas' + query)
  const q = new URLSearchParams(query).get('q') ?? ''
  return (
    <OfficeList
      title="Disciplinas"
      action="Cadastrar disciplina"
      initial={{ kind: 'subject' }}
      retry={retry}
    >
      {(edit) => (
        <>
          <Search q={q} placeholder="Buscar por disciplina ou código" />
          {!data ? (
            <Status error={error} retry={retry} />
          ) : (
            <>
              {data.items.length === 0 ? (
                <Empty q={q} message="Nenhuma disciplina cadastrada." />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Disciplina</th>
                      <th>CH</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td className="metadata">{item.code}</td>
                        <td>{item.name}</td>
                        <td>{item.hours}h</td>
                        <td>
                          <button className="text-btn" onClick={() => edit({ kind: 'subject', item })}>
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Pager page={data} q={q} />
            </>
          )}
        </>
      )}
    </OfficeList>
  )
}
export function Professors() {
  const { data, error, retry } = useData<Professor[]>('/secretaria/professores')
  return (
    <OfficeList
      title="Professores"
      action="Cadastrar professor"
      initial={{ kind: 'professor' }}
      retry={retry}
    >
      {() =>
        !data ? (
          <Status error={error} retry={retry} />
        ) : !data.length ? (
          <Empty message="Nenhum professor cadastrado." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Professor</th>
                <th>E-mail</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </OfficeList>
  )
}
export function Sections() {
  const { data, error, retry } = useData<Section[]>('/secretaria/turmas')
  return (
    <OfficeList title="Turmas" action="Abrir turma" initial={{ kind: 'section' }} retry={retry}>
      {(edit) =>
        !data ? (
          <Status error={error} retry={retry} />
        ) : !data.length ? (
          <Empty message="Nenhuma turma aberta." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Turma</th>
                <th>Disciplina</th>
                <th>Professor</th>
                <th>Ocupadas / total</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="metadata">{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.professor}</td>
                  <td>
                    {item.occupied} / {item.capacity}
                  </td>
                  <td>
                    <button className="text-btn" onClick={() => edit({ kind: 'capacity', item })}>
                      Alterar vagas
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </OfficeList>
  )
}
