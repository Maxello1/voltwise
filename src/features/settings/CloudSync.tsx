import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Cloud, LogIn } from 'lucide-react'
import { db } from '../../storage/db'
import { apiRequest, disableSync, enableSync, httpTransport } from '../../sync/engine'
import {
  cloudAvailable,
  subscribeSync,
  syncBusy,
  syncNow,
  syncStorageError,
} from '../../sync/runtime'
import type { CloudSession } from '../../sync/types'
import { ErrorMessage } from '../../components/ui'
import { z } from 'zod'

const deviceSchema = z.object({
  devices: z.array(
    z.object({
      id: z.uuid(),
      label: z.string(),
      createdAt: z.string(),
      revokedAt: z.string().nullable(),
      sessions: z.number(),
    }),
  ),
})
type Device = z.infer<typeof deviceSchema>['devices'][number]
export function CloudSync() {
  const local = useLiveQuery(async () => ({
    state: await db.syncState.get('cloud'),
    pending: await db.syncOutbox.count(),
  }))
  const syncing = useSyncExternalStore(subscribeSync, syncBusy)
  const storageError = useSyncExternalStore(subscribeSync, syncStorageError)
  const [session, setSession] = useState<CloudSession>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [consent, setConsent] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [label, setLabel] = useState('Mein Gerät')
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    if (cloudAvailable)
      void httpTransport
        .session()
        .then(setSession)
        .catch(() =>
          setError(
            'Cloud-Anmeldung nicht erreichbar oder noch nicht eingerichtet. Lokal kannst du weiterlernen.',
          ),
        )
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  async function action(work: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await work()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Aktion fehlgeschlagen. Lokale Daten bleiben erhalten.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function login() {
    const deviceId = (await db.metadata.get('deviceId'))?.value
    const response = await apiRequest('auth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, label }),
    })
    const { url } = z.object({ url: z.url() }).parse(await response.json())
    if (new URL(url).origin !== 'https://github.com') throw new Error('Ungültiges Anmeldeziel.')
    location.assign(url)
  }
  async function logout() {
    await disableSync()
    await apiRequest('auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': session?.csrf ?? '' },
    })
    setSession({ authenticated: false })
    setDevices([])
  }
  const state = local?.state
  useEffect(() => {
    if (cloudAvailable && state?.error)
      void httpTransport
        .session()
        .then(setSession)
        .catch(() => {})
  }, [state?.error])
  const enabled = !!state?.enabled
  const activeError = error || storageError || state?.error
  const status =
    !cloudAvailable || !enabled
      ? 'Nur lokal gespeichert'
      : !online
        ? 'Offline – Änderungen werden später übertragen'
        : syncing
          ? 'Synchronisierung läuft …'
          : activeError
            ? 'Synchronisierung fehlgeschlagen'
            : session && !session.authenticated
              ? 'Anmeldung erforderlich'
              : 'Synchronisierung aktiv'
  return (
    <section className="card settings-card cloud-card" aria-labelledby="cloud-title">
      <span className="small-icon sage">
        <Cloud size={23} />
      </span>
      <h2 id="cloud-title">Cloud-Synchronisierung</h2>
      <p>
        Optionaler privater Lernverlauf auf deinen Geräten. Lernen und Sichern funktionieren
        weiterhin ohne Konto.
      </p>
      <p className="storage-status" role="status">
        <strong>{status}</strong>
      </p>
      {enabled && (
        <button className="button button-outline" onClick={() => void action(() => disableSync())}>
          Synchronisierung ausschalten
        </button>
      )}
      <p className="muted">
        Übertragen werden abgegebene Versuche einschließlich Diagnosen, ausdrückliche
        Gedächtnisbewertungen und gelesene Lektionen. Antworten und Zeitpunkte werden auf deinem
        Cloudflare-Konto gespeichert.
      </p>
      <p className="muted">
        Offene Aufgaben, ausstehende Bewertungen, Untersuchungsentwürfe und Geräteeinstellungen
        bleiben auf diesem Gerät. Heruntergeladene Sitzungen dienen nur dem Verlauf und werden hier
        nicht fortgesetzt.
      </p>
      <p className="tiny muted">
        Wiederholungspläne können sich beim Zusammenführen ändern. Prüfe die Geräteuhr; alle
        Bewertungen bleiben erhalten. Bereits gestartete Übertragungen können beim Ausschalten noch
        abgeschlossen werden.
      </p>
      <p className="storage-warning">
        Deine lokalen Daten bleiben beim Ausschalten und Abmelden erhalten. Cloud-Synchronisierung
        ersetzt keine unabhängige JSON-Sicherung. Auf dem iPhone erfolgt die Übertragung beim Öffnen
        oder während die App sichtbar ist.
      </p>
      {!cloudAvailable ? (
        <p>
          Diese Ausgabe speichert ausschließlich lokal. Für die Synchronisierung ist eine
          eingerichtete Cloudflare-Ausgabe mit App und API unter derselben Adresse nötig. GitHub
          Pages bleibt verfügbar; beide Adressen haben getrennte Browserspeicher. Übertrage
          vorhandenen Fortschritt bewusst per JSON-Sicherung.
        </p>
      ) : (
        <>
          <p className="tiny muted">
            GitHub bestätigt nur deine Identität. Es wird kein Zugriff auf private Repositories
            angefordert.
          </p>
          {!session?.authenticated ? (
            <>
              <label className="setting-label" htmlFor="cloud-device">
                Name dieses Geräts
              </label>
              <input
                id="cloud-device"
                maxLength={60}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <button
                className="button button-outline"
                disabled={busy || !online || !label.trim()}
                onClick={() => void action(login)}
              >
                <LogIn size={17} />
                Mit GitHub anmelden
              </button>
            </>
          ) : (
            <>
              <p>Mit GitHub angemeldet · Gerätekennung {session.deviceId?.slice(0, 8)}</p>
              {!enabled && (
                <>
                  <label className="cloud-consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      Ich möchte meinen vorhandenen und künftigen Lernverlauf in meinem
                      Cloudflare-Konto speichern und mit meinen angemeldeten Geräten zusammenführen.
                    </span>
                  </label>
                  <button
                    className="button button-primary"
                    disabled={busy || !consent}
                    onClick={() =>
                      void action(async () => {
                        await enableSync(session.ownerId!)
                        await syncNow()
                      })
                    }
                  >
                    Synchronisierung einschalten
                  </button>
                </>
              )}
              <div className="backup-buttons">
                <button
                  className="button button-outline"
                  disabled={busy || syncing || !enabled || !online}
                  onClick={() =>
                    void action(async () => {
                      await db.syncState.update('cloud', { blocked: false, error: undefined })
                      await syncNow()
                      setSession(await httpTransport.session())
                    })
                  }
                >
                  Jetzt synchronisieren
                </button>
                <button className="text-link" disabled={busy} onClick={() => void action(logout)}>
                  Abmelden
                </button>
              </div>
              <button
                className="text-link"
                disabled={busy || !online}
                onClick={() =>
                  void action(async () => {
                    setDevices(
                      deviceSchema.parse(await (await apiRequest('v1/devices')).json()).devices,
                    )
                  })
                }
              >
                Geräte und Sitzungen anzeigen
              </button>
              {devices.length > 0 && (
                <ul className="cloud-devices">
                  {devices.map((device) => (
                    <li key={device.id}>
                      <span>
                        <strong>{device.label}</strong> ·{' '}
                        {device.id === session.deviceId ? 'dieses Gerät' : device.id.slice(0, 8)}
                        <br />
                        {device.revokedAt
                          ? 'Zugriff widerrufen'
                          : `${device.sessions} aktive Sitzungen`}
                      </span>
                      {!device.revokedAt && (
                        <button
                          className="button button-outline"
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              if (
                                !confirm(
                                  `Zugriff für „${device.label}“ widerrufen? Alle Sitzungen dieses Geräts werden gesperrt. Lokale Daten bleiben erhalten. Die Freigabe erfordert danach einen manuellen administrativen Schritt.`,
                                )
                              )
                                return
                              await apiRequest('v1/devices/revoke', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-CSRF-Token': session.csrf!,
                                },
                                body: JSON.stringify({ deviceId: device.id }),
                              })
                              setDevices([])
                              if (device.id === session.deviceId) {
                                await disableSync()
                                setSession({ authenticated: false })
                              }
                            })
                          }
                        >
                          Zugriff widerrufen
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p>
            {local?.pending ?? 0} Änderungen ausstehend
            {!enabled ? ' · werden erst nach Zustimmung übertragen' : ''}
          </p>
          <p className="tiny muted">
            {state?.lastSuccess
              ? `Letzte Synchronisierung: ${new Date(state.lastSuccess).toLocaleString('de-DE')}`
              : 'Noch keine erfolgreiche Synchronisierung bestätigt.'}
          </p>
        </>
      )}
      <ErrorMessage>{activeError}</ErrorMessage>
    </section>
  )
}
