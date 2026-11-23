import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import express from 'express'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import { openDatabase } from '../../api/src/db/database.ts'
import { createApp } from '../../api/src/http/app.ts'
import { seed } from '../../api/src/seed.ts'

const test = base.extend({
  baseURL: async ({}, use) => {
    const db = openDatabase(':memory:')
    seed(db)
    const app = createApp(db)
    const dist = resolve('apps/web/dist')
    app.use(express.static(dist))
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(dist, 'index.html')))
    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      await use('http://127.0.0.1:' + (server.address() as AddressInfo).port)
    } finally {
      await new Promise<void>((done) => server.close(() => done()))
      db.close()
    }
  },
})
async function login(page: Page, name: string) {
  await page.goto('/')
  await page.getByLabel('Nome de usuário').fill(name)
  await page.getByRole('button', { name: 'Entrar no portal' }).click()
}
test('confirma a matrícula mesmo quando o navegador bloqueia o armazenamento local', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Armazenamento bloqueado', 'SecurityError') }
  })
  await login(page, 'ana')
  const card = page.locator('.offer-cards li').filter({ hasText: 'Banco de Dados' })
  await card.getByRole('button', { name: 'Matricular-se' }).click()
  await expect(page.getByText('Matrícula confirmada em Banco de Dados.')).toBeVisible()
  await page.reload()
  await expect(card.getByText('Matrícula confirmada')).toBeVisible()
})

test('recupera as ofertas após falha de conexão preservando a busca', async ({ page }) => {
  await login(page, 'ana')
  const search = page.getByRole('searchbox')
  await expect(search).toBeVisible()
  await page.route('**/api/aluno/planejamento?*q=IF690*', route => route.abort(), { times: 1 })
  await search.fill('IF690')
  await expect(page.getByRole('alert')).toContainText('Falha na conexão')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  const cards = page.locator('.offer-cards li')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Banco de Dados')
  await expect(search).toHaveValue('IF690')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
test('matricula diretamente e mostra conflito ao consultar a próxima turma', async ({ page }, info) => {
  await login(page, 'ana')
  const card = (name: string) =>
    page.locator('.offer-cards li').filter({ has: page.getByRole('heading', { name, exact: true }) })
  await card('Banco de Dados').getByRole('button', { name: 'Matricular-se' }).click()
  await expect(page.locator('.calendar-event.confirmed')).toHaveCount(2)
  await card('Design de Interação').getByRole('button', { name: 'Ver na grade' }).click()
  await expect(page.locator('.clashes')).toContainText('Segunda 09:00–10:00')
  await expect(page.locator('.calendar-event.draft')).toHaveCount(2)
  const catalog = await page.locator('.catalog').boundingBox(),
    grade = await page.locator('.schedule-panel').boundingBox()
  expect(catalog!.x).toBeLessThan(grade!.x)
  expect(catalog!.width).toBeGreaterThan(grade!.width)
  await page.screenshot({ path: info.outputPath('planejamento-desktop.png') })
  await page.getByRole('button', { name: 'Cancelar matrícula' }).click()
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click()
  await expect(page.locator('.calendar-event.confirmed')).toHaveCount(0)
})
test('grade semanal mantém dias em colunas em 360px', async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await login(page, 'ana')
  await page.getByRole('button', { name: 'Ver na grade' }).first().click()
  const seg = await page.getByText('Seg', { exact: true }).boundingBox(),
    ter = await page.getByText('Ter', { exact: true }).boundingBox()
  expect(seg!.y).toBe(ter!.y)
  expect(seg!.x).toBeLessThan(ter!.x)
  await expect(page.locator('.calendar-event.draft').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('planejamento-mobile.png') })
})
test('duas abas acompanham a troca de usuário e descartam a seleção da outra pessoa', async ({
  page,
  context,
  baseURL,
}) => {
  await login(page, 'ana')
  await page.getByRole('button', { name: 'Ver na grade' }).first().click()
  const other = await context.newPage()
  await other.goto(baseURL!)
  await other.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  await login(other, 'bruno')
  await expect(page.locator('.identity')).toContainText('Bruno Costa')
  await expect(page.locator('.calendar-event.draft')).toHaveCount(0)
  await expect(page.locator('.enrolled-panel')).toContainText('Suas turmas confirmadas')
})
test('a secretaria edita horários e o aluno consulta os encontros cadastrados', async ({ page }) => {
  await login(page, 'secretaria')
  await page.getByRole('link', { name: 'Turmas', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: 'Banco de Dados' })
  await row.getByRole('button', { name: 'Editar horários' }).click()
  await page.getByLabel('Início do encontro 1').fill('07:30')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(row).toContainText('07:30')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await login(page, 'ana')
  await page
    .locator('.offer-cards li')
    .filter({ hasText: 'Banco de Dados' })
    .getByRole('button', { name: 'Ver na grade' })
    .click()
  await expect(page.getByRole('button', { name: /Segunda 07:30–10:00.*Banco de Dados/ })).toBeVisible()
})

test('turmas da mesma disciplina compartilham cartão e a matrícula usa o professor escolhido', async ({
  page,
}) => {
  await login(page, 'ana')
  const cards = page.locator('.offer-cards li').filter({ hasText: 'Algoritmos e Estruturas de Dados' })
  await expect(cards).toHaveCount(1)
  await cards.getByRole('button', { name: /T9 · Helena/ }).click()
  await expect(cards).toContainText('Seg 14:00–16:00')
  await expect(page.locator('.calendar-event.draft').first()).toContainText('T9')
  await cards.getByRole('button', { name: 'Matricular-se' }).click()
  await expect(page.locator('.calendar-event.confirmed').first()).toContainText('T9')
  await page
    .locator('.offer-cards li')
    .filter({ hasText: 'Banco de Dados' })
    .getByRole('button', { name: 'Ver na grade' })
    .click()
  const color = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--course-color'))
  expect(await color('.calendar-event.draft')).not.toBe(await color('.calendar-event.confirmed'))
})

test('Progresso exibe as disciplinas e os resultados do histórico de Ana', async ({page},info)=>{
  await login(page,'ana')
  await page.getByRole('link',{name:'Progresso',exact:true}).click()
  const history=page.getByRole('region',{name:'Disciplinas cursadas'})
  await expect(history.getByRole('listitem')).toHaveCount(4)
  await expect(history.getByText('Aprovada',{exact:true})).toHaveCount(3)
  await expect(history.getByRole('listitem').filter({hasText:'Algoritmos e Estruturas de Dados'})).toContainText('Reprovada')
  await history.screenshot({path:info.outputPath('historico-ana.png')})
})

test('busca enquanto digita e mantém várias disciplinas na grade', async ({ page }) => {
  await login(page, 'ana')
  const search = page.getByRole('searchbox')
  const cards = page.locator('.offer-cards li')
  const previews = page.locator('.preview-note')
  await cards.filter({ hasText: 'Banco de Dados' }).getByText('Ver na grade').click()
  await search.fill('ds101')
  await expect(cards).toHaveCount(1)
  await cards.getByText('Ver na grade').click()
  await expect(previews).toHaveCount(2)
  await expect(page.locator('.clashes')).toContainText('Segunda 09:00–10:00')
  await search.fill('xyz999')
  await expect(cards).toHaveCount(0)
  await expect(previews).toHaveCount(2)
  await search.fill('')
  await expect(cards.filter({ hasText: 'Banco de Dados' })).toBeVisible()
  await previews.filter({ hasText: 'Design de Interação' }).getByText('Fechar prévia').click()
  await expect(previews).toHaveCount(1)
  await expect(previews).toContainText('Banco de Dados')
})

test('aluno vê a posição na fila e a matrícula automática quando a vaga é liberada', async ({ page, baseURL, playwright }) => {
  const ana = await playwright.request.newContext({ baseURL })
  try {
    await ana.post('/api/sessao', { data: { username: 'ana' } })
    const enrollment = await (await ana.post('/api/aluno/matriculas', { data: { sectionId: 1 } })).json()
    await login(page, 'bruno')
    const card = page.locator('.offer-cards li').filter({ hasText: 'Banco de Dados' })
    await card.getByRole('button', { name: 'Entrar na lista de espera' }).click()
    const waiting = page.getByRole('region', { name: 'Lista de espera' })
    await expect(waiting).toContainText('1ª posição')
    await waiting.getByRole('button', { name: 'Sair da fila' }).click()
    await expect(waiting).toHaveCount(0)
    await card.getByRole('button', { name: 'Entrar na lista de espera' }).click()
    await expect(waiting).toContainText('1ª posição')
    expect((await ana.delete('/api/aluno/matriculas/' + enrollment.id)).status()).toBe(204)
    await page.reload()
    await expect(card.getByText('Matrícula confirmada')).toBeVisible()
    await expect(page.locator('#matriculas')).toContainText('Banco de Dados')
    await expect(waiting).toHaveCount(0)
    await expect(page.locator('.academic-summary')).toContainText('60h')
  } finally {
    await ana.dispose()
  }
})
