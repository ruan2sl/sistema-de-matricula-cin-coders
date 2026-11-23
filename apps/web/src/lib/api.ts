import { useCallback, useEffect, useState } from 'react'
import { notifyTabs } from './tabs'

let expectedUser: number | undefined
export function setExpectedUser(id?: number) {
  expectedUser = id
}
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
export async function api<T>(
  path: string,
  method = 'GET',
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers = new Headers()
  if (data !== undefined) headers.set('Content-Type', 'application/json')
  if (expectedUser !== undefined && (path !== '/sessao' || method === 'DELETE'))
    headers.set('X-Expected-User', String(expectedUser))
  let response: Response
  try {
    response = await fetch('/api' + path, {
      method,
      signal,
      credentials: 'same-origin',
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(0, 'Falha na conexão. Verifique sua rede e tente novamente.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    if (!signal?.aborted) {
      if (response.headers.get('X-Session-Changed')) dispatchEvent(new Event('session-change'))
      else if (response.status === 401 && path !== '/sessao') dispatchEvent(new Event('sessao-expirada'))
    }
    throw new ApiError(response.status, body.error || 'Falha na comunicação com o servidor.')
  }
  if (method !== 'GET' && path !== '/sessao') notifyTabs('matricula:dados')
  return response.status === 204 ? (undefined as T) : response.json()
}
type State<T> = { key: string; data?: T; error?: string }
export function useData<T>(path: string, keepPrevious = false) {
  const [revision, setRevision] = useState(0)
  const key = path + '#' + revision
  const retry = useCallback(() => setRevision((value) => value + 1), [])
  const [state, setState] = useState<State<T>>({ key: '' })
  useEffect(() => {
    const controller = new AbortController()
    api<T>(path, 'GET', undefined, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, data })
      },
      (error) => {
        if (!controller.signal.aborted)
          setState((old) => ({ key, error: error.message, data: keepPrevious ? old.data : undefined }))
      },
    )
    return () => controller.abort()
  }, [path, key, keepPrevious])
  return {
    pending: state.key !== key,
    data: state.key === key || keepPrevious ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    retry,
  }
}
