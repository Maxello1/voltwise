import type { ReviewEvent, ReviewState } from './models'
import { scheduleReview } from './review'
import type { Receipt } from '../sync/protocol'

/** Server sequence orders accepted reviews; pending local reviews form a provisional tail.
 * Accepted event times are capped at receipt time, then clamped to the previous replay time.
 * Historical cards/logs remain untouched. This only builds the derived read model.
 */
export function reconcileReviews(reviews: ReviewEvent[], receipts: Receipt[]): ReviewState[] {
  const accepted = new Map(receipts.map((r) => [r.eventId, r]))
  const states = new Map<string, ReviewState>()
  const times = new Map<string, number>()
  const ordered = [...reviews].sort((a, b) => {
    const ar = accepted.get(a.eventId),
      br = accepted.get(b.eventId)
    if (ar && br) return ar.sequence - br.sequence
    if (ar || br) return ar ? -1 : 1
    return a.createdAt < b.createdAt
      ? -1
      : a.createdAt > b.createdAt
        ? 1
        : a.eventId < b.eventId
          ? -1
          : 1
  })
  for (const review of ordered) {
    if (review.schedulerVersion !== 'ts-fsrs@5.4.2' || review.retention !== 0.9)
      throw new Error('Nicht unterstützte Lernplanversion. Beide Wiederholungen bleiben erhalten.')
    const receipt = accepted.get(review.eventId)
    const eventTime = new Date(review.createdAt).getTime()
    const bounded = receipt
      ? Math.min(eventTime, new Date(receipt.receivedAt).getTime())
      : eventTime
    const effective = Math.max(times.get(review.exerciseId) ?? bounded, bounded)
    const result = scheduleReview(
      states.get(review.exerciseId)?.card,
      review.rating,
      new Date(effective),
    )
    times.set(review.exerciseId, effective)
    states.set(review.exerciseId, {
      exerciseId: review.exerciseId,
      lastEventId: review.eventId,
      card: result.after,
    })
  }
  return [...states.values()]
}
