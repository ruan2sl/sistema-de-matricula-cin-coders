import { createHash, randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'
import type { Session, User, Role } from '@matricula/contracts'
import type { Db } from '../db/database.ts'
import { first } from '../db/queries.ts'
import { HttpError, stringField } from './input.ts'

const ttl = 8 * 60 * 60 * 1000
const cookieName = 'matricula_sid'
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  secure: process.env.COOKIE_SECURE === 'true',
}
const userColumns = 'u.id,u.username,u.name,u.role,u.courseId,c.name AS course'
const userTables = 'users u LEFT JOIN courses c ON u.courseId=c.id'
function digest(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
function cookie(req: Request) {
  const entry = (req.headers.cookie ?? '')
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(cookieName + '='))
  return entry?.slice(cookieName.length + 1) ?? ''
}
export function login(db: Db, req: Request, res: Response) {
  const username = stringField(req.body?.username, 'o nome de usuário', 80)
  const user = first<User>(db, `SELECT ${userColumns} FROM ${userTables} WHERE u.username=?`, username)
  if (!user) throw new HttpError(401, 'Usuário não encontrado.')
  const token = randomBytes(32).toString('hex')
  db.prepare('DELETE FROM sessions WHERE expires<=? OR token=?').run(Date.now(), digest(cookie(req)))
  const expiresAt = Date.now() + ttl
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), user.id, expiresAt)
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: ttl }).json({ ...user, expiresAt })
}
export function current(db: Db, req: Request, role?: Role): Session {
  const user = first<Session>(
    db,
    `SELECT ${userColumns},s.expires AS expiresAt FROM ${userTables}
    JOIN sessions s ON s.userId=u.id WHERE s.token=? AND s.expires>?`,
    digest(cookie(req)),
    Date.now(),
  )
  if (!user) throw new HttpError(401, 'Entre novamente para continuar.')
  if (role && role !== user.role) throw new HttpError(403, 'Esta área pertence a outro perfil.')
  return user
}
export function logout(db: Db, req: Request, res: Response) {
  db.prepare('DELETE FROM sessions WHERE token=?').run(digest(cookie(req)))
  res.clearCookie(cookieName, cookieOptions).sendStatus(204)
}
