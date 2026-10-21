import type { ReactNode } from 'react'
import { ArrowUpRight, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router'

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
export function SectionHeading({
  title,
  to,
  link = 'Alle ansehen',
}: {
  title: string
  to?: string
  link?: string
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {to && (
        <Link className="text-link" to={to}>
          {link}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  )
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} />
      <span>Dein Lernraum wird geladen …</span>
    </div>
  )
}
export function ErrorMessage({ children }: { children?: ReactNode }) {
  return children ? (
    <p className="error-message" role="alert">
      {children}
    </p>
  ) : null
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}
