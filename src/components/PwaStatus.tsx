import { useSyncExternalStore, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { CloudOff, Download, WifiOff } from 'lucide-react'
const subscribeOnline = (callback: () => void) => {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}
export function PwaStatus() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine)
  const [registrationError, setRegistrationError] = useState(false)
  const [cacheAlreadyActive, setCacheAlreadyActive] = useState(
    () => !!navigator.serviceWorker?.controller,
  )
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () => setRegistrationError(true),
    onRegisteredSW: (_url, registration) => {
      if (registration?.active?.state === 'activated') setCacheAlreadyActive(true)
    },
  })
  return (
    <>
      <span className={`status-chip ${!online ? 'is-offline' : ''}`}>
        <span className="status-dot" />
        {!online ? (
          <>
            <WifiOff size={13} />
            Offline
          </>
        ) : import.meta.env.DEV ? (
          'Lokal · Entwicklung'
        ) : offlineReady || cacheAlreadyActive ? (
          'Offline bereit'
        ) : registrationError ? (
          'Offline-Cache prüfen'
        ) : (
          'Offline-Cache lädt'
        )}
      </span>
      {needRefresh && (
        <div className="update-banner" role="status">
          <Download size={16} />
          <span>Eine neue Version ist bereit. Deine Daten bleiben erhalten.</span>
          <button onClick={() => void updateServiceWorker(true)}>Neu laden</button>
        </div>
      )}
      {registrationError && (
        <span className="sr-only">
          <CloudOff />
          Offline-Speicherung der App ist noch nicht bestätigt.
        </span>
      )}
    </>
  )
}
