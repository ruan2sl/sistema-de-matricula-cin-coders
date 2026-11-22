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
export interface Subject { id: number; code: string; name: string; hours: number }
export interface Professor { id: number; name: string; email: string }
export interface Section {
  id: number
  subjectId: number
  code: string
  name: string
  hours: number
  professor: string
  capacity: number
  occupied: number
}
export interface Offer extends Section { group: Group; unavailable: string | null }
export interface Enrollment extends Section { enrollmentId: number; group: Group }
export interface Page<T> { items: T[]; page: number; pageSize: number; total: number }
export interface ProgressRow {
  group: Group
  required: number
  completed: number
  ongoing: number
  remaining: number
  percent: number
}
export interface Progress { groups: ProgressRow[]; semesterHours: number; semesterLimit: number }
