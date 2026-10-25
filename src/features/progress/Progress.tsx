import { Activity, BookOpen, CheckCircle2, Target, Trophy } from 'lucide-react'
import type { LearningData } from '../../app/useLearningData'
import { concepts, lessons, topics } from '../../content/curriculum'
import { resolveExercise } from '../../content/exercise-catalogue'
import { conceptMastery } from '../../domain/models'
import { EmptyState, PageHeading, SectionHeading } from '../../components/ui'
import { ConceptRecommendations } from '../../components/ConceptRecommendations'
import { ExerciseHistoryTitle } from '../../components/ExerciseHistoryTitle'
import { formatDate, formatNumber } from '../../i18n/de'
import { diagnosticCoverage } from '../diagnostics/diagnostic-summary'

export function Progress({ data }: { data: LearningData }) {
  const correct = data.attempts.filter((a) => a.correct).length
  const mastery = conceptMastery(concepts, data.attempts)
  const sessions = data.sessions.filter((s) => s.status === 'complete')
  const upcoming = [...data.reviewStates].sort((a, b) => a.card.due.localeCompare(b.card.due))
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="DEIN FORTSCHRITT"
        title="Du kannst mehr, als gestern."
        description="Echte Versuche und klare Rückmeldungen – ohne erfundene Lernstatistiken."
      />
      <div className="progress-stat-grid">
        {[
          {
            icon: Activity,
            value: data.attempts.length,
            label: 'Bearbeitete Aufgaben',
            color: 'sage',
          },
          {
            icon: Target,
            value: data.attempts.length
              ? `${formatNumber((correct / data.attempts.length) * 100)} %`
              : '–',
            label: 'Automatisch richtig',
            color: 'blue',
          },
          {
            icon: Trophy,
            value: sessions.length,
            label: 'Sitzungen abgeschlossen',
            color: 'amber',
          },
          {
            icon: BookOpen,
            value: `${data.completions.length} / ${lessons.length}`,
            label: 'Lektionen gelesen',
            color: 'lavender',
          },
        ].map((stat) => (
          <div className="card progress-stat" key={stat.label}>
            <span className={`stat-icon ${stat.color}`}>
              <stat.icon size={21} />
            </span>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      <section className="card diagnostic-coverage">
        <h2>Fehlersuche über verschiedene Ursachen</h2>
        <p>
          {diagnosticCoverage(data).size} von 6 Ursachen ohne Hinweis vollständig belegt. Ein
          wiederholter Fall zählt hier einmal. Die Übungsquote allein belegt keinen Transfer auf
          weitere Anlagen.
        </p>
      </section>
      <div className="progress-layout">
        <section>
          <SectionHeading title="Deine Themenstärken" />
          <div className="card mastery-card">
            {topics.map((topic) => {
              const rows = mastery.filter(
                (m) => concepts.find((c) => c.id === m.conceptId)?.topicId === topic.id,
              )
              const count = rows.reduce((sum, row) => sum + row.attempts, 0)
              const totalCorrect = rows.reduce((sum, row) => sum + row.correct, 0)
              const score = count ? totalCorrect / count : null
              return (
                <div className="mastery-row" key={topic.id}>
                  <div>
                    <h3>{topic.title}</h3>
                    <span>
                      {score === null
                        ? 'Noch nicht geübt'
                        : `${count} Konzeptwertungen · ${formatNumber(score * 100)} % ohne Hinweis richtig`}
                    </span>
                  </div>
                  <div className={`mastery-track ${topic.color}`}>
                    <span style={{ width: `${(score ?? 0) * 100}%` }} />
                  </div>
                </div>
              )
            })}
            <p className="metric-explanation">
              Je Konzept zählen die letzten 20 Versuche. Antworten mit Hinweis zählen nicht als
              selbstständig richtig. Aufgaben mit mehreren Konzepten gehen in jedes ein. Das ist
              eine einfache Übungsquote, keine geprüfte Kompetenzdiagnose.
            </p>
            <ConceptRecommendations attempts={data.attempts} limit={8} />
          </div>
        </section>
        <section>
          <SectionHeading title="Als Nächstes wiederholen" />
          <div className="card upcoming-card">
            {upcoming.length ? (
              upcoming.map((state) => (
                <div key={state.exerciseId} className="upcoming-row">
                  <span className="small-icon sage">
                    <CheckCircle2 size={17} />
                  </span>
                  <div>
                    <h3>{resolveExercise(state.exerciseId)?.title}</h3>
                    <p>
                      {new Date(state.card.due) <= new Date()
                        ? 'Jetzt fällig'
                        : new Date(state.card.due).toLocaleString('de-DE', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Dein Zeitplan wächst mit dir.">
                Beantworte eine Wissensfrage und bewerte deine Erinnerung. Daraus entsteht deine
                erste FSRS-Wiederholung.
              </EmptyState>
            )}
          </div>
        </section>
      </div>
      <SectionHeading title="Deine letzten Verbindungen" />
      <div className="card activity-card">
        {data.attempts.length ? (
          <div className="activity-list">
            {[...data.attempts]
              .reverse()
              .slice(0, 8)
              .map((attempt) => (
                <div className="activity-row" key={attempt.eventId}>
                  <span className={`activity-dot ${attempt.correct ? 'correct' : ''}`} />
                  <div>
                    <h3>
                      <ExerciseHistoryTitle exerciseId={attempt.exerciseId} />
                    </h3>
                    <p>
                      {attempt.correct ? 'Richtig beantwortet' : 'Lösung nachvollzogen'}
                      {attempt.hints ? ' · mit Hinweis' : ''}
                    </p>
                  </div>
                  <time dateTime={attempt.createdAt}>{formatDate(attempt.createdAt)}</time>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState title="Hier beginnt deine Geschichte.">
            Sobald du Aufgaben bearbeitest, siehst du hier deine tatsächliche Aktivität.
          </EmptyState>
        )}
      </div>
    </div>
  )
}
