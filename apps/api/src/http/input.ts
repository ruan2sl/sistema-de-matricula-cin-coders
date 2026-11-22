export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function stringField(value: unknown, label: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `Informe ${label} com até ${max} caracteres.`)
  }
  return value.trim()
}
export function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new HttpError(400, `Informe um número inteiro positivo para ${label}.`)
  }
  return value
}
export function parseId(value: unknown): number {
  return integer(
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined,
    'o identificador',
  )
}
export function readSearch(query: Record<string, unknown>) {
  const page = query.page === undefined ? 1 : parseId(query.page)
  if (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 120)) {
    throw new HttpError(400, 'A busca aceita até 120 caracteres.')
  }
  if (query.elegiveis !== undefined && query.elegiveis !== '1' && query.elegiveis !== '0')
    throw new HttpError(400, 'Filtro de elegibilidade inválido.')
  return { page, q: String(query.q ?? '').trim(), eligible: query.elegiveis === '1' }
}
