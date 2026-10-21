import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { concepts } from '../content/curriculum'
import type { AttemptEvent } from '../domain/models'
import { practiceRecommendations } from '../domain/practice-plan'

export function ConceptRecommendations({
  attempts,
  limit = 2,
}: {
  attempts: AttemptEvent[]
  limit?: number
}) {
  const recommendations = practiceRecommendations(concepts, attempts).slice(0, limit)
  if (!recommendations.length) return null
  return (
    <section className="concept-recommendations" aria-label="Empfehlungen zum Vertiefen">
      <h3>Hier lohnt sich Vertiefen</h3>
      <p className="muted tiny">
        Grundlage sind jeweils die letzten 20 Versuche pro Konzept. Wenige Versuche geben erst
        Anhaltspunkte, keine sichere Einschätzung.
      </p>
      {recommendations.map(({ concept, explanation }) => (
        <Link
          className="concept-recommendation"
          to={`/ueben?concept=${encodeURIComponent(concept.id)}`}
          key={concept.id}
        >
          <span>
            <strong>{concept.title}</strong>
            <small>{explanation}</small>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      ))}
    </section>
  )
}
