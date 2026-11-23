import type { CSSProperties } from 'react'
const colors = [
  '#8c345a',
  '#375e9f',
  '#247268',
  '#7847a1',
  '#905621',
  '#315c7e',
  '#95523e',
  '#536828',
  '#98364a',
  '#285b75',
]
export function courseColor(subjectId: number, sectionId: number): CSSProperties {
  const base = colors[(subjectId - 1) % colors.length]
  return {
    '--course-color': base,
    '--section-color': `color-mix(in srgb, ${base} ${100 - (sectionId % 5) * 5}%, #302638)`,
  } as CSSProperties
}
