import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router'
import { ArrowRight, BookOpen, CheckCircle2, Clock3, LockKeyhole } from 'lucide-react'
import type { LearningData } from '../../app/useLearningData'
import { exercises, lessons, topics } from '../../content/curriculum'
import { completeLesson } from '../../storage/sync'
import { startSession } from '../../storage/learning'
import { ErrorMessage, PageHeading } from '../../components/ui'
import { prerequisitesRead } from '../../domain/practice-plan'
import { PlcTheory } from '../school-lab/PlcTheory'

export function Learn({ data }: { data: LearningData }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const topic = topics.find((t) => t.id === params.get('topic')) ?? topics[0]!
  const lesson = lessons.find((l) => l.topicId === topic.id)!
  const done = data.completions.some((c) => c.lessonId === lesson.id)
  async function complete() {
    try {
      await completeLesson(lesson.id)
    } catch {
      setError('Lektion konnte nicht gespeichert werden.')
    }
  }
  async function practice() {
    try {
      await startSession('practice', topic.id)
      navigate('/ueben')
    } catch {
      setError('Sitzung konnte nicht gestartet werden.')
    }
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="DEIN LERNPFAD"
        title="Verstehen kommt vor Auswendiglernen."
        description="Kurze Lektionen. Klare Zusammenhänge. Direkt anwenden."
      />
      <label className="lab-control topic-quick-select">
        <span>Thema direkt wählen</span>
        <select
          aria-label="Thema direkt wählen"
          value={topic.id}
          onChange={(e) => setParams({ topic: e.target.value })}
        >
          {[
            'Grundlagen & Steuerung',
            'Wechselstromtechnik',
            'Gleichstrommaschinen',
            'SPS-Grundlagen',
          ].map((area) => (
            <optgroup key={area} label={area}>
              {topics
                .filter((t) => (t.area ?? 'Grundlagen & Steuerung') === area)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="learn-layout">
        <div className="topic-menu">
          {topics.map((t, index) => {
            const recommended = prerequisitesRead(t, lessons, data.completions)
            return (
              <button
                key={t.id}
                className={`topic-button card ${topic.id === t.id ? 'active' : ''}`}
                onClick={() => setParams({ topic: t.id })}
              >
                <span className={`path-number ${t.color}`}>{index + 1}</span>
                <span>
                  <strong>{t.title}</strong>
                  <small>
                    {t.area && `${t.area} · `}
                    {exercises.filter((e) => e.topicId === t.id).length} Aufgaben · Stufe {t.tier}
                  </small>
                  {!recommended && (
                    <small className="prerequisite">
                      <LockKeyhole size={12} />
                      Empfohlen nach dem vorherigen Thema
                    </small>
                  )}
                </span>
              </button>
            )
          })}
          <p className="muted tiny">
            Die Reihenfolge ist eine Empfehlung. Du kannst jedes Thema öffnen.
          </p>
          {lesson.provenance && (
            <p className="input-help">
              Schulstoff Oktober 2026 · Stoffzuordnung {lesson.provenance.pages} laut
              Arbeitsauftrag. Eigene Erklärungen, Beispiele und Lehrmodelle zur Vertiefung.
            </p>
          )}
        </div>
        <article className="lesson card" key={lesson.id}>
          <span className={`soft-badge ${topic.color}`}>
            <BookOpen size={14} />
            {topic.title}
          </span>
          <h2>{lesson.title}</h2>
          <p className="lesson-meta">
            <Clock3 size={14} />
            {lesson.minutes} Minuten Lesezeit<span>·</span>Lektion {lesson.version}.0
          </p>
          {lesson.sections.map((section, index) => (
            <section key={section.title}>
              <span className="lesson-section-number">0{index + 1}</span>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
              {section.formula && <div className="formula">{section.formula}</div>}
            </section>
          ))}
          {(topic.id === 'plc-generator' || topic.id === 'plc-fup') && (
            <PlcTheory fup={topic.id === 'plc-fup'} />
          )}
          <div className="lesson-actions">
            {topic.lab && (
              <Link className="button button-outline" to={`/labor?lab=${topic.lab}`}>
                Im Labor ausprobieren <ArrowRight size={17} />
              </Link>
            )}
            {topic.id === 'controls' && (
              <Link className="button button-outline" to="/schaltplaene?circuit=control-lamp-v1">
                Steuerstromkreise ausprobieren <ArrowRight size={17} />
              </Link>
            )}
            <button
              className={`button ${done ? 'button-soft' : 'button-primary'}`}
              onClick={() => void complete()}
              disabled={done}
            >
              <CheckCircle2 size={18} />
              {done ? 'Lektion abgeschlossen' : 'Als gelesen markieren'}
            </button>
            <button className="button button-outline" onClick={() => void practice()}>
              Wissen anwenden
              <ArrowRight size={17} />
            </button>
          </div>
          <ErrorMessage>{error}</ErrorMessage>
        </article>
      </div>
    </div>
  )
}
