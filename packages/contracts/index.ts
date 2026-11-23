export type Role = 'aluno' | 'secretaria'
export type Group = 'obrigatoria' | 'perfil' | 'livre'
export type Goals = Record<Group, number>
export interface User {
  id: number
  name: string
  username: string
  role: Role
  courseId: number | null
  course: string | null
}
export interface Session extends User {
  expiresAt: number
}
export interface Subject {
  id: number
  code: string
  name: string
  hours: number
}
export interface Professor {
  id: number
  name: string
  email: string
}
export interface Meeting {
  day: number
  start: number
  end: number
}
export interface Section {
  meetings: Meeting[]
  id: number
  subjectId: number
  code: string
  name: string
  hours: number
  professor: string
  capacity: number
  occupied: number
}
export interface Offer extends Section {
  group: Group
  unavailable: string | null
}
export interface Enrollment extends Section {
  enrollmentId: number
  group: Group
}
export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}
export interface ProgressRow {
  group: Group
  required: number
  completed: number
  ongoing: number
  remaining: number
  percent: number
}
export interface Planner extends Page<Offer> {
  drafts: Offer[]
  confirmed: Enrollment[]
  progress: Progress
}
export interface Progress {
  history: HistoryEntry[]
  groups: ProgressRow[]
  semesterHours: number
  semesterLimit: number
}
export interface HistoryEntry {
  id: number
  subjectId: number
  code: string
  name: string
  hours: number
  result: 'aprovada' | 'reprovada'
}
