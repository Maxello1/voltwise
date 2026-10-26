import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router'
import {
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  CircuitBoard,
  GraduationCap,
  House,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  Zap,
} from 'lucide-react'
import { useLearningData } from './useLearningData'
import { db } from '../storage/db'
import { Loading } from '../components/ui'
import { PwaStatus } from '../components/PwaStatus'
import { startAutomaticSync } from '../sync/runtime'

const Dashboard = lazy(() =>
  import('../features/dashboard/Dashboard').then((module) => ({ default: module.Dashboard })),
)
const Learn = lazy(() =>
  import('../features/learn/Learn').then((module) => ({ default: module.Learn })),
)
const Practice = lazy(() =>
  import('../features/practice/Practice').then((module) => ({ default: module.Practice })),
)
const CircuitLab = lazy(() =>
  import('../features/circuit-lab/CircuitLab').then((module) => ({ default: module.CircuitLab })),
)
const Progress = lazy(() =>
  import('../features/progress/Progress').then((module) => ({ default: module.Progress })),
)
const SettingsPage = lazy(() =>
  import('../features/settings/Settings').then((module) => ({ default: module.SettingsPage })),
)
const Diagnostics = lazy(() =>
  import('../features/diagnostics/Diagnostics').then((module) => ({ default: module.Diagnostics })),
)
const SchoolLab = lazy(() =>
  import('../features/school-lab/SchoolLab').then((module) => ({ default: module.SchoolLab })),
)

const navigation = [
  { to: '/', label: 'Übersicht', icon: House },
  { to: '/lernen', label: 'Lernen', icon: BookOpen },
  { to: '/ueben', label: 'Üben', icon: GraduationCap },
  { to: '/schaltplaene', label: 'Schaltpläne', icon: CircuitBoard },
  { to: '/fortschritt', label: 'Fortschritt', icon: ChartNoAxesCombined },
  { to: '/einstellungen', label: 'Einstellungen', icon: Settings2 },
]
function Shell() {
  useEffect(startAutomaticSync, [])
  const data = useLearningData()
  const location = useLocation()
  const current =
    navigation.find((item) => item.to === location.pathname)?.label ??
    (location.pathname === '/fehlersuche'
      ? 'Fehlersuche'
      : location.pathname === '/labor'
        ? 'Lernlabore'
        : 'Lernraum')
  const theme = data?.settings?.theme ?? 'system'
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    document.title = `${current} · Voltwise`
    document.getElementById('main')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [current])
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Zum Inhalt springen
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="Voltwise Startseite">
          <span className="brand-mark">
            <Zap size={23} fill="currentColor" strokeWidth={1.6} />
          </span>
          <span>
            voltwise<span className="brand-period">.</span>
          </span>
        </Link>
        <p className="nav-caption">DEIN LERNRAUM</p>
        <nav aria-label="Hauptnavigation">
          {navigation.map((item) => (
            <NavLink
              end={item.to === '/'}
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              <ChevronRight size={15} className="nav-arrow" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="apprenticeship">
            <span className="small-icon">
              <GraduationCap size={20} />
            </span>
            <p>
              Für deine Ausbildung<strong>Betriebstechnik</strong>
            </p>
          </div>
          <div className="local-note">
            <ShieldCheck size={15} />
            <span>Dein Wissen. Deine Daten.</span>
          </div>
          <p className="version-label">VOLTWISE · LERNVERSION 0.8</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Lernraum</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <PwaStatus />
            <button
              className="icon-button theme-toggle"
              aria-label="Farbschema wechseln"
              onClick={() =>
                void db.settings.update('preferences', {
                  theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
                })
              }
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="avatar" aria-label="Lokales Profil">
              Du
            </span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {!data ? (
            <Loading />
          ) : (
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Dashboard data={data} />} />
                <Route path="/lernen" element={<Learn data={data} />} />
                <Route path="/ueben" element={<Practice key={location.search} data={data} />} />
                <Route path="/fehlersuche" element={<Diagnostics data={data} />} />
                <Route path="/labor" element={<SchoolLab />} />
                <Route path="/schaltplaene" element={<CircuitLab data={data} />} />
                <Route path="/fortschritt" element={<Progress data={data} />} />
                <Route path="/einstellungen" element={<SettingsPage data={data} />} />
                <Route
                  path="*"
                  element={
                    <div className="empty-state">
                      <h1>Hier geht’s zum Lernraum.</h1>
                      <Link to="/">Zur Übersicht</Link>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          )}
        </main>
        <footer className="workspace-footer">
          <span>Schritt für Schritt zum Durchblick.</span>
          <span>
            <span className="status-dot" />
            Offline lernen · lokal gespeichert
          </span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {navigation.map((item) => (
          <NavLink
            end={item.to === '/'}
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <item.icon size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
