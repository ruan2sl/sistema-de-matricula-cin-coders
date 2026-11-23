import { joinQueue, leaveQueue } from '../domain/enrollment.ts'
import express from 'express'
import type { ErrorRequestHandler } from 'express'
import type { Db } from '../db/database.ts'
import { catalogPage, rows } from '../db/queries.ts'
import { cancel, enroll, enrollments, offers, planner, progress } from '../domain/student.ts'
import { withMeetings } from '../domain/meetings.ts'
import type { Section } from '@matricula/contracts'
import { changeMeetings, createProfessor, openSection, resize, saveSubject } from '../domain/office.ts'
import { current, login, logout, SessionChanged } from './auth.ts'
import { HttpError, integer, parseId, readSearch } from './input.ts'

export function createApp(db: Db) {
  const app = express()
  app.disable('x-powered-by')
  const api = express.Router()
  app.use('/api', api)
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Sec-Fetch-Site') === 'cross-site') {
      throw new HttpError(403, 'Origem não permitida.')
    }
    next()
  })
  api.use(express.json({ limit: '12kb' }))
  api.post('/sessao', (req, res) => login(db, req, res))
  api.get('/sessao', (req, res) => res.json(current(db, req)))
  api.delete('/sessao', (req, res) => logout(db, req, res))

  const student = express.Router()
  api.use('/aluno', student)
  student.use((req, res, next) => {
    res.locals.user = current(db, req, 'aluno')
    next()
  })
  student.get('/ofertas', (req, res) => res.json(offers(db, res.locals.user, readSearch(req.query))))
  student.get('/planejamento', (req, res) => {
    const raw = req.query.simular
    if (raw !== undefined && typeof raw !== 'string')
      throw new HttpError(400, 'Seleção de turmas inválida.')
    const selected = raw ? [...new Set(raw.split(',').map(parseId))] : []
    res.json(
      planner(
        db,
        res.locals.user,
        { ...readSearch(req.query), grouped: req.query.agrupar === 'disciplina' },
        selected,
      ),
    )
  })
  student.post('/espera', (req, res) =>
    res.status(201).json(joinQueue(db, res.locals.user.id, integer(req.body?.sectionId, 'a turma'))),
  )
  student.delete('/espera/:id', (req, res) => {
    leaveQueue(db, res.locals.user.id, parseId(req.params.id))
    res.sendStatus(204)
  })
  student.get('/progresso', (_req, res) => res.json(progress(db, res.locals.user)))
  student.get('/matriculas', (_req, res) => res.json(enrollments(db, res.locals.user)))
  student.post('/matriculas', (req, res) =>
    res.status(201).json(enroll(db, res.locals.user, integer(req.body?.sectionId, 'a turma'))),
  )
  student.delete('/matriculas/:id', (req, res) => {
    cancel(db, res.locals.user.id, parseId(req.params.id))
    res.sendStatus(204)
  })

  const office = express.Router()
  api.use('/secretaria', office)
  office.use((req, _res, next) => {
    current(db, req, 'secretaria')
    next()
  })
  office.get('/disciplinas', (req, res) => res.json(catalogPage(db, 'subjects', readSearch(req.query))))
  office.post('/disciplinas', (req, res) => res.status(201).json(saveSubject(db, req.body ?? {})))
  office.put('/disciplinas/:id', (req, res) =>
    res.json(saveSubject(db, req.body ?? {}, parseId(req.params.id))),
  )
  office.get('/professores', (_req, res) =>
    res.json(rows(db, 'SELECT * FROM professors ORDER BY fold(name), id')),
  )
  office.post('/professores', (req, res) => res.status(201).json(createProfessor(db, req.body ?? {})))
  office.get('/turmas', (_req, res) =>
    res.json(
      withMeetings(db, rows<Section>(db, 'SELECT * FROM section_details ORDER BY fold(name), id')),
    ),
  )
  office.post('/turmas', (req, res) => res.status(201).json(openSection(db, req.body ?? {})))
  office.patch('/turmas/:id', (req, res) =>
    res.json(resize(db, parseId(req.params.id), req.body?.capacity)),
  )
  office.put('/turmas/:id/horarios', (req, res) =>
    res.json(changeMeetings(db, parseId(req.params.id), req.body?.meetings)),
  )
  office.get('/opcoes', (_req, res) =>
    res.json({
      subjects: rows(db, 'SELECT id,code,name FROM subjects ORDER BY fold(name), id'),
      professors: rows(db, 'SELECT id,name FROM professors ORDER BY fold(name), id'),
    }),
  )
  api.use((_req, _res) => {
    throw new HttpError(404, 'Rota não encontrada.')
  })
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof SessionChanged) res.set('X-Session-Changed', '1')
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    if (error.status === 400 || error.status === 413) {
      res.status(error.status).json({ error: 'Corpo da requisição inválido.' })
      return
    }
    if (error.errcode === 5) {
      res.status(503).json({ error: 'Banco ocupado. Tente novamente.' })
      return
    }
    console.error(error)
    res.status(500).json({ error: 'Não foi possível concluir a operação.' })
  }
  api.use(handleError)
  return app
}
