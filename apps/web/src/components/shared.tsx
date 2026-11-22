import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Group, Page } from '@matricula/contracts'
import { navigate } from '../lib/location'

export const groupName: Record<Group, string> = {
  obrigatoria: 'Obrigatória',
  perfil: 'Eletiva de perfil',
  livre: 'Eletiva livre',
}
export function Brand() {
  return (
    <div className="brand">
      <span className="brandmark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        Graduação<span className="brand-dot">.</span>
      </span>
    </div>
  )
}
export function Link({ to, children, current }: { to: string; children: ReactNode; current?: boolean }) {
  return (
    <a
      href={to}
      aria-current={current ? 'page' : undefined}
      onClick={(event) => {
        if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          event.preventDefault()
          navigate(to)
        }
      }}
    >
      {children}
    </a>
  )
}
export function Status({ error, retry }: { error?: string; retry: () => void }) {
  return error ? (
    <div className="state" role="alert">
      <p>{error}</p>
      <button type="button" className="secondary" onClick={retry}>
        Tentar novamente
      </button>
    </div>
  ) : (
    <div className="state" role="status">
      Carregando…
    </div>
  )
}
export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return text ? (
    <p className={'notice' + (error ? ' error' : '')} role={error ? 'alert' : 'status'}>
      {text}
    </p>
  ) : null
}
export function searchUrl(q: string, page = 1) {
  const params = new URLSearchParams(location.search)
  params.delete('q')
  params.delete('page')
  if (q.trim()) params.set('q', q.trim())
  if (page > 1) params.set('page', String(page))
  return location.pathname + (params.size ? '?' + params : '')
}
export function Search({ q, placeholder }: { q: string; placeholder: string }) {
  const [term, setTerm] = useState(q)
  useEffect(() => {
    setTerm(q)
  }, [q])
  function submit(event: FormEvent) {
    event.preventDefault()
    navigate(searchUrl(term))
  }
  return (
    <form className="search" onSubmit={submit} role="search">
      <span aria-hidden="true" className="magnify" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        maxLength={120}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
      <button type="submit">Buscar</button>
    </form>
  )
}
export function Empty({ q, message }: { q?: string; message: string }) {
  return (
    <div className="state">
      <p>{q ? 'Nenhum resultado para “' + q + '”.' : message}</p>
      {q && (
        <button className="secondary" onClick={() => navigate(searchUrl(''))}>
          Limpar busca
        </button>
      )}
    </div>
  )
}
export function Pager({ page, q }: { page: Omit<Page<unknown>, 'items'>; q: string }) {
  const last = Math.max(1, Math.ceil(page.total / page.pageSize))
  useEffect(() => {
    const requested = Number(new URLSearchParams(location.search).get('page') || 1)
    if (requested !== page.page) navigate(searchUrl(q, page.page), true)
  }, [page.page, q])
  return (
    <div className="pager">
      <span>
        {page.total} {page.total === 1 ? 'resultado' : 'resultados'} · Página {page.page} de {last}
      </span>
      <div>
        <button
          className="secondary"
          disabled={page.page <= 1}
          onClick={() => navigate(searchUrl(q, page.page - 1))}
        >
          Anterior
        </button>
        <button
          className="secondary"
          disabled={page.page >= last}
          onClick={() => navigate(searchUrl(q, page.page + 1))}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string
  close: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      aria-labelledby="dialog-title"
    >
      <header className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-btn" aria-label="Fechar" onClick={close}>
          ×
        </button>
      </header>
      {children}
    </dialog>
  )
}
