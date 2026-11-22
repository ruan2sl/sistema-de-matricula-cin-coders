import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import express from 'express'
import { openDatabase } from './db/database.ts'
import { createApp } from './http/app.ts'

const db = openDatabase()
const app = createApp(db)
const server = createServer(app)
const web = fileURLToPath(new URL('../../web/', import.meta.url))
const port = Number(process.env.PORT || 3000)
if (process.argv.includes('--dev')) {
  const { createServer: createVite } = await import('vite')
  const vite = await createVite({
    root: web,
    server: { middlewareMode: true, hmr: { server } },
    appType: 'spa',
  })
  app.use(vite.middlewares)
} else {
  app.use(express.static(join(web, 'dist')))
  app.get('/{*path}', (_req, res) => res.sendFile(join(web, 'dist', 'index.html')))
}
server.listen(port, '127.0.0.1', () => console.log(`Matrícula em http://localhost:${port}`))
