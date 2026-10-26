import { generatorCases, generatorExpression, referenceFup } from '../../domain/plc-generator'
import { LabCanvas } from './LabCanvas'

export function PlcTheory({ fup = false }: { fup?: boolean }) {
  return (
    <section className="plc-theory">
      <h3>{fup ? 'Ein geprüftes FUP-Beispiel' : 'Alle 16 Eingangskombinationen'}</h3>
      {fup && (
        <>
          <LabCanvas title="Theoriebeispiel: kombinatorischer FUP" width={760} height={330}>
            <g className="circuit-wire">
              <path d="M120 45H185M120 80H185M120 155H185M120 190H185M120 225H185M275 62H540V135H570M275 190H390M120 280H355V240H390M480 220H520V185H570M660 160H725" />
            </g>
            {[
              ['E24.1', 45],
              ['E24.2', 80],
              ['E24.0', 155],
              ['E24.1', 190],
              ['E24.2', 225],
              ['E24.3', 280],
            ].map(([s, yy], i) => (
              <text key={i} x="35" y={Number(yy) + 5}>
                {s}
              </text>
            ))}
            {[
              { x: 185, y: 25, label: '&', id: referenceFup.blocks[0]!.id, h: 75 },
              { x: 185, y: 135, label: '≥1', id: referenceFup.blocks[1]!.id, h: 110 },
              { x: 390, y: 180, label: '&', id: referenceFup.blocks[2]!.id, h: 80 },
              { x: 570, y: 115, label: '≥1', id: referenceFup.blocks[3]!.id, h: 90 },
            ].map((b) => (
              <g key={b.id}>
                <rect x={b.x} y={b.y} width="90" height={b.h} className="symbol-outline" />
                <text x={b.x + 45} y={b.y + 35} textAnchor="middle" fontSize="24">
                  {b.label}
                </text>
                <text x={b.x + 45} y={b.y + b.h - 8} textAnchor="middle">
                  {b.id}.Q
                </text>
              </g>
            ))}
            <text x="655" y="110">
              A24.0
            </text>
          </LabCanvas>
          <p className="formula">{generatorExpression}</p>
          <p>
            Die Verbindung von E24.3 führt zum zweiten Eingang von b3; b2.Q führt zum ersten.
            Linienkreuzungen ohne Punkt sind keine Verbindung. Dieser Plan ist ein Theoriebeispiel.
          </p>
        </>
      )}
      <div className="school-table-wrap">
        <table className="school-table">
          <caption>
            Active-Low: 0 = Motor läuft · Bits E24.3…E24.0 · A24.0 = 1 genau bei P &lt; 10 kW
          </caption>
          <thead>
            <tr>
              <th>Bits 3…0</th>
              <th>Laufende Motoren</th>
              <th>P [kW]</th>
              <th>A24.0</th>
            </tr>
          </thead>
          <tbody>
            {generatorCases().map((row) => (
              <tr key={row.bits} className={row.boundary ? 'boundary-row' : undefined}>
                <th scope="row">{row.bits}</th>
                <td>
                  {row.motors
                    .filter((m) => m.running)
                    .map((m) => m.name.replace('Motor ', ''))
                    .join(', ') || 'keiner'}
                </td>
                <td>
                  {row.totalKw}
                  {row.boundary ? ' · Grenze' : ''}
                </td>
                <td>{Number(row.indicator)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="input-help">
        Die Unterrichtsformulierung „maximal 10 kW“ ist mehrdeutig. Hier gilt die ausdrücklich
        vorgegebene strikte Formel; beide 10-kW-Zeilen ergeben 0. Kein SPS-Labor und keine
        Hardwareverbindung.
      </p>
    </section>
  )
}
