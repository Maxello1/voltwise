import { useState } from 'react'
import { Copy, Shuffle } from 'lucide-react'
import { validRoundCode } from '../../domain/dc-practice'
import { ErrorMessage } from '../../components/ui'
import { newRoundCode } from './round-code'

export function RoundControls({
  code,
  onSelect,
  shareHash,
}: {
  code: string
  onSelect: (code: string) => void
  shareHash?: string
}) {
  const [input, setInput] = useState(code)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function copy() {
    setError('')
    try {
      const url = new URL(window.location.href)
      url.search = ''
      url.hash = shareHash ?? `/ueben?trainer=dc&code=${code}`
      await navigator.clipboard.writeText(url.href)
      setMessage('Rundenlink kopiert.')
    } catch {
      setError(
        'Kopieren ist hier nicht verfügbar. Du kannst den Link aus der Adressleiste kopieren.',
      )
    }
  }
  return (
    <div className="round-controls">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (validRoundCode(input)) onSelect(input)
        }}
      >
        <label htmlFor="round-code">Übungscode · sechs Ziffern</label>
        <div className="round-code-row">
          <input
            id="round-code"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            className="answer-input round-code-input"
          />
          <button className="button button-outline" type="submit">
            Runde anzeigen
          </button>
        </div>
      </form>
      <div className="round-control-actions">
        <button className="text-link" onClick={() => onSelect(newRoundCode(code))}>
          <Shuffle size={16} /> Neue Zahlen
        </button>
        {validRoundCode(code) && (
          <button className="text-link" onClick={() => void copy()}>
            <Copy size={16} /> Rundenlink kopieren
          </button>
        )}
      </div>
      {message && (
        <p className="muted tiny" role="status">
          {message}
        </p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  )
}
