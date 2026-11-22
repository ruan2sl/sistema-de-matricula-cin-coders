import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateProgress, classify } from '../src/domain/progress.ts'
import type { Curriculum } from '../src/domain/progress.ts'

const curriculum: Curriculum = new Map([
  [1, 'obrigatoria'],
  [2, 'perfil'],
  [3, 'perfil'],
])
const goals = { obrigatoria: 120, perfil: 60, livre: 60 }
test('a mesma disciplina muda de grupo conforme a estrutura do curso', () => {
  assert.equal(classify(curriculum, 1), 'obrigatoria')
  assert.equal(classify(new Map([[1, 'perfil']]), 1), 'perfil')
  assert.equal(classify(new Map(), 1), 'livre')
})
test('transfere apenas o excedente aprovado de perfil, separa a CH em curso e deduplica aprovações', () => {
  const approved = [
    [1, 60],
    [2, 60],
    [3, 30],
    [4, 15],
    [4, 15],
  ].map(([subjectId, hours]) => ({ subjectId, hours }))
  const groups = calculateProgress(goals, curriculum, approved, [{ subjectId: 1, hours: 60 }])
  assert.deepEqual(
    groups.map((x) => [x.completed, x.ongoing, x.remaining, x.percent]),
    [
      [60, 60, 60, 50],
      [60, 0, 0, 100],
      [45, 0, 15, 75],
    ],
  )
})
test('grupos excedentes ficam em 100%, faltante zero, e obrigatórias excedentes permanecem no grupo', () => {
  const groups = calculateProgress(
    { obrigatoria: 30, perfil: 0, livre: 15 },
    curriculum,
    [
      { subjectId: 1, hours: 60 },
      { subjectId: 2, hours: 45 },
    ],
    [{ subjectId: 3, hours: 30 }],
  )
  assert.deepEqual(
    groups.map((x) => [x.completed, x.ongoing, x.remaining, x.percent]),
    [
      [60, 0, 0, 100],
      [0, 30, 0, 100],
      [45, 0, 0, 100],
    ],
  )
})
