import { createEmptyCard, fsrs, type Card, type Grade } from 'ts-fsrs'
import type { ReviewCard } from './models'

const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false })
function serialize(card: Card): ReviewCard {
  return { ...card, due: card.due.toISOString(), last_review: card.last_review?.toISOString() }
}
export function scheduleReview(previous: ReviewCard | undefined, rating: number, now: Date) {
  if (![1, 2, 3, 4].includes(rating)) throw new Error('Ungültige Wiederholungsbewertung')
  const card: Card = previous
    ? {
        ...previous,
        due: new Date(previous.due),
        last_review: previous.last_review ? new Date(previous.last_review) : undefined,
      }
    : createEmptyCard(now)
  const result = scheduler.next(card, now, rating as Grade)
  return {
    before: serialize(card),
    after: serialize(result.card),
    log: JSON.parse(JSON.stringify(result.log)) as Record<string, number | string>,
  }
}
