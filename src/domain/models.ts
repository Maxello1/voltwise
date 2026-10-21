import { z } from 'zod'

export interface Subject {
  id: string
  version: number
  title: string
  description: string
}
export interface Topic {
  id: string
  subjectId: string
  title: string
  description: string
  prerequisites: string[]
  tier: number
  color: string
}
export interface Concept {
  id: string
  topicId: string
  title: string
}
export interface Lesson {
  id: string
  version: number
  topicId: string
  title: string
  minutes: number
  sections: { title: string; body: string; formula?: string }[]
}
interface ExerciseBase {
  id: string
  version: number
  topicId: string
  conceptIds: string[]
  difficulty: 1 | 2 | 3
  title: string
  prompt: string
  explanation: string
  hint: string
  reviewable: boolean
}
export type Exercise = ExerciseBase &
  (
    | { type: 'choice'; options: { id: string; text: string }[]; answer: string }
    | { type: 'recall'; aliases: string[]; answerLabel: string }
    | { type: 'numeric'; answer: number; unit: Unit; tolerance: number; circuitId?: string }
    | { type: 'schematic'; circuitId: string; answer: string; answerLabel: string }
  )
export type Unit = 'A' | 'V' | 'Ω' | 'W' | 'Hz'
export interface Grade {
  correct: boolean
  normalizedAnswer: string
  invalid?: string
}

const id = z.uuid()
const iso = z.iso.datetime()
const boundedText = z.string().max(2000)
export const cardSchema = z
  .object({
    due: iso,
    stability: z.number().finite().nonnegative(),
    difficulty: z.number().finite().min(0).max(10),
    elapsed_days: z.number().finite().nonnegative(),
    scheduled_days: z.number().finite().nonnegative(),
    learning_steps: z.number().int().nonnegative(),
    reps: z.number().int().nonnegative(),
    lapses: z.number().int().nonnegative(),
    state: z.number().int().min(0).max(3),
    last_review: iso.optional(),
  })
  .strict()
export type ReviewCard = z.infer<typeof cardSchema>
export const attemptSchema = z
  .object({
    eventId: id,
    deviceId: id,
    sessionId: id,
    exerciseId: z.string().max(100),
    exerciseVersion: z.number().int().positive(),
    createdAt: iso,
    conceptIds: z.array(z.string().max(100)).max(20),
    correct: z.boolean(),
    answer: boundedText,
    normalizedAnswer: boundedText,
    hints: z.number().int().min(0).max(1),
    durationMs: z.number().int().nonnegative(),
  })
  .strict()
export type AttemptEvent = z.infer<typeof attemptSchema>
export const reviewSchema = z
  .object({
    eventId: id,
    attemptId: id,
    deviceId: id,
    exerciseId: z.string().max(100),
    createdAt: iso,
    rating: z.number().int().min(1).max(4),
    schedulerVersion: z.literal('ts-fsrs@5.4.2'),
    retention: z.literal(0.9),
    cardBefore: cardSchema,
    cardAfter: cardSchema,
    log: z.record(z.string(), z.union([z.number().finite(), z.string()])),
  })
  .strict()
export type ReviewEvent = z.infer<typeof reviewSchema>
export const reviewStateSchema = z
  .object({ exerciseId: z.string().max(100), lastEventId: id, card: cardSchema })
  .strict()
export type ReviewState = z.infer<typeof reviewStateSchema>
export const sessionSchema = z
  .object({
    id,
    mode: z.enum(['practice', 'review', 'schematic']),
    exerciseIds: z.array(z.string().max(100)).min(1).max(100),
    position: z.number().int().nonnegative(),
    status: z.enum(['active', 'complete']),
    startedAt: iso,
    completedAt: iso.optional(),
    pendingAttemptId: id.optional(),
  })
  .strict()
  .refine((s) => s.position <= s.exerciseIds.length, 'Ungültige Sitzungsposition')
export type LearningSession = z.infer<typeof sessionSchema>
export const completionSchema = z
  .object({ lessonId: z.string().max(100), completedAt: iso })
  .strict()
export type LessonCompletion = z.infer<typeof completionSchema>
export const settingsSchema = z
  .object({
    id: z.literal('preferences'),
    locale: z.literal('de'),
    theme: z.enum(['system', 'light', 'dark']),
    timezone: z.string().min(1).max(80),
    dailyGoal: z.number().int().min(1).max(100),
  })
  .strict()
export type Settings = z.infer<typeof settingsSchema>
export const defaultSettings: Settings = {
  id: 'preferences',
  locale: 'de',
  theme: 'system',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dailyGoal: 5,
}
export interface SyncOutbox {
  eventId: string
  kind: 'attempt' | 'review'
  createdAt: string
  retries: number
}
export interface Metadata {
  key: string
  value: string
}

export interface ConceptMastery {
  conceptId: string
  attempts: number
  correct: number
  score: number | null
}
export function conceptMastery(concepts: Concept[], attempts: AttemptEvent[]): ConceptMastery[] {
  return concepts.map((concept) => {
    const recent = attempts
      .filter((a) => a.conceptIds.includes(concept.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-20)
    const correct = recent.filter((a) => a.correct && a.hints === 0).length
    return {
      conceptId: concept.id,
      attempts: recent.length,
      correct,
      score: recent.length ? correct / recent.length : null,
    }
  })
}
