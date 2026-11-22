import { useEffect, useState } from 'react'

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
  let response: Response
  try {
    response = await fetch('/api' + path, {
      method,
      signal,
      credentials: 'same-origin',
      headers: data === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(0, 'Falha na conexão. Verifique sua rede e tente novamente.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    if (response.status === 401 && path !== '/sessao') window.dispatchEvent(new Event('sessao-expirada'))
    throw new ApiError(response.status, body.error || 'Falha na comunicação com o servidor.')
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
type State<T> = { key: string; data?: T; error?: string }
export function useData<T>(path: string) {
  const [revision, setRevision] = useState(0)
  const key = path + '#' + revision
  const [state, setState] = useState<State<T>>({ key: '' })
  useEffect(() => {
    const controller = new AbortController()
    api<T>(path, 'GET', undefined, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, data })
      },
      (error) => {
        if (!controller.signal.aborted) setState({ key, error: error.message })
      },
    )
    return () => controller.abort()
  }, [path, key])
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    retry: () => setRevision((value) => value + 1),
  }
}
