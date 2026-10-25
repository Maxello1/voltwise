import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import type { LearningData } from '../../app/useLearningData'
import { diagnosticExercises } from '../../content/diagnostic-learning'
import { diagnosticScenarios } from '../../content/diagnostic-scenarios'
import { startSession } from '../../storage/learning'
import { ErrorMessage, PageHeading } from '../../components/ui'
import { diagnosticCoverage, difficultyNames } from './diagnostic-summary'

export function Diagnostics({ data }: { data: LearningData }) {
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const coverage = diagnosticCoverage(data)
  const recommended = coverage.size < 2 ? 1 : coverage.size < 4 ? 2 : 3
  const selected = Number(params.get('stufe'))
  const level = [1, 2, 3].includes(selected) ? selected : recommended
  const active = data.sessions.find((s) => s.status === 'active')
  async function begin(id: string) {
    setBusy(true)
    try {
      await startSession('practice', undefined, undefined, undefined, undefined, undefined, id)
      navigate('/ueben')
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Fehlersuche konnte nicht gestartet werden.',
      )
      setBusy(false)
    }
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="DAS DIAGNOSETRAINING"
        title="Erst beobachten. Dann verstehen."
        description="Bediene die Schaltung, sammle Messbelege und erkläre die Ursache. Jeder Fall hat einen geprüften, verborgenen Fehler."
      />
      <section className="card diagnostic-intro">
        <div>
          <span className="soft-badge blue">24 V DC · WENDESCHÜTZE</span>
          <h2>Dein nächster Schritt zur Fehlersuche.</h2>
          <p>
            Sechs unterschiedliche Ursachen, zwölf versionierte Untersuchungen. Fehlerort,
            Wirkungsweise und passende Belege zählen jeweils zwei Punkte. Deine
            Gedächtnisbewertungen bleiben unabhängig.
          </p>
          <p className="muted">
            {coverage.size} von {diagnosticScenarios.length} verschiedenen Ursachen ohne Hinweis
            vollständig belegt. Wiederholungen desselben Falls erhöhen diese Abdeckung nicht. Das
            ist keine geprüfte Kompetenzbewertung.
          </p>
        </div>
        <Link className="button button-outline" to="/schaltplaene?circuit=control-reversing-v1">
          Intakte Schaltung erkunden
        </Link>
      </section>
      {active && (
        <div className="hint-box">
          <p>Deine offene Sitzung bleibt erhalten. Beim Start wird sie zuerst fortgesetzt.</p>
          <Link className="text-link" to="/ueben">
            Offene Sitzung fortsetzen
          </Link>
        </div>
      )}
      <div className="diagnostic-levels" role="group" aria-label="Schwierigkeit wählen">
        {difficultyNames.map((name, i) => (
          <button
            key={name}
            className={`card diagnostic-level ${level === i + 1 ? 'active' : ''}`}
            aria-pressed={level === i + 1}
            onClick={() => setParams({ stufe: String(i + 1) })}
          >
            <span className="eyebrow">
              STUFE {i + 1}
              {recommended === i + 1 ? ' · EMPFOHLENER EINSTIEG' : ''}
            </span>
            <h2>{name}</h2>
            <p>
              {i === 0
                ? 'Geführtes Vorgehen, optional konkrete Messhinweise.'
                : i === 1
                  ? 'Fehler eingrenzen und die Versorgung zusätzlich belegen.'
                  : 'Messungen selbst wählen und den Fehlerort im passenden Zustand untersuchen.'}
            </p>
          </button>
        ))}
      </div>
      <div className="diagnostic-case-grid">
        {diagnosticExercises
          .filter((e) => e.type === 'diagnostic' && e.difficulty === level)
          .map((e) => (
            <article className="card diagnostic-case" key={e.id}>
              <span className="eyebrow">{e.title}</span>
              <h3>{e.prompt}</h3>
              <p className="muted tiny">
                Steuerstromkreis · Revision 1 ·{' '}
                {coverage.has(e.type === 'diagnostic' ? e.scenarioId : '')
                  ? 'Bereits einmal selbstständig belegt'
                  : 'Neue Transfermöglichkeit'}
              </p>
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() => void begin(e.id)}
              >
                Fall untersuchen
              </button>
            </article>
          ))}
      </div>
      <Link className="text-link" to="/lernen?topic=advanced-controls">
        Lektion: Wenden und Messen verstehen
      </Link>
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  )
}
