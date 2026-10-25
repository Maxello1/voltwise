import { useState } from 'react'
import {
  Download,
  HardDrive,
  Laptop,
  Monitor,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Upload,
} from 'lucide-react'
import type { LearningData } from '../../app/useLearningData'
import { db } from '../../storage/db'
import {
  downloadFile,
  exportBackup,
  importBackup,
  parseBackup,
  type Backup,
} from '../../storage/backup'
import { ErrorMessage, PageHeading } from '../../components/ui'
import { lessons } from '../../content/curriculum'
import type { Settings } from '../../domain/models'
import { CloudSync } from './CloudSync'

export function SettingsPage({ data }: { data: LearningData }) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Backup>()
  async function update(changes: Partial<Settings>) {
    setError('')
    try {
      await db.settings.update('preferences', changes)
    } catch {
      setError('Einstellung konnte nicht gespeichert werden.')
    }
  }
  async function backup() {
    setError('')
    setBusy(true)
    try {
      const value = await exportBackup()
      downloadFile(
        `voltwise-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(value, null, 2),
      )
      setStatus('Sicherung zum Download bereitgestellt. Bewahre sie außerhalb dieses Browsers auf.')
    } catch {
      setError('Export fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }
  async function selectFile(file: File | undefined) {
    if (!file) return
    setError('')
    setStatus('')
    setPending(undefined)
    if (file.size > 15 * 1024 * 1024) {
      setError('Die Datei ist zu groß. Maximal 15 MB.')
      return
    }
    try {
      setPending(parseBackup(JSON.parse(await file.text())))
    } catch {
      setError(
        'Die Datei ist keine gültige Voltwise-Sicherung in Version 1, 2 oder 3. Es wurden keine Daten verändert.',
      )
    }
  }
  async function restore() {
    if (!pending) return
    setError('')
    setBusy(true)
    try {
      const result = await importBackup(pending)
      setPending(undefined)
      setStatus(
        `Sicherung zusammengeführt: ${result.attempts} Versuche und ${result.reviews} Wiederholungen geprüft. Bereits vorhandene Ereignisse werden nicht dupliziert.`,
      )
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Import fehlgeschlagen. Vorhandene Daten bleiben erhalten.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function requestStorage() {
    if (!navigator.storage?.persist) {
      setError(
        'Dauerhafte Speicherung ist in diesem Browser nicht verfügbar. Bitte regelmäßig exportieren.',
      )
      return
    }
    try {
      const granted = await navigator.storage.persist()
      setStatus(
        granted
          ? 'Der Browser hat dauerhafte Speicherung erlaubt. Bitte trotzdem regelmäßig exportieren.'
          : 'Der Browser hat dauerhafte Speicherung nicht zugesichert. Bitte regelmäßig exportieren.',
      )
    } catch {
      setError('Dauerhafte Speicherung ist in diesem Browser nicht verfügbar.')
    }
  }
  function markdown() {
    const content = `---\napp: Voltwise\ncontentVersion: 1\nexportedAt: ${new Date().toISOString()}\n---\n\n# Mein Voltwise-Lernraum\n\n${lessons.map((lesson) => `## ${lesson.title}\n\n${lesson.sections.map((s) => `### ${s.title}\n\n${s.body}${s.formula ? `\n\n${s.formula}` : ''}`).join('\n\n')}`).join('\n\n')}\n`
    downloadFile('Voltwise-Lernnotizen.md', content, 'text/markdown;charset=utf-8')
    setStatus('Lernnotizen als Markdown zum Download bereitgestellt.')
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="DEIN LERNRAUM, DEINE REGELN"
        title="So passt Voltwise zu dir."
        description="Darstellung, Datensicherung und alles rund um dein Gerät."
      />
      <div className="settings-grid">
        <section className="card settings-card">
          <h2>Dein Lernalltag</h2>
          <p className="muted">Kleine Gewohnheiten machen den Unterschied.</p>
          <label className="setting-label" htmlFor="daily-goal">
            Tagesziel
          </label>
          <select
            id="daily-goal"
            value={data.settings?.dailyGoal ?? 5}
            onChange={(event) => void update({ dailyGoal: Number(event.target.value) })}
          >
            {[3, 5, 10, 15].map((goal) => (
              <option key={goal} value={goal}>
                {goal} Aufgaben pro Tag
              </option>
            ))}
          </select>
          <span className="setting-label">Darstellung</span>
          <div className="theme-options">
            {[
              { value: 'light' as const, label: 'Hell', icon: Sun },
              { value: 'dark' as const, label: 'Dunkel', icon: Moon },
              { value: 'system' as const, label: 'System', icon: Monitor },
            ].map((theme) => (
              <button
                key={theme.value}
                aria-pressed={data.settings?.theme === theme.value}
                className={data.settings?.theme === theme.value ? 'selected' : ''}
                onClick={() => void update({ theme: theme.value })}
              >
                <theme.icon size={19} />
                {theme.label}
              </button>
            ))}
          </div>
          <div className="setting-info">
            <span>
              Sprache<strong>Deutsch</strong>
            </span>
            <span>Weitere Sprachen sind vorbereitet, aber noch nicht verfügbar.</span>
          </div>
        </section>
        <section className="card settings-card storage-card">
          <span className="small-icon sage">
            <HardDrive size={23} />
          </span>
          <h2>Deine Daten gehören dir.</h2>
          <p>
            Aufgaben, Sitzungen und Wiederholungen liegen in der IndexedDB dieses Browsers auf
            diesem Gerät.
          </p>
          <div className="storage-status">
            <ShieldCheck size={18} />
            <div>
              <strong>Lokal gespeichert</strong>
              <span>Cloud-Verbindung separat einstellbar</span>
            </div>
          </div>
          <p className="storage-warning">
            Browserdaten können gelöscht werden oder verloren gehen. Ein anderer Browser oder ein
            anderes Gerät hat keinen Zugriff. Eine exportierte Datei ist deine Sicherung.
          </p>
          <button className="button button-outline" onClick={() => void requestStorage()}>
            Dauerhafte Speicherung anfragen
          </button>
        </section>
        <CloudSync />
        <section className="card settings-card backup-card">
          <h2>Eine Sicherung gibt Sicherheit.</h2>
          <p className="muted">
            Versioniertes JSON enthält deinen gesamten Lernverlauf und deine Einstellungen. Ein
            Import ergänzt vorhandene Ereignisse; er löscht keine lokalen Versuche.
          </p>
          <div className="backup-buttons">
            <button className="button button-primary" disabled={busy} onClick={() => void backup()}>
              <Download size={17} />
              Sicherung exportieren
            </button>
            <label className={`button button-outline upload-button ${busy ? 'disabled' : ''}`}>
              <Upload size={17} />
              Sicherung auswählen
              <input
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={(event) => {
                  void selectFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
          </div>
          {pending && (
            <div className="import-preview">
              <h3>Sicherung vom {new Date(pending.exportedAt).toLocaleDateString('de-DE')}</h3>
              <p>
                {pending.attempts.length} Versuche · {pending.reviews.length} Wiederholungen ·{' '}
                {pending.sessions.length} Sitzungen
              </p>
              <p>
                Darstellung und Tagesziel werden aus dieser Datei übernommen. Exportiere zuerst eine
                aktuelle Sicherung, wenn du diese Einstellungen behalten möchtest.
              </p>
              <div className="backup-buttons">
                <button
                  className="button button-primary"
                  disabled={busy}
                  onClick={() => void restore()}
                >
                  Sicherung zusammenführen
                </button>
                <button className="button button-outline" onClick={() => setPending(undefined)}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}
          <hr />
          <h3>Dein Wissen für Obsidian</h3>
          <p className="muted">
            Lade die aktuellen Lernnotizen als lesbare Markdown-Datei herunter. Der Lernverlauf
            bleibt im JSON-Backup.
          </p>
          <button className="text-link" onClick={markdown}>
            <Download size={16} />
            Lernnotizen exportieren
          </button>
        </section>
        <section className="card settings-card">
          <h2>Dein Lernraum für unterwegs.</h2>
          <p className="muted">
            Einmal online laden, dann nach bestätigter Offline-Bereitschaft auch ohne Netz lernen.
          </p>
          <div className="install-step">
            <Smartphone size={21} />
            <div>
              <h3>iPhone</h3>
              <p>
                In Safari öffnen → Teilen → „Zum Home-Bildschirm“. Danach die installierte App
                einmal online öffnen.
              </p>
            </div>
          </div>
          <div className="install-step">
            <Monitor size={21} />
            <div>
              <h3>Windows</h3>
              <p>In Edge oder Chrome das Installieren-Symbol in der Adresszeile wählen.</p>
            </div>
          </div>
          <div className="install-step">
            <Laptop size={21} />
            <div>
              <h3>MacBook</h3>
              <p>
                In Safari „Ablage → Zum Dock hinzufügen“ oder die Installation in Chrome nutzen.
              </p>
            </div>
          </div>
          <p className="tiny muted">
            Service Worker und Installation benötigen HTTPS oder localhost. Die Entwicklungsansicht
            bestätigt keinen Offline-Cache.
          </p>
        </section>
      </div>
      {status && (
        <div className="success-message" role="status">
          {status}
        </div>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  )
}
