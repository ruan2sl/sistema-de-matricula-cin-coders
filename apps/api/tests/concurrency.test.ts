import test from 'node:test'
import assert from 'node:assert/strict'
import { Worker } from 'node:worker_threads'
import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../src/db/database.ts'
import { seed } from '../src/seed.ts'

test(
  'duas conexões SQLite independentes só conseguem ocupar uma última vaga',
  { timeout: 15000 },
  async (t) => {
    const folder = mkdtempSync(join(tmpdir(), 'matricula-concorrencia-'))
    const filename = join(folder, 'teste.sqlite')
    const db = openDatabase(filename)
    seed(db)
    const workers = [1, 2].map(
      (studentId) =>
        new Worker(new URL('./concurrent-enroll.ts', import.meta.url), {
          workerData: { filename, studentId },
        }),
    )
    t.after(async () => {
      await Promise.all(workers.map((worker) => worker.terminate()))
      db.close()
      rmSync(folder, { recursive: true, force: true })
    })
    await Promise.all(workers.map((worker) => once(worker, 'message')))
    const results = workers.map((worker) => once(worker, 'message'))
    for (const worker of workers) worker.postMessage('start')
    assert.deepEqual((await Promise.all(results)).flat().sort(), [201, 409])
    assert.equal(db.prepare('SELECT occupied FROM section_details WHERE id=1').get()!.occupied, 1)
  },
)
