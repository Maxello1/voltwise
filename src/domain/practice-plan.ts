import { conceptMastery } from './models'
import type {
  AttemptEvent,
  Concept,
  Exercise,
  Lesson,
  LessonCompletion,
  ReviewState,
  Topic,
} from './models'

export function practiceRecommendations(concepts: Concept[], attempts: AttemptEvent[]) {
  return conceptMastery(concepts, attempts)
    .filter((row) => row.score !== null && row.score < 0.8)
    .sort((a, b) => a.score! - b.score! || b.attempts - a.attempts)
    .map((row) => ({
      ...row,
      concept: concepts.find((concept) => concept.id === row.conceptId)!,
      explanation: `${row.correct} von ${row.attempts} ${row.attempts === 1 ? 'Versuch' : 'Versuchen'} ohne Hinweis richtig.${row.attempts < 3 ? ' Erste Anhaltspunkte – übe verschiedene Aufgaben.' : ''}`,
    }))
}

export function prerequisitesRead(
  topic: Topic,
  lessons: Lesson[],
  completions: LessonCompletion[],
): boolean {
  return topic.prerequisites.every((id) => {
    const required = lessons.filter((lesson) => lesson.topicId === id)
    return (
      required.length > 0 &&
      required.every((lesson) => completions.some((entry) => entry.lessonId === lesson.id))
    )
  })
}

export interface PracticePlanItem {
  exercise: Exercise
  kind: 'due' | 'support' | 'new' | 'practice'
  explanation: string
}

export interface PracticePlanInput {
  exercises: Exercise[]
  concepts: Concept[]
  topics: Topic[]
  lessons: Lesson[]
  attempts: AttemptEvent[]
  reviewStates: ReviewState[]
  completions: LessonCompletion[]
  now: Date
  topicId?: string
  conceptId?: string
  limit?: number
}

/** A transparent practice order; this function never changes a memory card or an event. */
export function planPractice(input: PracticePlanInput): PracticePlanItem[] {
  const { exercises, concepts, topics, lessons, attempts, reviewStates, completions, now } = input
  const recommendations = practiceRecommendations(concepts, attempts)
  const latest = new Map<string, AttemptEvent>()
  for (const attempt of [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
    latest.set(attempt.exerciseId, attempt)
  const explicitlyTargeted = !!input.topicId || !!input.conceptId
  const ranked = exercises
    .filter(
      (exercise) =>
        (!input.topicId || exercise.topicId === input.topicId) &&
        (!input.conceptId || exercise.conceptIds.includes(input.conceptId)),
    )
    .flatMap((exercise, index) => {
      const state = reviewStates.find((entry) => entry.exerciseId === exercise.id)
      const due = exercise.reviewable && !!state && new Date(state.card.due) <= now
      // A future scheduled fact stays on its own timetable, even after an incorrect answer.
      if (exercise.reviewable && state && !due) return []
      const previous = latest.get(exercise.id)
      const topic = topics.find((entry) => entry.id === exercise.topicId)
      const eligible =
        explicitlyTargeted ||
        (topic && prerequisitesRead(topic, lessons, completions)) ||
        !!previous
      if (!eligible && !due) return []
      const recommendation = recommendations.find((entry) =>
        exercise.conceptIds.includes(entry.conceptId),
      )
      const needsSupport =
        (!!previous && (!previous.correct || previous.hints > 0)) || (!!recommendation && !previous)
      const kind: PracticePlanItem['kind'] = due
        ? 'due'
        : needsSupport
          ? 'support'
          : previous
            ? 'practice'
            : 'new'
      const explanation = due
        ? 'Nach deiner eigenen Erinnerungsbewertung jetzt im FSRS-Zeitplan fällig.'
        : needsSupport
          ? recommendation
            ? `${recommendation.concept.title}: ${recommendation.explanation}`
            : 'Bei deinem letzten Versuch noch nicht ohne Hinweis gelöst.'
          : previous
            ? 'Schon selbstständig gelöst. Eine weitere Anwendung zur Festigung.'
            : 'Noch nicht bearbeitet. Eine neue Aufgabe im gewählten Lernpfad.'
      return [{ exercise, kind, explanation, index, previous, recommendation }]
    })
  const priorities = { due: 0, support: 1, new: 2, practice: 3 }
  ranked.sort(
    (a, b) =>
      priorities[a.kind] - priorities[b.kind] ||
      // Within support, try an unseen variation before repeating a failed answer.
      (a.kind === 'support' ? Number(!!a.previous) - Number(!!b.previous) : 0) ||
      (a.kind === 'new' || a.kind === 'support'
        ? (topics.find((topic) => topic.id === a.exercise.topicId)?.tier ?? 0) -
          (topics.find((topic) => topic.id === b.exercise.topicId)?.tier ?? 0)
        : 0) ||
      (a.kind === 'due'
        ? reviewStates
            .find((state) => state.exerciseId === a.exercise.id)!
            .card.due.localeCompare(
              reviewStates.find((state) => state.exerciseId === b.exercise.id)!.card.due,
            )
        : 0) ||
      (a.kind === 'practice' ? a.previous!.createdAt.localeCompare(b.previous!.createdAt) : 0) ||
      a.index - b.index,
  )
  return ranked.slice(0, input.limit ?? 5).map(({ exercise, kind, explanation }) => ({
    exercise,
    kind,
    explanation,
  }))
}
