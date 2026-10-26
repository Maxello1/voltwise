import type { Receipt } from './protocol'

export interface SyncState {
  id: 'cloud'
  enabled: boolean
  ownerId?: string
  cursor: number
  lastSuccess?: string
  error?: string
  blocked?: boolean
}
export interface SyncReceipt extends Receipt {
  ownerId: string
}
export interface CloudSession {
  authenticated: boolean
  ownerId?: string
  deviceId?: string
  csrf?: string
  expiresAt?: string
}
