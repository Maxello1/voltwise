import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Calculator,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { LearningData } from '../../app/useLearningData'
import type { Exercise, LearningSession } from '../../domain/models'
import { concepts, exercises, lessons, topics } from '../../content/curriculum'
import { resolveExercise } from '../../content/exercise-catalogue'
import { resolvePracticeCircuit } from '../../content/practice-circuits'
import { createDcRound, resolveDcProblem, validRoundCode } from '../../domain/dc-practice'
import { answerLabel } from '../../domain/grading'
import { planPractice } from '../../domain/practice-plan'
import { CircuitViewer } from '../../schematics/CircuitViewer'
import { advanceSession, startSession, submitAnswer } from '../../storage/learning'
import { EmptyState, ErrorMessage, PageHeading } from '../../components/ui'
import { RoundControls } from './RoundControls'
import { newRoundCode } from './round-code'

const ratings = [
  { value: 1, label: 'Noch einmal', detail: 'Nicht erinnert' },
  { value: 2, label: 'Schwer', detail: 'Mit viel Mühe' },
  { value: 3, label: 'Gut', detail: 'Sicher erinnert' },
  { value: 4, label: 'Leicht', detail: 'Sofort gewusst' },
]
export function Practice({ data }: { data: LearningData }) {
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [finishedId, setFinishedId] = useState<string>()
  const active = data.sessions.find((s) => s.status === 'active')
  const due = data.reviewStates.filter((s) => new Date(s.card.due) <= new Date()).length
  const finished = data.sessions.find((s) => s.id === finishedId && s.status === 'complete')
  const completedRoundCode = finished
    ? resolveDcProblem(finished.exerciseIds[0] ?? '')?.code
    : undefined
  const mode = params.get('mode') === 'review' ? 'review' : 'practice'
  const trainer = mode === 'practice' && params.get('trainer') === 'dc'
  const roundCode = params.get('code') ?? ''
  const targetConcept =
    mode === 'practice' && !trainer
      ? concepts.find((entry) => entry.id === params.get('concept'))
      : undefined
  const plan = trainer
    ? validRoundCode(roundCode)
      ? createDcRound(roundCode).map((exercise) => ({
          exercise,
          explanation:
            'Eine Zahlenvariante deiner Rechenrunde. Derselbe Übungscode ergibt wieder dieselben Werte.',
        }))
      : []
    : planPractice({
        exercises,
        concepts,
        topics,
        lessons,
        attempts: data.attempts,
        reviewStates: data.reviewStates,
        completions: data.completions,
        now: new Date(),
        conceptId: targetConcept?.id,
      }).filter((item) => mode !== 'review' || item.kind === 'due')
  function selectRound(code: string) {
    setError('')
    setFinishedId(undefined)
    setParams({ trainer: 'dc', code })
  }
  async function begin(topic?: string) {
    setBusy(true)
    setError('')
    setFinishedId(undefined)
    try {
      const session = await startSession(
        mode,
        topic,
        undefined,
        undefined,
        topic ? undefined : targetConcept?.id,
        trainer && !topic ? roundCode : undefined,
      )
      if (!session)
        setError(
          'Für diese Auswahl ist gerade keine Aufgabe verfügbar. Geplante Wissensfragen warten bis zu ihrem Wiederholungstermin. Wähle ein anderes Thema oder den Wissensmix.',
        )
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
        <>
          {targetConcept &&
            active.exerciseIds.some(
              (id) => !resolveExercise(id)?.conceptIds.includes(targetConcept.id),
            ) && (
              <p className="selection-note" role="status">
                Deine offene Sitzung wird zuerst fortgesetzt. Danach kannst du „
                {targetConcept.title}“ gezielt üben.
              </p>
            )}
          {trainer &&
            active.exerciseIds.some((id) => !plan.some((item) => item.exercise.id === id)) && (
              <p className="selection-note" role="status">
                Deine offene Sitzung wird zuerst fortgesetzt. Deine gewählte Rechenrunde wartet
                danach auf dich.
              </p>
            )}
          <ExerciseStep
            key={`${active.id}-${active.position}`}
            session={active}
            data={data}
            onFinish={() => setFinishedId(active.id)}
          />
        </>
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
          <button
            className="button button-primary"
            onClick={() =>
              completedRoundCode
                ? selectRound(trainer && validRoundCode(roundCode) ? roundCode : completedRoundCode)
                : void begin()
            }
          >
            {completedRoundCode ? 'Rechenrunde öffnen' : 'Weiterlernen'}
            <ArrowRight size={17} />
          </button>
          {completedRoundCode && (
            <button
              className="button button-outline"
              onClick={() => selectRound(newRoundCode(completedRoundCode))}
            >
              Neue Zahlen wählen
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="practice-options">
            <section className="practice-start card">
              <span className="stat-icon sage">
                <Sparkles size={25} />
              </span>
              <h2>
                {mode === 'review'
                  ? 'Deine Wiederholungen'
                  : trainer
                    ? 'Deine Rechenrunde'
                    : targetConcept
                      ? targetConcept.title
                      : 'Dein täglicher Wissensmix'}
              </h2>
              <p>
                {mode === 'review'
                  ? `${due} Aufgaben sind nach deinem persönlichen FSRS-Zeitplan fällig.`
                  : trainer
                    ? 'Fünf Aufgaben mit wechselnden Werten: Ohmsches Gesetz, Leistung, Reihe und Parallel. Ideale Gleichstromkreise mit konstanten Widerständen.'
                    : targetConcept
                      ? `${plan.length} passende Aufgaben zum gewählten Konzept. Deine geplanten Wissensfragen behalten ihren Wiederholungstermin.`
                      : 'Bis zu 5 Aufgaben: fällige Wissensfragen, Konzepte zum Vertiefen und neue Anwendungen.'}
              </p>
              {trainer && (
                <>
                  <p className="muted tiny">
                    Runde erst am Ende. Toleranz: 0,1 %. Mit demselben Übungscode erhältst du
                    dieselben Aufgaben.
                  </p>
                  <RoundControls key={roundCode} code={roundCode} onSelect={selectRound} />
                  {!validRoundCode(roundCode) && (
                    <ErrorMessage>
                      Der Übungscode muss genau sechs Ziffern enthalten. Wähle neue Zahlen oder gib
                      einen gültigen Code ein.
                    </ErrorMessage>
                  )}
                </>
              )}
              <button
                className="button button-primary"
                onClick={() => void begin()}
                disabled={busy || plan.length === 0}
              >
                {mode === 'review' ? <RotateCcw size={18} /> : <ArrowRight size={18} />}
                {mode === 'review'
                  ? 'Wiederholung starten'
                  : trainer
                    ? 'Rechenrunde starten'
                    : targetConcept
                      ? 'Konzept gezielt üben'
                      : 'Gemischt üben'}
              </button>
              {(targetConcept || trainer) && (
                <Link className="text-link" to="/ueben">
                  Zum Wissensmix <ArrowRight size={16} />
                </Link>
              )}
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
          {mode !== 'review' && !trainer && (
            <section className="card calculation-teaser" aria-label="Rechentrainer">
              <span className="stat-icon blue">
                <Calculator size={24} />
              </span>
              <div>
                <h3>Neue Zahlen. Mehr Verständnis.</h3>
                <p>
                  Übe fünf Rechenaufgaben mit wechselnden Werten. Jede Runde lässt sich per Link
                  teilen und erneut lösen.
                </p>
              </div>
              <button
                className="button button-outline"
                onClick={() => selectRound(newRoundCode())}
                disabled={busy}
              >
                Rechentrainer öffnen <ArrowRight size={17} />
              </button>
            </section>
          )}
          {plan.length > 0 && (
            <section className="card practice-plan" aria-label="Deine nächste Auswahl">
              <h3>{trainer ? 'Deine fünf Rechenaufgaben' : 'Warum diese Aufgaben?'}</h3>
              <p className="muted tiny">
                {trainer
                  ? 'Deine Lösungen, Hinweise und Bearbeitungszeiten zählen zum Fortschritt. Diese Rechenaufgaben verändern keinen FSRS-Termin.'
                  : 'Neue Themen kommen im Mix hinzu, sobald du ihre Grundlagenlektion als gelesen markiert hast. Über die Themenauswahl kannst du jederzeit direkt einsteigen.'}
              </p>
              <ol>
                {plan.map(({ exercise, explanation }) => (
                  <li key={exercise.id}>
                    <strong>{exercise.title}</strong>
                    <span>{explanation}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {mode !== 'review' && !trainer && (
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
  const exercise = resolveExercise(session.exerciseIds[session.position] ?? '')
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
  const generated = resolveDcProblem(exercise.id)
  const selectedComponent =
    exercise.type === 'schematic'
      ? resolvePracticeCircuit(exercise.circuitId)?.components.find((c) => c.id === attempt?.answer)
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
                circuit={resolvePracticeCircuit(exercise.circuitId)!}
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
        {generated && (
          <div className="active-round-note">
            <Link className="text-link" to={`/ueben?trainer=dc&code=${generated.code}`}>
              Rechenrunde {generated.code}
            </Link>
            <p>Runde erst am Ende. Toleranz: 0,1 %.</p>
          </div>
        )}
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
  const circuit = resolvePracticeCircuit(exercise.circuitId ?? '')
  const controlNote =
    circuit?.simulationMode === 'finite-state' ? (
      <p className="input-help">
        Plan in Ausgangslage. Beurteile die im Aufgabentext beschriebene Betätigung.
      </p>
    ) : null
  if (exercise.type === 'choice')
    return (
      <>
        {circuit && <CircuitViewer circuit={circuit} compact />}
        {controlNote}
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
        {controlNote}
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
