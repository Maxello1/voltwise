import { display } from './display'
import { useCallback, useState } from 'react'
import {
  armatureCurrent,
  excitationTypes,
  motorParts,
  motorState,
  type Excitation,
} from '../../domain/dc-motor'
import { useLabAnimation } from './useLabAnimation'
import { NumberControl } from './LabCanvas'
import { ExcitationDiagram, MotorDiagram } from './MotorDiagram'

export function MotorLab() {
  const [angle, setAngle] = useState(0),
    [speed, setSpeed] = useState(30),
    [playing, setPlaying] = useState(false)
  const [commutated, setCommutated] = useState(true),
    [quiz, setQuiz] = useState(false),
    [selected, setSelected] = useState('')
  const [field, setField] = useState<1 | -1>(1),
    [supply, setSupply] = useState<1 | -1>(1)
  const [u, setU] = useState(24),
    [ra, setRa] = useState(2),
    [ui, setUi] = useState(20)
  const [excitation, setExcitation] = useState<Excitation>('Fremderregung'),
    [prediction, setPrediction] = useState(''),
    [show, setShow] = useState(false)
  const tick = useCallback(() => setAngle((a) => (a + speed * 0.08) % 360), [speed])
  const reduced = useLabAnimation(playing, tick)
  const state = motorState(angle, { commutated, fieldPolarity: field, supplyPolarity: supply })
  const part = motorParts.find((p) => p.id === selected)
  return (
    <div className="school-lab">
      <div className="lab-workspace">
        <section className="card lab-main">
          <span className="eyebrow">EINE SCHLEIFE · ZWEI AKTIVE LEITER</span>
          <h2>Warum dreht sich der Anker?</h2>
          <MotorDiagram
            angle={angle}
            commutated={commutated}
            fieldPolarity={field}
            supplyPolarity={supply}
            quiz={quiz}
            selected={selected}
            onSelect={setSelected}
          />
          <div className="lab-controls-row">
            <button
              type="button"
              className="button button-outline"
              disabled={reduced}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing && !reduced ? 'Pause' : 'Drehung starten'}
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setAngle((a) => (a + 15) % 360)}
            >
              Schritt +15°
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={() => {
                setPlaying(false)
                setAngle(90)
              }}
            >
              Neutrale Lage 90°
            </button>
          </div>
          {reduced && <p>Bewegung reduziert: Winkelregler oder Einzelschritte verwenden.</p>}
          <div className="lab-readings" data-testid="motor-results">
            <span>
              Leiterkraft |F| <strong>{display(state.forceN)} N</strong>
            </span>
            <span>
              Drehmoment <strong>{display(state.torqueNm, 6)} N·m</strong>
            </span>
            <span>
              Schleifenstrom{' '}
              <strong>
                {state.currentDirection > 0
                  ? '• / ×'
                  : state.currentDirection < 0
                    ? '× / •'
                    : '0 beim Wechsel'}
              </strong>
            </span>
            <span>
              Kommutierung{' '}
              <strong>
                {state.neutral
                  ? 'neutrale Umschaltlage'
                  : state.commutator === 1
                    ? 'erste Halbdrehung'
                    : 'zweite Halbdrehung'}
              </strong>
            </span>
          </div>
          <label className="lab-control">
            <span>Bauteil auswählen</span>
            <select
              aria-label="Motorbauteil auswählen"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Auswählen …</option>
              {motorParts.map((p, i) => (
                <option key={p.id} value={p.id}>
                  {quiz ? `Bauteil ${i + 1}` : p.name}
                </option>
              ))}
            </select>
          </label>
          {part && (
            <div className="selection-note" role="status">
              <strong>{part.name}</strong>
              <p>{part.detail}</p>
            </div>
          )}
          <p className="formula">
            F = B · I · l = 0,8 T · 2 A · 0,03 m = 0,048 N je Leiter
            <br />M = 2 · F · r · cos α · Stromvorzeichen · Feldvorzeichen
          </p>
          <p>
            α ist der Radiuswinkel ab der positiven waagerechten Feldachse. Die axialen Leiter
            bleiben senkrecht zum Feld. Ihre Kraft ist im Modell konstant; das Drehmoment verändert
            sich mit dem Hebelarm. Bei 90°/270° ist es null. Mit Stromwender kehrt der
            Schleifenstrom dort um.
          </p>
          <p className="input-help">
            Die Bewegung wird mit der gewählten Geschwindigkeit vorgegeben. Sie ist keine berechnete
            Beschleunigung: keine Trägheit, Lastdynamik, Reibung, Sättigung, Erwärmung oder reale
            Stromwendungsdauer. Eine einzelne Schleife startet aus exakter Totlage nicht selbst.
          </p>
        </section>
        <aside className="card lab-settings">
          <h3>Vorhersagen & ausprobieren</h3>
          <NumberControl
            label="Rotorwinkel α [°]"
            value={angle}
            min={0}
            max={360}
            onChange={(v) => {
              setPlaying(false)
              setAngle(v)
            }}
          />
          <NumberControl
            label="Vorgegebene Bewegung [°/s]"
            value={speed}
            min={5}
            max={90}
            step={5}
            onChange={setSpeed}
          />
          <label className="lab-check">
            <input
              type="checkbox"
              checked={commutated}
              onChange={(e) => setCommutated(e.target.checked)}
            />
            Stromwender aktiv
          </label>
          <label className="lab-check">
            <input
              type="checkbox"
              checked={quiz}
              onChange={(e) => {
                setQuiz(e.target.checked)
                setSelected('')
              }}
            />
            Beschriftung zum Selbsttest verbergen
          </label>
          <button
            type="button"
            className="button button-outline"
            onClick={() => setField((f) => (f === 1 ? -1 : 1))}
          >
            Magnetpole umkehren
          </button>
          <button
            type="button"
            className="button button-outline"
            onClick={() => setSupply((s) => (s === 1 ? -1 : 1))}
          >
            Versorgung umpolen
          </button>
          <div className="prediction-box">
            <p>Was geschieht ohne Stromwender bei α = 180° und ursprünglicher Polung?</p>
            <select
              aria-label="Vorhersage zum Drehmoment"
              value={prediction}
              onChange={(e) => {
                setPrediction(e.target.value)
                setShow(false)
              }}
            >
              <option value="">Auswählen …</option>
              <option value="negative">Drehmoment wird negativ</option>
              <option value="positive">Drehmoment bleibt positiv</option>
              <option value="zero">Drehmoment bleibt null</option>
            </select>
            <button
              type="button"
              className="button button-outline"
              disabled={!prediction}
              onClick={() => setShow(true)}
            >
              Vorhersage prüfen
            </button>
            {show && (
              <p role="status">
                {prediction === 'negative' ? 'Richtig.' : 'Noch einmal überlegen.'} Ohne
                Stromwendung gilt cos180° = −1: Das Drehmoment wirkt entgegen der ursprünglichen
                Drehrichtung.
              </p>
            )}
          </div>
        </aside>
      </div>
      <div className="lab-workspace">
        <section className="card lab-main">
          <h2>Gegenspannung begrenzt den Strom.</h2>
          <p className="formula">
            IA = (U − Ui)/RA = ({display(u)} − {display(ui)})/{display(ra)} ={' '}
            {display(armatureCurrent(u, ui, ra))} A
          </p>
          <div className="lab-readings">
            <span>
              Bei Stillstand Ui = 0 <strong>{display(armatureCurrent(u, 0, ra))} A</strong>
            </span>
            <span>
              Am gewählten Betriebspunkt <strong>{display(armatureCurrent(u, ui, ra))} A</strong>
            </span>
          </div>
          <NumberControl label="Klemmenspannung U [V]" value={u} min={1} max={48} onChange={setU} />
          <NumberControl
            label="Ankerwiderstand RA [Ω]"
            value={ra}
            min={0.5}
            max={10}
            step={0.5}
            onChange={setRa}
          />
          <NumberControl
            label="Gegenspannung Ui [V]"
            value={ui}
            min={0}
            max={48}
            onChange={setUi}
          />
          <p>
            Ui = kΦω wächst bei konstantem Fluss mit der Drehzahl. Die gewählte Gegenspannung ist
            ein unabhängiger numerischer Betriebspunkt und nicht aus der obigen Animation berechnet.{' '}
            {ui > u
              ? 'Ui > U: Der negative Strom weist im vereinfachten Modell auf generatorischen Betrieb hin.'
              : 'Bei Stillstand verschwindet die rotationsbedingte Gegenspannung.'}
          </p>
        </section>
        <section className="card lab-main">
          <h2>Wie wird das Hauptfeld erzeugt?</h2>
          <label className="lab-control">
            <span>Erregungsart</span>
            <select
              aria-label="Erregungsart"
              value={excitation}
              onChange={(e) => setExcitation(e.target.value as Excitation)}
            >
              {excitationTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <ExcitationDiagram type={excitation} />
          <p>
            {excitation === 'Fremderregung'
              ? 'Die Erregerwicklung hat eine unabhängige Quelle.'
              : excitation === 'Nebenschluss'
                ? 'Feld und Anker liegen parallel an derselben Quelle.'
                : excitation === 'Reihenschluss'
                  ? 'Feld- und Ankerstrom sind gleich. Reihenschlussmotoren können im Leerlauf gefährlich hohe Drehzahlen erreichen.'
                  : excitation === 'Doppelschluss'
                    ? 'Reihen- und Nebenschlusswicklung sind kombiniert; ihr Wicklungssinn entscheidet über verstärkende oder schwächende Wirkung.'
                    : 'Permanentmagnete erzeugen das Hauptfeld ohne elektrische Erregerwicklung.'}
          </p>
          <p className="input-help">
            Ankerrückwirkung, Wendepole und Kompensationswicklung findest du mit
            Ursache-Wirkung-Aufgaben unter Lernen → Kommutierung & neutrale Zone. Ihre
            Feldverteilung wird nicht numerisch simuliert.
          </p>
        </section>
      </div>
    </div>
  )
}
