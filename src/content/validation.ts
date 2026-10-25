import type { Concept, Exercise, Lesson, Subject, Topic } from '../domain/models'
import { normalizeRecall } from '../domain/grading'
import { diagnosticScenarios } from './diagnostic-scenarios'

/** Content-authoring checks. Electrical worked solutions also require independent reference tests. */
export function validateCurriculum(catalogue: {
  subject: Subject
  topics: Topic[]
  concepts: Concept[]
  lessons: Lesson[]
  exercises: Exercise[]
}): string[] {
  const { subject, topics, concepts, lessons, exercises } = catalogue
  const errors: string[] = []
  for (const [name, entries] of Object.entries({ topics, concepts, lessons, exercises })) {
    const ids = new Set<string>()
    for (const entry of entries) {
      if (!entry.id || ids.has(entry.id)) errors.push(`${name}: doppelte oder leere ID ${entry.id}`)
      ids.add(entry.id)
    }
  }
  const topicIds = new Set(topics.map((topic) => topic.id))
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]))
  const visiting = new Set<string>()
  const visited = new Set<string>()
  function visit(id: string) {
    if (visiting.has(id)) {
      errors.push(`Zyklische Voraussetzung: ${id}`)
      return
    }
    if (visited.has(id)) return
    visiting.add(id)
    for (const prerequisite of topics.find((topic) => topic.id === id)?.prerequisites ?? [])
      if (topicIds.has(prerequisite)) visit(prerequisite)
    visiting.delete(id)
    visited.add(id)
  }
  for (const topic of topics) {
    if (topic.subjectId !== subject.id) errors.push(`Unbekanntes Fach: ${topic.id}`)
    for (const prerequisite of topic.prerequisites) {
      if (!topicIds.has(prerequisite)) errors.push(`Unbekannte Voraussetzung: ${topic.id}`)
      const parent = topics.find((entry) => entry.id === prerequisite)
      if (parent && parent.tier >= topic.tier)
        errors.push(`Ungültige Themenreihenfolge: ${topic.id}`)
    }
    if (!lessons.some((lesson) => lesson.topicId === topic.id))
      errors.push(`Lektion fehlt: ${topic.id}`)
    visit(topic.id)
  }
  for (const entry of [...concepts, ...lessons, ...exercises])
    if (!topicIds.has(entry.topicId)) errors.push(`Unbekanntes Thema: ${entry.id}`)
  for (const exercise of exercises) {
    if (!exercise.conceptIds.length) errors.push(`Konzept fehlt: ${exercise.id}`)
    for (const id of exercise.conceptIds)
      if (!conceptById.has(id)) errors.push(`Unbekanntes Konzept: ${exercise.id}/${id}`)
    if (!exercise.prompt.trim() || !exercise.explanation.trim() || !exercise.hint.trim())
      errors.push(`Aufgabentext unvollständig: ${exercise.id}`)
    if (exercise.type === 'numeric') {
      if (
        !Number.isFinite(exercise.answer) ||
        !Number.isFinite(exercise.tolerance) ||
        exercise.tolerance < 0
      )
        errors.push(`Ungültige Zahl oder Toleranz: ${exercise.id}`)
    } else if (exercise.type === 'choice') {
      if (new Set(exercise.options.map((option) => option.id)).size !== exercise.options.length)
        errors.push(`Doppelte Auswahl: ${exercise.id}`)
      if (!exercise.options.some((option) => option.id === exercise.answer))
        errors.push(`Auswahlantwort fehlt: ${exercise.id}`)
    } else if (exercise.type === 'recall') {
      if (!exercise.aliases.length || exercise.aliases.some((alias) => !normalizeRecall(alias)))
        errors.push(`Kurzantwort fehlt: ${exercise.id}`)
      if (new Set(exercise.aliases.map(normalizeRecall)).size !== exercise.aliases.length)
        errors.push(`Doppelte Kurzantwort: ${exercise.id}`)
    }
    if (exercise.reviewable && (exercise.type === 'numeric' || exercise.type === 'schematic'))
      errors.push(`Anwendung hat Gedächtnisbewertung: ${exercise.id}`)
    if (
      exercise.type === 'diagnostic' &&
      (exercise.reviewable ||
        !diagnosticScenarios.some(
          (s) =>
            s.id === exercise.scenarioId &&
            s.circuitId === exercise.circuitId &&
            s.difficulties.includes(exercise.difficulty),
        ))
    )
      errors.push(`Ungültige Fehlersuchaufgabe: ${exercise.id}`)
  }
  return errors
}
