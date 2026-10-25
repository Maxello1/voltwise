import { liveQuery } from 'dexie'
import { db } from '../storage/db'
import { synchronize } from './engine'

export const cloudAvailable =
  import.meta.env.VITE_CLOUD_SYNC === 'true' && import.meta.env.BASE_URL === '/'
let busy = false
let transientError = ''
const listeners = new Set<() => void>()
export function subscribeSync(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export const syncBusy = () => busy
export const syncStorageError = () => transientError
const changed = () => listeners.forEach((listener) => listener())
export function retryDelay(failures: number, random = Math.random) {
  return Math.min(300_000, Math.round(5000 * 2 ** Math.min(failures, 6) * (0.75 + random() * 0.5)))
}
export async function syncNow() {
  if (!cloudAvailable || busy) return false
  busy = true
  transientError = ''
  changed()
  try {
    // Browser lock coalesces automatic/manual requests across tabs. Transport remains idempotent.
    return navigator.locks
      ? await navigator.locks.request('voltwise-sync', () => synchronize())
      : await synchronize()
  } catch {
    transientError =
      'Browserspeicher nicht erreichbar. Bitte freien Speicher prüfen und lokale Daten aufbewahren.'
    return false
  } finally {
    busy = false
    changed()
  }
}
export function startAutomaticSync() {
  if (!cloudAvailable) return () => {}
  let stopped = false,
    failures = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = (delay = 1500) => {
    if (stopped) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      void run()
    }, delay)
  }
  async function run() {
    if (stopped || document.visibilityState === 'hidden' || !navigator.onLine) return
    try {
      const state = await db.syncState.get('cloud')
      if (!state?.enabled || state.blocked) return
      const success = await syncNow()
      if (success) failures = 0
      else failures++
      // While open, a small heartbeat also discovers work from another device.
      // No dependence on iOS background execution; hidden documents do not poll.
      schedule(success ? 120_000 : retryDelay(failures))
    } catch {
      failures++
      schedule(retryDelay(failures))
    }
  }
  const wake = () => {
    if (document.visibilityState !== 'hidden') schedule()
  }
  const subscription = liveQuery(async () => [
    await db.syncOutbox.count(),
    (await db.syncState.get('cloud'))?.enabled,
  ]).subscribe({
    next: () => schedule(),
    error: () => {
      transientError = 'Browserspeicher nicht erreichbar.'
      changed()
    },
  })
  window.addEventListener('online', wake)
  document.addEventListener('visibilitychange', wake)
  schedule()
  return () => {
    stopped = true
    clearTimeout(timer)
    subscription.unsubscribe()
    window.removeEventListener('online', wake)
    document.removeEventListener('visibilitychange', wake)
  }
}
