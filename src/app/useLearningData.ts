import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../storage/db'
export function useLearningData() {
  return useLiveQuery(async () => {
    const [attempts, reviews, reviewStates, sessions, completions, settings] = await Promise.all([
      db.attempts.orderBy('createdAt').toArray(),
      db.reviews.toArray(),
      db.reviewStates.toArray(),
      db.sessions.toArray(),
      db.completions.toArray(),
      db.settings.get('preferences'),
    ])
    return { attempts, reviews, reviewStates, sessions, completions, settings }
  })
}
export type LearningData = NonNullable<ReturnType<typeof useLearningData>>
