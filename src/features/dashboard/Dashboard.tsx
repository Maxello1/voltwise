import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CirclePlay,
  Clock3,
  Flame,
  Layers3,
  RotateCcw,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import type { LearningData } from '../../app/useLearningData'
import { exercises, exerciseById, lessons, topics } from '../../content/curriculum'
import { parallelDemo } from '../../content/circuit'
import { CircuitViewer } from '../../schematics/CircuitViewer'
import { startSession } from '../../storage/learning'
import { EmptyState, ErrorMessage, PageHeading, SectionHeading } from '../../components/ui'
import { ConceptRecommendations } from '../../components/ConceptRecommendations'
import { formatNumber } from '../../i18n/de'

export function Dashboard({ data }: { data: LearningData }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const due = data.reviewStates.filter((state) => new Date(state.card.due) <= new Date()).length
  const active = data.sessions.find((session) => session.status === 'active')
  const today = data.attempts.filter(
    (a) =>
      new Date(a.createdAt).toLocaleDateString('de-DE') === new Date().toLocaleDateString('de-DE'),
  )
  const goal = data.settings?.dailyGoal ?? 5
  const completedSessions = data.sessions.filter((s) => s.status === 'complete').length
  const accuracy = data.attempts.length
    ? (data.attempts.filter((a) => a.correct).length / data.attempts.length) * 100
    : null
  const learned = new Set(data.attempts.map((a) => a.exerciseId)).size
  async function begin() {
    setStarting(true)
    setError('')
    try {
      await startSession()
      navigate('/ueben')
    } catch {
      setError('Die Sitzung konnte nicht gestartet werden. Bitte versuche es erneut.')
    } finally {
      setStarting(false)
    }
  }
  const date = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return (
    <div className="dashboard page-enter">
      <PageHeading
        eyebrow={date}
        title="Kleine Schritte. Großes Verständnis."
        description="Dein Lernraum für alles, was dich weiterbringt."
        action={
          <span className="soft-badge">
            <Sparkles size={14} />
            Bereit für deinen Aha-Moment?
          </span>
        }
      />
      <div className="dashboard-top-grid">
        <section className="study-hero">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span className="tiny-pill">DEIN FOKUS</span> Elektrotechnik verstehen
            </span>
            <h2>
              Wissen, das
              <br />
              Verbindungen schafft.
            </h2>
            <p>
              Vom ersten Ohm bis zum klaren Schaltplan.
              <br className="desktop-break" /> Eine Aufgabe nach der anderen.
            </p>
            <button className="button button-lime" onClick={() => void begin()} disabled={starting}>
              <CirclePlay size={19} />
              {active ? 'Lernsitzung fortsetzen' : 'Lernsitzung starten'}
              <ArrowRight size={17} />
            </button>
            <span className="hero-meta">
              <Clock3 size={13} />
              {active ? `${active.exerciseIds.length} Aufgaben` : 'Bis zu 5 Aufgaben'} · in deinem
              Tempo
            </span>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="energy-core">
              <Zap size={56} fill="currentColor" strokeWidth={1} />
            </div>
            <span className="orbit-node node-one" />
            <span className="orbit-node node-two" />
            <span className="orbit-node node-three" />
            <span className="art-label art-label-top">U = R · I</span>
            <span className="art-label art-label-bottom">Verbindungen verstehen</span>
          </div>
        </section>
        <section className="daily-goal card">
          <div className="card-topline">
            <span className="small-icon peach">
              <Flame size={20} />
            </span>
            <span className="eyebrow">DEIN TAGESZIEL</span>
          </div>
          <div
            className="goal-ring"
            style={
              { '--progress': `${Math.min(today.length / goal, 1) * 100}%` } as React.CSSProperties
            }
          >
            <div>
              <strong>
                {Math.min(today.length, goal)}
                <span> / {goal}</span>
              </strong>
              <small>Aufgaben</small>
            </div>
          </div>
          <h3>
            {today.length >= goal
              ? 'Ziel erreicht. Gut gemacht!'
              : today.length
                ? 'Du bist auf einem guten Weg.'
                : 'Ein guter Tag, um anzufangen.'}
          </h3>
          <p>
            {today.length >= goal
              ? 'Jede weitere Aufgabe zählt natürlich auch.'
              : `Noch ${Math.max(goal - today.length, 0)} Aufgaben bis zu deinem Tagesziel.`}
          </p>
        </section>
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="stats-grid">
        <Link to="/ueben?mode=review" className="stat-card card">
          <span className="stat-icon sage">
            <RotateCcw size={21} />
          </span>
          <div>
            <span className="stat-label">Zur Wiederholung</span>
            <strong>
              {due}
              <small>heute fällig</small>
            </strong>
          </div>
          <ArrowUpRight size={17} className="muted" />
        </Link>
        <Link to="/fortschritt" className="stat-card card">
          <span className="stat-icon blue">
            <Target size={21} />
          </span>
          <div>
            <span className="stat-label">Deine Trefferquote</span>
            <strong>
              {accuracy === null ? '–' : `${formatNumber(accuracy)} %`}
              <small>
                {data.attempts.length
                  ? `${data.attempts.length} echte Versuche`
                  : 'Dein erster Versuch zählt'}
              </small>
            </strong>
          </div>
          <ArrowUpRight size={17} className="muted" />
        </Link>
        <Link to="/fortschritt" className="stat-card card">
          <span className="stat-icon lavender">
            <Layers3 size={21} />
          </span>
          <div>
            <span className="stat-label">Abgeschlossene Sitzungen</span>
            <strong>
              {completedSessions}
              <small>
                {learned} von {exercises.length} Aufgaben entdeckt
              </small>
            </strong>
          </div>
          <ArrowUpRight size={17} className="muted" />
        </Link>
      </div>
      <div className="dashboard-main-grid">
        <section>
          <SectionHeading
            title="Zusammenhänge sichtbar machen"
            to="/schaltplaene"
            link="Zum Schaltplanraum"
          />
          <div className="card circuit-preview">
            <div className="preview-heading">
              <span className="soft-badge sage">
                <span className="status-dot" />
                INTERAKTIV
              </span>
              <span className="muted tiny">GRUNDLAGEN · GLEICHSTROM</span>
            </div>
            <h3>Ein Stromkreis. Zwei Wege.</h3>
            <p className="muted">Entdecke, wie sich Strom in einer Parallelschaltung verteilt.</p>
            <CircuitViewer circuit={parallelDemo} compact />
            <div className="preview-bottom">
              <span>
                <span className="legend-dot" />
                24 V DC<span className="divider-dot">·</span>2 Widerstände
              </span>
              <Link to="/schaltplaene" className="text-link">
                Schaltung erkunden
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
        <section>
          <SectionHeading title="Dein Lernpfad" to="/lernen" link="Alle Themen" />
          <div className="card learning-path">
            {topics.map((topic, index) => {
              const lesson = lessons.find((l) => l.topicId === topic.id)
              const complete = data.completions.some((c) => c.lessonId === lesson?.id)
              const count = data.attempts.filter(
                (a) => exercises.find((e) => e.id === a.exerciseId)?.topicId === topic.id,
              ).length
              return (
                <Link to={`/lernen?topic=${topic.id}`} className="path-item" key={topic.id}>
                  <span className={`path-number ${topic.color} ${complete ? 'done' : ''}`}>
                    {complete ? <Check size={18} /> : String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3>{topic.title}</h3>
                    <p>
                      {complete ? 'Lektion abgeschlossen' : `${lesson?.minutes ?? 3} Min. Lesezeit`}
                      {count ? ` · ${count} Versuche` : ' · Bereit für dich'}
                    </p>
                  </div>
                  <ArrowUpRight size={17} />
                </Link>
              )
            })}
            <div className="path-footer">
              <BookOpen size={16} />
              <span>Verständnis wächst mit jeder Verbindung.</span>
            </div>
          </div>
          <div className="learning-note">
            <span className="small-icon">
              <Zap size={18} />
            </span>
            <p>
              <strong>Dein Tempo ist das richtige.</strong>Dein Fortschritt bleibt auf diesem Gerät
              gespeichert.
            </p>
          </div>
        </section>
      </div>
      <section>
        <SectionHeading title="Deine letzten Schritte" to="/fortschritt" link="Zum Fortschritt" />
        <div className="card dashboard-activity">
          {data.attempts.length ? (
            <>
              {[...data.attempts]
                .reverse()
                .slice(0, 3)
                .map((attempt) => (
                  <div className="activity-row" key={attempt.eventId}>
                    <span className={`activity-dot ${attempt.correct ? 'correct' : ''}`} />
                    <div>
                      <h3>{exerciseById.get(attempt.exerciseId)?.title}</h3>
                      <p>
                        {attempt.correct ? 'Richtig beantwortet' : 'Eine neue Lernchance'}
                        {attempt.hints ? ' · mit Hinweis' : ''}
                      </p>
                    </div>
                    <time dateTime={attempt.createdAt}>
                      {new Date(attempt.createdAt).toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </time>
                  </div>
                ))}
              <ConceptRecommendations attempts={data.attempts} />
            </>
          ) : (
            <EmptyState title="Dein erster Schritt wartet auf dich.">
              Nach deiner ersten Aufgabe siehst du hier deine Aktivität und Themen, bei denen sich
              Üben lohnt.
            </EmptyState>
          )}
        </div>
      </section>
    </div>
  )
}
