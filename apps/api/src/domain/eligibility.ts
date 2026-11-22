import type { Section } from '@matricula/contracts'

interface Facts {
  passed: boolean
  enrolled: boolean
  semesterHours: number
  semesterLimit: number
}

export function blockingReason(section: Pick<Section, 'occupied' | 'capacity' | 'hours'>, facts: Facts) {
  if (facts.passed) return 'Disciplina já aprovada.'
  if (facts.enrolled) return 'Você já cursa esta disciplina neste semestre.'
  if (section.occupied >= section.capacity) return 'Turma lotada.'
  const remaining = facts.semesterLimit - facts.semesterHours
  if (section.hours > remaining)
    return `Limite de ${facts.semesterLimit}h por semestre. Restam ${remaining}h disponíveis.`
  return null
}
