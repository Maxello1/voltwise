import { describe, expect, it } from 'vitest'
import * as curriculum from '../../src/content/curriculum'
import { validateCurriculum } from '../../src/content/validation'
import { gradeExercise } from '../../src/domain/grading'

function contentCopy() {
  return structuredClone({
    subject: curriculum.subject,
    topics: curriculum.topics,
    concepts: curriculum.concepts,
    lessons: curriculum.lessons,
    exercises: curriculum.exercises,
  })
}

describe('foundation content authoring', () => {
  it('has 61 versioned tasks with coherent references, prerequisites and explicit recall aliases', () => {
    expect(curriculum.exercises).toHaveLength(61)
    expect(validateCurriculum(curriculum)).toEqual([])
    expect(curriculum.exercises.every((exercise) => exercise.version >= 1)).toBe(true)
  })
  it('rejects a prerequisite cycle, missing concept and choice answer, and invalid numeric tolerance', () => {
    const broken = contentCopy()
    broken.topics[0]!.prerequisites = ['measurement']
    broken.exercises[0]!.conceptIds = ['unknown']
    const choice = broken.exercises.find((exercise) => exercise.type === 'choice')!
    if (choice.type === 'choice') choice.answer = 'missing'
    const numeric = broken.exercises.find((exercise) => exercise.type === 'numeric')!
    if (numeric.type === 'numeric') numeric.tolerance = -1
    const errors = validateCurriculum(broken).join('\n')
    expect(errors).toContain('Zyklische Voraussetzung')
    expect(errors).toContain('Unbekanntes Konzept')
    expect(errors).toContain('Auswahlantwort fehlt')
    expect(errors).toContain('Ungültige Zahl oder Toleranz')
  })
  it('rejects duplicate IDs, empty recall aliases and missing prerequisite lessons', () => {
    const broken = contentCopy()
    broken.exercises.push(broken.exercises[0]!)
    const recall = broken.exercises.find((exercise) => exercise.type === 'recall')!
    if (recall.type === 'recall') recall.aliases = ['...']
    broken.lessons = broken.lessons.filter((lesson) => lesson.topicId !== 'basics')
    const errors = validateCurriculum(broken).join('\n')
    expect(errors).toContain('doppelte oder leere ID')
    expect(errors).toContain('Kurzantwort fehlt')
    expect(errors).toContain('Lektion fehlt')
  })
  it.each([
    ['resistance-prefix', `${4.7 * 1000} Ω`, '4,7 Ω'],
    ['microampere', `${250 / 1e6} A`, '0,25 A'],
    ['ohm-voltage', `${500 * (20 / 1000)} V`, '10000 V'],
    ['node-outgoing', `${(450 - 300) / 1000} A`, '0,75 A'],
  ])(
    'checks %s against a separately calculated reference and a plausible mistake',
    (id, answer, wrong) => {
      const exercise = curriculum.exerciseById.get(id!)!
      expect(gradeExercise(exercise, answer!).correct).toBe(true)
      expect(gradeExercise(exercise, wrong!).correct).toBe(false)
    },
  )
})
