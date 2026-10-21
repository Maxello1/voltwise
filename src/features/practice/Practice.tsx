import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { LearningData } from '../../app/useLearningData'
import type { Exercise, LearningSession } from '../../domain/models'
import { exercises, exerciseById, topics } from '../../content/curriculum'
import { circuitById } from '../../content/circuit-library'
import { answerLabel } from '../../domain/grading'
import { CircuitViewer } from '../../schematics/CircuitViewer'
import { advanceSession, startSession, submitAnswer } from '../../storage/learning'
import { EmptyState, ErrorMessage, PageHeading } from '../../components/ui'

const ratings = [
  { value: 1, label: 'Noch einmal', detail: 'Nicht erinnert' },
  { value: 2, label: 'Schwer', detail: 'Mit viel Mühe' },
  { value: 3, label: 'Gut', detail: 'Sicher erinnert' },
  { value: 4, label: 'Leicht', detail: 'Sofort gewusst' },
]
export function Practice({ data }: { data: LearningData }) {
  const [params] = useSearchParams()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [finishedId, setFinishedId] = useState<string>()
  const active = data.sessions.find((s) => s.status === 'active')
  const due = data.reviewStates.filter((s) => new Date(s.card.due) <= new Date()).length
  const finished = data.sessions.find((s) => s.id === finishedId && s.status === 'complete')
  const mode = params.get('mode') === 'review' ? 'review' : 'practice'
  async function begin(topic?: string) {
    setBusy(true)
    setError('')
    setFinishedId(undefined)
    try {
      const session = await startSession(mode, topic)
      if (!session)
        setError('Gerade ist keine Wiederholung fällig. Starte eine gemischte Lernsitzung.')
    } catch {
      setError('Die Sitzung konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="AKTIV ERINNERN · DIREKT ANWENDEN"
        title={active ? 'Eine Verbindung nach der anderen.' : 'Mach aus Wissen Können.'}
        description={
          active
            ? 'Erst selbst lösen. Dann verstehen, warum.'
            : 'Rechnen, erinnern und Schaltpläne lesen – ganz in deinem Tempo.'
        }
      />
      {active ? (
        <ExerciseStep
          key={`${active.id}-${active.position}`}
          session={active}
          data={data}
          onFinish={() => setFinishedId(active.id)}
        />
      ) : finished ? (
        <div className="session-finished card">
          <span className="completion-emblem">
            <Trophy size={35} />
          </span>
          <p className="eyebrow">SITZUNG ABGESCHLOSSEN</p>
          <h2>Eine Verbindung mehr im Kopf.</h2>
          <p>
            {data.attempts.filter((a) => a.sessionId === finished.id && a.correct).length} von{' '}
            {finished.exerciseIds.length} Aufgaben richtig beantwortet.
          </p>
          <p className="muted">Deine Antworten und Bewertungen sind lokal gespeichert.</p>
          <button className="button button-primary" onClick={() => void begin()}>
            Weiterlernen
            <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <>
          <div className="practice-options">
            <section className="practice-start card">
              <span className="stat-icon sage">
                <Sparkles size={25} />
              </span>
              <h2>{mode === 'review' ? 'Deine Wiederholungen' : 'Dein täglicher Wissensmix'}</h2>
              <p>
                {mode === 'review'
                  ? `${due} Aufgaben sind nach deinem persönlichen FSRS-Zeitplan fällig.`
                  : '5 passende Aufgaben. Fällige Wiederholungen zuerst, dann üben wir Schwächen und neue Inhalte.'}
              </p>
              <button
                className="button button-primary"
                onClick={() => void begin()}
                disabled={busy || (mode === 'review' && due === 0)}
              >
                {mode === 'review' ? <RotateCcw size={18} /> : <ArrowRight size={18} />}
                {mode === 'review' ? 'Wiederholung starten' : 'Gemischt üben'}
              </button>
            </section>
            <section className="card practice-explainer">
              <CircleHelp size={24} />
              <h3>Richtig gelöst ≠ leicht erinnert</h3>
              <p>
                Deine Antwort wird geprüft. Bei Wissensfragen bewertest du danach zusätzlich, wie
                gut du dich erinnert hast. Nur diese Bewertung steuert den Wiederholungszeitpunkt.
              </p>
              <p className="muted">
                Rechenaufgaben stärken dein Verständnis. Ihre Trefferquote bleibt getrennt vom
                Gedächtnis-Zeitplan.
              </p>
            </section>
          </div>
          {mode !== 'review' && (
            <>
              <h2 className="section-title">Ein Thema vertiefen</h2>
              <div className="topic-practice-grid">
                {topics.map((topic) => (
                  <button
                    className="card topic-practice"
                    key={topic.id}
                    onClick={() => void begin(topic.id)}
                    disabled={busy}
                  >
                    <span className={`path-number ${topic.color}`}>{topic.tier}</span>
                    <h3>{topic.title}</h3>
                    <p>{exercises.filter((e) => e.topicId === topic.id).length} Aufgaben</p>
                    <ArrowRight size={18} />
                  </button>
                ))}
              </div>
            </>
          )}
          {mode === 'review' && due === 0 && (
            <EmptyState title="Alles darf sich setzen.">
              Für neue Aufgaben öffne „Üben“ erneut über die Navigation. Deine nächste Wiederholung
              findest du im Fortschritt.
            </EmptyState>
          )}
        </>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  )
}

function ExerciseStep({
  session,
  data,
  onFinish,
}: {
  session: LearningSession
  data: LearningData
  onFinish: () => void
}) {
  const exercise = exerciseById.get(session.exerciseIds[session.position] ?? '')
  const [answer, setAnswer] = useState('')
  const [hint, setHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [started] = useState(() => performance.now())
  const attempt = data.attempts.find((a) => a.eventId === session.pendingAttemptId)
  if (!exercise)
    return (
      <EmptyState title="Aufgabe nicht gefunden.">
        Die Inhaltsversion dieser Sitzung ist nicht verfügbar.
      </EmptyState>
    )
  const topic = topics.find((t) => t.id === exercise.topicId)
  const selectedComponent =
    exercise.type === 'schematic'
      ? circuitById.get(exercise.circuitId)?.components.find((c) => c.id === attempt?.answer)
      : undefined
  const submittedAnswer = !attempt
    ? ''
    : exercise.type === 'choice'
      ? (exercise.options.find((option) => option.id === attempt.answer)?.text ?? attempt.answer)
      : exercise.type === 'schematic'
        ? selectedComponent
          ? `${selectedComponent.designator} · ${selectedComponent.label}`
          : `Anschluss ${attempt.answer}`
        : attempt.normalizedAnswer
  async function submit(durationMs: number) {
    setBusy(true)
    setError('')
    try {
      await submitAnswer(session.id, answer, hint, durationMs, undefined, exercise?.id)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Antwort konnte nicht gespeichert werden.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function next(rating?: number) {
    setBusy(true)
    setError('')
    try {
      await advanceSession(session.id, rating, undefined, attempt?.eventId)
      if (session.position + 1 === session.exerciseIds.length) onFinish()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Bewertung konnte nicht gespeichert werden.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="exercise-layout">
      <section className="exercise-card card">
        <div className="exercise-top">
          <span className={`soft-badge ${topic?.color ?? 'sage'}`}>{topic?.title}</span>
          <span className="muted tiny">
            AUFGABE {session.position + 1} VON {session.exerciseIds.length}
          </span>
        </div>
        <div className="session-progress" aria-label="Sitzungsfortschritt">
          {session.exerciseIds.map((id, index) => (
            <span
              key={id}
              className={
                index < session.position ? 'done' : index === session.position ? 'current' : ''
              }
            />
          ))}
        </div>
        <p className="eyebrow exercise-type">
          {exercise.type === 'choice'
            ? 'WISSENSCHECK'
            : exercise.type === 'recall'
              ? 'AKTIVES ERINNERN'
              : exercise.type === 'schematic'
                ? 'SCHALTPLAN LESEN'
                : 'RECHNEN & VERSTEHEN'}
        </p>
        <h2>{exercise.title}</h2>
        <p className="exercise-prompt">{exercise.prompt}</p>
        {!attempt ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void submit(event.timeStamp - started)
            }}
          >
            <AnswerInput exercise={exercise} value={answer} onChange={setAnswer} disabled={busy} />
            <div className="answer-actions">
              <button
                className="button button-primary"
                disabled={busy || !answer.trim()}
                type="submit"
              >
                Antwort prüfen
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="hint-button"
                onClick={() => setHint(true)}
                disabled={hint}
              >
                <Lightbulb size={16} />
                Hinweis
              </button>
            </div>
            {hint && (
              <div className="hint-box">
                <Lightbulb size={17} />
                <p>{exercise.hint}</p>
              </div>
            )}
          </form>
        ) : (
          <div
            className={`answer-feedback ${attempt.correct ? 'correct' : 'incorrect'}`}
            role="status"
          >
            <div className="feedback-heading">
              {attempt.correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              <h3>
                {attempt.correct
                  ? 'Richtig. Die Verbindung stimmt.'
                  : 'Ein guter Moment zum Verstehen.'}
              </h3>
            </div>
            <p className="feedback-answer">
              Deine Antwort: <strong>{submittedAnswer}</strong>
            </p>
            {!attempt.correct && (
              <p className="feedback-answer">
                Richtige Antwort: <strong>{answerLabel(exercise)}</strong>
              </p>
            )}
            <p>{exercise.explanation}</p>
            {exercise.type === 'schematic' && (
              <CircuitViewer
                circuit={circuitById.get(exercise.circuitId)!}
                selected={attempt.answer}
                feedback={attempt.correct ? 'correct' : 'incorrect'}
                correctSelection={attempt.correct ? undefined : exercise.answer}
                compact
              />
            )}
            {exercise.reviewable ? (
              <div className="rating-panel">
                <h4>Wie gut konntest du dich erinnern?</h4>
                <p>Deine Einschätzung plant die nächste Wiederholung.</p>
                <div className="rating-buttons">
                  {ratings.map((r) => (
                    <button key={r.value} disabled={busy} onClick={() => void next(r.value)}>
                      <strong>{r.label}</strong>
                      <span>{r.detail}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button className="button button-primary" disabled={busy} onClick={() => void next()}>
                {session.position + 1 === session.exerciseIds.length
                  ? 'Sitzung abschließen'
                  : 'Nächste Aufgabe'}
                <ArrowRight size={17} />
              </button>
            )}
          </div>
        )}
        <ErrorMessage>{error}</ErrorMessage>
      </section>
      <aside className="exercise-aside">
        <span className="small-icon">
          <Lightbulb size={21} />
        </span>
        <h3>Denken darf dauern.</h3>
        <p>
          Eine ehrliche Antwort hilft dir mehr als eine schnelle. Nutze den Hinweis, wenn du
          feststeckst.
        </p>
        <div className="local-save-note">
          <CheckCircle2 size={16} />
          {attempt ? 'Antwort lokal gespeichert' : 'Wird nach dem Prüfen gespeichert'}
        </div>
      </aside>
    </div>
  )
}

function AnswerInput({
  exercise,
  value,
  onChange,
  disabled,
}: {
  exercise: Exercise
  value: string
  onChange: (answer: string) => void
  disabled: boolean
}) {
  const circuit = circuitById.get(exercise.circuitId ?? '')
  if (exercise.type === 'choice')
    return (
      <>
        {circuit && <CircuitViewer circuit={circuit} compact />}
        <fieldset className="choice-list">
          <legend className="sr-only">Wähle eine Antwort</legend>
          {exercise.options.map((option, index) => (
            <label
              className={`choice-option ${value === option.id ? 'selected' : ''}`}
              key={option.id}
            >
              <input
                type="radio"
                name="answer"
                value={option.id}
                checked={value === option.id}
                onChange={() => onChange(option.id)}
                disabled={disabled}
              />
              <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
              <span>{option.text}</span>
              <span className="choice-indicator" />
            </label>
          ))}
        </fieldset>
      </>
    )
  if (exercise.type === 'schematic')
    return (
      <>
        {circuit && <CircuitViewer circuit={circuit} selected={value} onSelect={onChange} />}
        <p className="input-help">
          Bauteil antippen oder per Tab und Eingabetaste auswählen.
          {value && ` Auswahl: ${value.toUpperCase()}`}
        </p>
      </>
    )
  return (
    <>
      {exercise.type === 'numeric' && circuit && <CircuitViewer circuit={circuit} compact />}
      <label className="answer-label" htmlFor="answer">
        Deine Antwort{exercise.type === 'numeric' && ` in ${exercise.unit}`}
      </label>
      <input
        autoComplete="off"
        id="answer"
        className="answer-input"
        value={value}
        disabled={disabled}
        maxLength={2000}
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          exercise.type === 'numeric' ? `z. B. 0,36 ${exercise.unit}` : 'Aus dem Gedächtnis …'
        }
      />
      <p className="input-help">
        {exercise.type === 'numeric'
          ? 'Dezimalkomma oder Punkt. Passende Einheiten wie mA oder kΩ sind erlaubt.'
          : 'Formuliere deine Antwort, bevor du die Lösung ansiehst.'}
      </p>
    </>
  )
}
