import type { Goals, Group, ProgressRow } from '@matricula/contracts'

export interface Credit {
  subjectId: number
  hours: number
}
export type Curriculum = ReadonlyMap<number, Group>
export function classify(curriculum: Curriculum, subjectId: number): Group {
  return curriculum.get(subjectId) ?? 'livre'
}

export function calculateProgress(
  goals: Goals,
  curriculum: Curriculum,
  approved: Credit[],
  active: Credit[],
): ProgressRow[] {
  const completed: Goals = { obrigatoria: 0, perfil: 0, livre: 0 }
  const ongoing: Goals = { obrigatoria: 0, perfil: 0, livre: 0 }
  const counted = new Set<number>()
  for (const credit of approved) {
    if (counted.has(credit.subjectId)) continue
    counted.add(credit.subjectId)
    completed[classify(curriculum, credit.subjectId)] += credit.hours
  }
  for (const credit of active) ongoing[classify(curriculum, credit.subjectId)] += credit.hours
  const overflow = Math.max(0, completed.perfil - goals.perfil)
  completed.perfil -= overflow
  completed.livre += overflow
  const groups: Group[] = ['obrigatoria', 'perfil', 'livre']
  return groups.map((group) => ({
    group,
    required: goals[group],
    completed: completed[group],
    ongoing: ongoing[group],
    remaining: Math.max(0, goals[group] - completed[group]),
    percent:
      goals[group] === 0 ? 100 : Math.min(100, Math.floor((completed[group] * 100) / goals[group])),
  }))
}
