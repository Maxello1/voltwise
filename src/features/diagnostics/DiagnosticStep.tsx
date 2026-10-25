import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import type { LearningData } from '../../app/useLearningData'
import type { Exercise, LearningSession } from '../../domain/models'
import { diagnosticScenario, diagnosticMechanisms } from '../../content/diagnostic-scenarios'
import { reversingCircuit } from '../../content/circuits/reversing'
import {
  diagnosticAnswerSchema,
  emptyDiagnosticAnswer,
  type DiagnosticAction,
  type DiagnosticAnswer,
} from '../../domain/diagnostic-schema'
import { assessDiagnosis, replayDiagnosis } from '../../domain/diagnostics'
import { saveDiagnosticDraft } from '../../storage/diagnostics'
import { db } from '../../storage/db'
import { advanceSession, submitAnswer } from '../../storage/learning'
import { ErrorMessage } from '../../components/ui'
import { ReversingWorkbench } from '../circuit-lab/ReversingWorkbench'
import { difficultyNames } from './diagnostic-summary'

export function DiagnosticStep({
  exercise,
  session,
  data,
  onFinish,
}: {
  exercise: Extract<Exercise, { type: 'diagnostic' }>
  session: LearningSession
  data: LearningData
  onFinish: () => void
}) {
  const draft = useLiveQuery(() => db.diagnosticDrafts.get(session.id), [session.id])
  const attempt = data.attempts.find((a) => a.eventId === session.pendingAttemptId)
  const answer = attempt
    ? diagnosticAnswerSchema.parse(JSON.parse(attempt.answer))
    : draft?.exerciseId === exercise.id
      ? draft.answer
      : emptyDiagnosticAnswer()
  const replay = replayDiagnosis(exercise.scenarioId, answer)
  const scenario = diagnosticScenario(exercise.scenarioId)
  const result = attempt
    ? assessDiagnosis(exercise.scenarioId, exercise.difficulty, answer)
    : undefined
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [started] = useState(() => performance.now())
  async function save(
    change: DiagnosticAction | Partial<Pick<DiagnosticAnswer, 'location' | 'mechanism' | 'hint'>>,
  ) {
    setBusy(true)
    setError('')
    try {
      await saveDiagnosticDraft(session.id, exercise.id, change)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Untersuchung konnte nicht gespeichert werden.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function submit() {
    setBusy(true)
    setError('')
    try {
      await submitAnswer(
        session.id,
        JSON.stringify(answer),
        answer.hint,
        performance.now() - started,
        undefined,
        exercise.id,
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Diagnose konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }
  async function next() {
    setBusy(true)
    try {
      await advanceSession(session.id, undefined, undefined, attempt?.eventId)
      if (session.position + 1 === session.exerciseIds.length) onFinish()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sitzung konnte nicht fortgesetzt werden.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="diagnostic-session">
      <section className="card diagnostic-brief">
        <div>
          <span className="soft-badge blue">
            FEHLERSUCHE · {difficultyNames[exercise.difficulty - 1]}
          </span>
          <h2>{exercise.prompt}</h2>
          <p>
            Erwartet: Vor zieht K1 an und hält nach Loslassen. Rück zieht K2 an. Stop unterbricht
            beide Richtungen.
          </p>
        </div>
        <Link className="text-link" to="/fehlersuche">
          Zur Fallauswahl
        </Link>
        <p className="local-save-note" role="status">
          {attempt
            ? 'Diagnose lokal gespeichert'
            : draft?.exerciseId === exercise.id
              ? 'Untersuchung lokal gespeichert'
              : 'Deine Untersuchung wird bei jeder Aktion lokal gespeichert.'}
        </p>
      </section>
      <div className="diagnostic-layout">
        <section className="card diagnostic-drawing">
          <ReversingWorkbench
            state={replay.state}
            fault={scenario.fault}
            readings={replay.readings}
            onAction={(action) => void save(action)}
            busy={busy || !!attempt}
            limited={answer.actions.length >= 24}
            revealedFault={attempt ? scenario.location : undefined}
          />
        </section>
        <aside className="card diagnosis-panel">
          <span className="eyebrow">BEOBACHTUNG → BELEG → URSACHE</span>
          <h2>Deine Diagnose</h2>
          {!attempt ? (
            <>
              {exercise.difficulty === 1 && (
                <ol className="diagnostic-guide">
                  <li>Symptom mit den Tastern nachstellen.</li>
                  <li>Spannung messen und Kontaktzustand vergleichen.</li>
                  <li>Fehlerort wählen und seine Wirkung erklären.</li>
                </ol>
              )}
              <p className="muted">
                {exercise.difficulty === 1
                  ? 'Belege die entscheidende Fehlersituation mit einer passenden Messung. Beim Haltefehler sind zwei Zustände nötig.'
                  : exercise.difficulty === 2
                    ? 'Belege die Versorgung und die entscheidende Fehlersituation mit passenden Messungen.'
                    : 'Belege Versorgung und Fehlersituation mit Messungen. Protokolliere zusätzlich den betroffenen Bauteilzustand; beim Haltefehler während K1 angezogen ist.'}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void submit()
                }}
              >
                <label>
                  Fehlerort
                  <select
                    aria-label="Fehlerort"
                    value={answer.location}
                    disabled={busy}
                    onChange={(e) => void save({ location: e.target.value })}
                  >
                    <option value="">Ursache lokalisieren …</option>
                    {reversingCircuit.components.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.designator} · {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Warum verhindert das die Funktion?
                  <select
                    aria-label="Wirkungsweise"
                    value={answer.mechanism}
                    disabled={busy}
                    onChange={(e) => void save({ mechanism: e.target.value })}
                  >
                    <option value="">Wirkung erklären …</option>
                    {diagnosticMechanisms.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.text}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="input-help">
                  Die gewählte Kausalerklärung wird geprüft. Es gibt keine automatische
                  Freitextdeutung.
                </p>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={busy || !answer.location || !answer.mechanism}
                >
                  Diagnose abgeben
                </button>
              </form>
              <button
                className="hint-button"
                disabled={busy || answer.hint}
                onClick={() => void save({ hint: true })}
              >
                Messhinweis anzeigen
              </button>
              {answer.hint && (
                <div className="hint-box">
                  <p>{scenario.hint}</p>
                </div>
              )}
            </>
          ) : (
            result && (
              <div
                className={`answer-feedback ${attempt.correct ? 'correct' : 'incorrect'}`}
                role="status"
              >
                <h3>
                  {attempt.correct
                    ? 'Ursache vollständig belegt.'
                    : 'Deine Diagnose ist noch nicht vollständig.'}
                </h3>
                <strong className="diagnostic-score">{result.score} / 6 Punkte</strong>
                <ul className="rubric">
                  <li>Fehlerort: {result.location ? 2 : 0}/2</li>
                  <li>Wirkungsweise: {result.mechanism ? 2 : 0}/2</li>
                  <li>Passende Belege: {result.evidence ? 2 : 0}/2</li>
                </ul>
                <p>{scenario.explanation}</p>
                <p className="muted tiny">
                  {result.steps} Untersuchungsschritte · {result.measurements} Messungen ·{' '}
                  {result.hints} Hinweis · {result.location ? 0 : 1} falsche Fehlerzuordnung
                </p>
                <p>
                  Rot gestrichelt: aufgedeckter Fehlerort. Deine Abgabe bleibt unverändert
                  gespeichert.
                </p>
                <button
                  className="button button-primary"
                  disabled={busy}
                  onClick={() => void next()}
                >
                  {session.position + 1 === session.exerciseIds.length
                    ? 'Sitzung abschließen'
                    : 'Nächste Aufgabe'}
                </button>
              </div>
            )
          )}
          <details className="diagnostic-observations">
            <summary>Protokollierte Bauteilzustände ({replay.inspections.length})</summary>
            <ul>
              {replay.inspections.map((i, index) => (
                <li key={index}>
                  {reversingCircuit.components.find((c) => c.id === i.component)?.designator} ·{' '}
                  {reversingCircuit.components.find((c) => c.id === i.component)?.label} ·{' '}
                  {
                    (
                      { on: 'ein', off: 'aus', open: 'offen', closed: 'geschlossen' } as Record<
                        string,
                        string
                      >
                    )[i.value]
                  }
                </li>
              ))}
            </ul>
          </details>
          <ErrorMessage>{error}</ErrorMessage>
        </aside>
      </div>
    </div>
  )
}
