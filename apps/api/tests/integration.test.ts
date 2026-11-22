import test from 'node:test'
import type { TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import type { Enrollment, Offer, Page, Progress, Section } from '@matricula/contracts'
import { openDatabase } from '../src/db/database.ts'
import { createApp } from '../src/http/app.ts'
import { seed } from '../src/seed.ts'

async function fixture(t: TestContext) {
  const db = openDatabase(':memory:')
  seed(db)
  assert.equal(seed(db), false)
  const server = createApp(db).listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => {
    await new Promise<void>((done) => server.close(() => done()))
    db.close()
  })
  const url = 'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/api'
  function send(path: string, method = 'GET', body?: unknown, cookie = '') {
    return fetch(url + path, {
      method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  async function account(username: string) {
    const response = await send('/sessao', 'POST', { username })
    assert.equal(response.status, 200)
    const cookie = response.headers.get('set-cookie')!.split(';')[0]
    return (path: string, method?: string, body?: unknown) => send(path, method, body, cookie)
  }
  return { db, send, account }
}
test('planejamento pagina após o filtro, mantém simuladas fora da busca e só contabiliza confirmadas', async (t) => {
  const { account } = await fixture(t)
  const ana = await account('ana')
  const preview = await (await ana('/aluno/planejamento?q=IF669&simular=1')).json()
  assert.equal(preview.items.length, 2)
  assert.equal(preview.drafts[0].name, 'Banco de Dados')
  assert.equal(preview.drafts[0].meetings.length, 2)
  assert.equal(preview.confirmed.length, 0)
  assert.equal(preview.progress.semesterHours, 0)
  await ana('/aluno/matriculas', 'POST', { sectionId: 2 })
  const filtered = await (await ana('/aluno/planejamento?elegiveis=1')).json()
  assert.equal(filtered.total, 6)
  assert.equal(filtered.items.length, 6)
  assert.ok(filtered.items.every((s: Offer) => s.unavailable === null))
  assert.equal(filtered.confirmed[0].meetings.length, 2)
  assert.equal(filtered.progress.semesterHours, 60)
})
test('horários inválidos preservam a grade anterior e encontros consecutivos são permitidos', async (t) => {
  const { account } = await fixture(t)
  const office = await account('secretaria')
  const path = '/secretaria/turmas/1/horarios'
  const slots = [
    { day: 1, start: 480, end: 540 },
    { day: 1, start: 540, end: 600 },
  ]
  assert.equal((await office(path, 'PUT', { meetings: slots })).status, 200)
  for (const bad of [
    { day: 8, start: 600, end: 700 },
    { day: 1, start: 500, end: 550 },
    { day: 1, start: 700, end: 690 },
  ]) {
    assert.equal((await office(path, 'PUT', { meetings: [...slots, bad] })).status, 400)
  }
  const sections = (await (await office('/secretaria/turmas')).json()) as Section[]
  assert.deepEqual(sections.find((s) => s.id === 1)!.meetings, slots)
})
test('uma ação que ainda exibe o usuário anterior é recusada antes da matrícula', async (t) => {
  const { send, db } = await fixture(t)
  const login = await send('/sessao', 'POST', { username: 'bruno' })
  const res = await fetch(new URL('/api/aluno/matriculas', login.url), {
    method: 'POST',
    headers: {
      Cookie: login.headers.get('set-cookie')!.split(';')[0],
      'Content-Type': 'application/json',
      'X-Expected-User': '1',
    },
    body: JSON.stringify({ sectionId: 1 }),
  })
  assert.equal(res.status, 409)
  assert.equal(res.headers.get('X-Session-Changed'), '1')
  assert.equal(db.prepare('SELECT count(*) AS n FROM enrollments').get()!.n, 0)
})
test('sessão expira, logout revoga o cookie e a API isola os dois perfis', async (t) => {
  const { db, send, account } = await fixture(t)
  assert.equal((await send('/aluno/ofertas')).status, 401)
  assert.equal((await send('/sessao', 'POST', { username: 'inexistente' })).status, 401)
  const ana = await account('ANA'),
    office = await account('secretaria')
  assert.equal((await ana('/secretaria/disciplinas')).status, 403)
  assert.equal((await office('/aluno/matriculas')).status, 403)
  assert.equal((await office('/sessao', 'DELETE')).status, 204)
  assert.equal((await office('/sessao')).status, 401)
  db.exec('UPDATE sessions SET expires=0')
  assert.equal((await ana('/aluno/ofertas')).status, 401)
})
test('ofertas e disciplinas têm paginação estável, busca sem acento e classificação por curso', async (t) => {
  const { account } = await fixture(t)
  const ana = await account('ana'),
    bruno = await account('bruno'),
    office = await account('secretaria')
  const page = (await (await ana('/aluno/ofertas')).json()) as Page<Offer>
  const next = (await (await ana('/aluno/ofertas?page=2')).json()) as Page<Offer>
  assert.equal(page.total, 9)
  assert.equal(page.items.length, 6)
  assert.equal(next.items.length, 3)
  assert.equal(new Set([...page.items, ...next.items].map((o) => o.id)).size, 9)
  for (const [client, group] of [
    [ana, 'obrigatoria'],
    [bruno, 'perfil'],
  ] as const) {
    const result = (await (await client('/aluno/ofertas?q=if690')).json()) as Page<Offer>
    assert.equal(result.items[0].group, group)
  }
  const search = await (await office('/secretaria/disciplinas?q=matematica')).json()
  assert.equal(search.items[0].code, 'MA101')
  assert.equal((await (await ana('/aluno/ofertas?q=inexistente')).json()).total, 0)
  assert.equal((await ana('/aluno/ofertas?page=abc')).status, 400)
})
test('última vaga tem um titular, cancelar libera e outro aluno não pode ver nem cancelar a matrícula', async (t) => {
  const { account } = await fixture(t)
  const ana = await account('ana'),
    bruno = await account('bruno')
  const clients = [ana, bruno]
  const results = await Promise.all(
    clients.map((client) => client('/aluno/matriculas', 'POST', { sectionId: 1 })),
  )
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409])
  const winner = results.findIndex((r) => r.status === 201)
  const enrollment = await results[winner].json()
  assert.match((await results[1 - winner].json()).error, /lotada/)
  assert.deepEqual(await (await clients[1 - winner]('/aluno/matriculas?studentId=1')).json(), [])
  assert.equal((await clients[1 - winner]('/aluno/matriculas/' + enrollment.id, 'DELETE')).status, 404)
  assert.equal((await clients[winner]('/aluno/matriculas/' + enrollment.id, 'DELETE')).status, 204)
  assert.equal((await clients[winner]('/aluno/matriculas/' + enrollment.id, 'DELETE')).status, 404)
  assert.equal((await clients[1 - winner]('/aluno/matriculas', 'POST', { sectionId: 1 })).status, 201)
})
test('reprovação permite nova tentativa, aprovação bloqueia e turmas paralelas não duplicam CH', async (t) => {
  const { account } = await fixture(t)
  const ana = await account('ana')
  const before = (await (await ana('/aluno/progresso')).json()) as Progress
  assert.deepEqual(
    before.groups.map((g) => g.completed),
    [60, 90, 30],
  )
  assert.equal((await ana('/aluno/matriculas', 'POST', { sectionId: 8 })).status, 409)
  assert.equal((await ana('/aluno/matriculas', 'POST', { sectionId: 2 })).status, 201)
  assert.equal((await ana('/aluno/matriculas', 'POST', { sectionId: 9 })).status, 409)
  const after = (await (await ana('/aluno/progresso')).json()) as Progress
  assert.equal(after.groups[0].ongoing, 60)
  assert.deepEqual(
    after.groups.map((g) => g.remaining),
    before.groups.map((g) => g.remaining),
  )
})
test('o limite semestral aceita igualdade e devolve saldo ao cancelar; alterações futuras preservam horas já assumidas', async (t) => {
  const { account, db } = await fixture(t)
  db.exec('UPDATE courses SET semesterLimit=120 WHERE id=1')
  const ana = await account('ana'),
    office = await account('secretaria')
  for (const sectionId of [1, 2])
    assert.equal((await ana('/aluno/matriculas', 'POST', { sectionId })).status, 201)
  const decline = await ana('/aluno/matriculas', 'POST', { sectionId: 3 })
  assert.equal(decline.status, 409)
  assert.match((await decline.json()).error, /Limite de 120h/)
  assert.equal(
    (
      await office('/secretaria/disciplinas/3', 'PUT', {
        code: 'IF690',
        name: 'Banco de Dados',
        hours: 90,
      })
    ).status,
    200,
  )
  const items = (await (await ana('/aluno/matriculas')).json()) as Enrollment[]
  assert.equal(items.find((i) => i.id === 1)!.hours, 60)
  await ana('/aluno/matriculas/' + items[0].enrollmentId, 'DELETE')
  assert.equal((await ana('/aluno/matriculas', 'POST', { sectionId: 3 })).status, 201)
  assert.equal((await (await ana('/aluno/progresso')).json()).semesterHours, 105)
})
test('secretaria valida código, carga horária, e-mail, vínculos e vagas ocupadas', async (t) => {
  const { account } = await fixture(t)
  const office = await account('secretaria'),
    ana = await account('ana'),
    bruno = await account('bruno')
  const subject = { code: 'T1', name: 'Tópicos', hours: 15 }
  for (const hours of [0, 14, 16, 121, 135, 30.5])
    assert.equal((await office('/secretaria/disciplinas', 'POST', { ...subject, hours })).status, 400)
  const create = await office('/secretaria/disciplinas', 'POST', subject)
  assert.equal(create.status, 201)
  const { id } = await create.json()
  assert.equal((await office('/secretaria/disciplinas', 'POST', { ...subject, code: 't1' })).status, 409)
  assert.equal(
    (await office('/secretaria/disciplinas/' + id, 'PUT', { ...subject, hours: 120 })).status,
    200,
  )
  assert.equal(
    (await office('/secretaria/disciplinas/' + id, 'PUT', { ...subject, code: 'IF690' })).status,
    409,
  )
  const professor = { name: 'Beatriz', email: 'beatriz@example.edu' }
  assert.equal(
    (await office('/secretaria/professores', 'POST', { ...professor, email: 'invalido' })).status,
    400,
  )
  const prof = await office('/secretaria/professores', 'POST', professor)
  assert.equal(prof.status, 201)
  assert.equal(
    (
      await office('/secretaria/professores', 'POST', {
        ...professor,
        email: professor.email.toUpperCase(),
      })
    ).status,
    409,
  )
  const section = { subjectId: id, professorId: (await prof.json()).id, capacity: 2 }
  for (const bad of [{ capacity: 0 }, { subjectId: 999 }, { professorId: 999 }])
    assert.ok(
      [400, 404].includes((await office('/secretaria/turmas', 'POST', { ...section, ...bad })).status),
    )
  const response = await office('/secretaria/turmas', 'POST', section)
  assert.equal(response.status, 201)
  const sectionId = (await response.json()).id
  for (const client of [ana, bruno])
    assert.equal((await client('/aluno/matriculas', 'POST', { sectionId })).status, 201)
  assert.equal((await office('/secretaria/turmas/' + sectionId, 'PATCH', { capacity: 1 })).status, 409)
  assert.equal((await office('/secretaria/turmas/' + sectionId, 'PATCH', { capacity: 2 })).status, 200)
  assert.equal((await office('/secretaria/turmas/' + sectionId, 'PATCH', { capacity: 3 })).status, 200)
  const sections = (await (await office('/secretaria/turmas')).json()) as Section[]
  assert.equal(sections.find((s) => s.id === sectionId)!.occupied, 2)
})
