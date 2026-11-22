import { parentPort, workerData } from 'node:worker_threads'
import type { User } from '@matricula/contracts'
import { openDatabase } from '../src/db/database.ts'
import { first } from '../src/db/queries.ts'
import { enroll } from '../src/domain/student.ts'
import { HttpError } from '../src/http/input.ts'

const db = openDatabase(workerData.filename)
const student = first<User>(db, 'SELECT * FROM users WHERE id=?', workerData.studentId)!
parentPort!.postMessage('ready')
parentPort!.once('message', () => {
  try {
    enroll(db, student, 1)
    parentPort!.postMessage(201)
  } catch (error) {
    if (!(error instanceof HttpError)) throw error
    parentPort!.postMessage(error.status)
  } finally {
    db.close()
  }
})
