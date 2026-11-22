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
test('simula, identifica conflito, preserva a seleção e confirma sem sair da página', async ({
  page,
}, info) => {
  await login(page, 'ana')
  const simulate = (name: string) => page.getByRole('button', { name: 'Simular ' + name, exact: true })
  await simulate('Banco de Dados · Turma 1').click()
  await simulate('Design de Interação · Turma 3').click()
  await expect(page.getByText('Conflito de horário', { exact: true })).toBeVisible()
  await expect(page.locator('.clashes')).toContainText('Segunda, 09:00–10:00')
  await expect(page.locator('.time-block.draft')).toHaveCount(4)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByRole('heading', { name: 'Grade semanal' })).toBeInViewport()
  await page.screenshot({ path: info.outputPath('planejamento-desktop.png') })
  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.reload()
  await expect(page.locator('.time-block.draft')).toHaveCount(4)
  await page.getByLabel('Somente turmas em que posso me matricular').check()
  await expect(page).toHaveURL(/elegiveis=1/)
  await expect(page).not.toHaveURL(/page=2/)
  const selection = page.getByRole('complementary', { name: 'Seleção e matrículas' })
  await selection
    .getByRole('listitem')
    .filter({ hasText: 'Banco de Dados' })
    .getByRole('button', { name: 'Confirmar matrícula' })
    .click()
  await expect(page.locator('.time-block.confirmed')).toHaveCount(2)
  await expect(page.locator('.time-block.draft')).toHaveCount(2)
  await expect(page.locator('.load')).toContainText('60h')
  await page.getByLabel('Mostrar ofertas da página').uncheck()
  await expect(page.locator('.time-block.offer')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancelar matrícula', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click()
  await expect(page.locator('.time-block.confirmed')).toHaveCount(0)
  await expect(page.locator('.clashes')).toHaveCount(0)
})
test('agenda em 360px permite escolher o dia e simular pelo próprio horário', async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await login(page, 'ana')
  await page.getByRole('button', { name: 'Ter', exact: true }).click()
  await page.locator('.mobile-current .time-block').first().click()
  await page.getByRole('button', { name: 'Simular turma', exact: true }).click()
  await expect(page.locator('.mobile-current .draft').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar matrícula' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('planejamento-mobile.png') })
})
test('duas abas acompanham a troca de usuário e descartam a seleção da outra pessoa', async ({
  page,
  context,
  baseURL,
}) => {
  await login(page, 'ana')
  await page.getByRole('button', { name: 'Simular Banco de Dados · Turma 1', exact: true }).click()
  const other = await context.newPage()
  await other.goto(baseURL!)
  await other.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  await login(other, 'bruno')
  await expect(page.locator('.identity')).toContainText('Bruno Costa')
  await expect(page.locator('.time-block.draft')).toHaveCount(0)
  await expect(page.locator('.blank').first()).toContainText('Simular')
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
  await expect(page.getByRole('button', { name: /Banco de Dados.*Segunda 07:30–10:00/ })).toBeVisible()
})
