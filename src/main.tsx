import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { initializeDatabase } from './storage/db'
import './styles/index.css'

const root = createRoot(document.getElementById('root')!)
initializeDatabase()
  .then(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch(() =>
    root.render(
      <div className="startup-error">
        <h1>Dein lokaler Speicher ist nicht erreichbar.</h1>
        <p>
          Bitte nutze ein normales Browserfenster und erlaube Website-Daten. Vorhandene Daten werden
          nicht gelöscht.
        </p>
        <button onClick={() => location.reload()}>Erneut versuchen</button>
      </div>,
    ),
  )
