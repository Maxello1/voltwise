import Dexie, { type Table } from 'dexie'
import type {
  AttemptEvent,
  LearningSession,
  LessonCompletion,
  Metadata,
  ReviewEvent,
  ReviewState,
  Settings,
  SyncOutbox,
} from '../domain/models'
import { defaultSettings } from '../domain/models'
import type { DiagnosticDraft } from '../domain/diagnostic-schema'

export class VoltwiseDatabase extends Dexie {
  attempts!: Table<AttemptEvent, string>
  reviews!: Table<ReviewEvent, string>
  reviewStates!: Table<ReviewState, string>
  sessions!: Table<LearningSession, string>
  completions!: Table<LessonCompletion, string>
  settings!: Table<Settings, string>
  metadata!: Table<Metadata, string>
  syncOutbox!: Table<SyncOutbox, string>
  diagnosticDrafts!: Table<DiagnosticDraft, string>
  constructor(name = 'voltwise') {
    super(name)
    this.version(1).stores({
      attempts: 'eventId, exerciseId, sessionId, createdAt, *conceptIds',
      reviews: 'eventId, &attemptId, exerciseId, createdAt',
      reviewStates: 'exerciseId, card.due',
      sessions: 'id, status, startedAt',
      completions: 'lessonId',
      settings: 'id',
      metadata: 'key',
      syncOutbox: 'eventId, createdAt',
    })
    this.version(2)
      .stores({ diagnosticDrafts: 'sessionId, exerciseId, updatedAt' })
      .upgrade(async (transaction) => {
        await transaction.table('metadata').put({ key: 'dbSchemaVersion', value: '2' })
      })
  }
}
export const db = new VoltwiseDatabase()
export async function initializeDatabase(database = db) {
  await database.transaction('rw', [database.settings, database.metadata], async () => {
    if (!(await database.settings.get('preferences'))) await database.settings.add(defaultSettings)
    if (!(await database.metadata.get('deviceId')))
      await database.metadata.add({ key: 'deviceId', value: crypto.randomUUID() })
    await database.metadata.put({ key: 'dbSchemaVersion', value: '2' })
    await database.metadata.put({ key: 'contentSchemaVersion', value: '1' })
  })
}
