import type { Exercise, Unit } from './models'
import {
  period,
  frequency,
  degrees,
  angleAtTime,
  rms,
  peak,
  sineValue,
  inductiveReactance,
  capacitiveReactance,
  addPhasors,
  idealAc,
} from './ac'
import { lorentzForce, armatureCurrent } from './dc-motor'
import { generatorState } from './plc-generator'

export type SchoolArea = 'ac' | 'motor' | 'plc'
interface Template {
  topic: string
  title: string
  unit: Unit
  make: (pick: (values: number[]) => number) => { prompt: string; answer: number; working: string }
}
const templates = {
  ac: {
    period: {
      topic: 'ac-sine',
      title: 'Periodendauer',
      unit: 's',
      make: (pick) => {
        const f = pick([25, 50, 100, 200])
        return { prompt: `Berechne T bei f = ${f} Hz.`, answer: period(f), working: `T = 1/${f} s` }
      },
    },
    frequency: {
      topic: 'ac-sine',
      title: 'Frequenz',
      unit: 'Hz',
      make: (pick) => {
        const t = pick([2, 4, 10, 20, 40])
        return {
          prompt: `Berechne f bei T = ${t} ms.`,
          answer: frequency(t / 1000),
          working: `f = 1/(${t}/1000) Hz`,
        }
      },
    },
    angle: {
      topic: 'ac-sine',
      title: 'Winkel aus Zeit',
      unit: '°',
      make: (pick) => {
        const f = pick([25, 50, 100]),
          t = pick([1, 2, 3])
        return {
          prompt: `f = ${f} Hz; t = ${t} ms. Berechne den durchlaufenen Winkel.`,
          answer: degrees(angleAtTime(f, t / 1000)),
          working: `α = 360°·${f}·${t}/1000`,
        }
      },
    },
    rms: {
      topic: 'ac-rms',
      title: 'Effektivwert',
      unit: 'V',
      make: (pick) => {
        const u = pick([24, 48, 100, 325])
        return {
          prompt: `Reiner Sinus mit Û = ${u} V. Berechne Ueff.`,
          answer: rms(u),
          working: `Ueff = ${u}/√2 V`,
        }
      },
    },
    peak: {
      topic: 'ac-rms',
      title: 'Scheitelwert',
      unit: 'A',
      make: (pick) => {
        const i = pick([0.1, 0.2, 1, 2])
        return {
          prompt: `Reiner Sinus mit Ieff = ${i} A. Berechne Î.`,
          answer: peak(i),
          working: `Î = ${i}·√2 A`,
        }
      },
    },
    instant: {
      topic: 'ac-sine',
      title: 'Momentanwert',
      unit: 'V',
      make: (pick) => {
        const u = pick([24, 100, 325]),
          f = pick([25, 50]),
          t = pick([1, 2, 3])
        return {
          prompt: `Û = ${u} V, f = ${f} Hz, φ = 0°. Berechne u(${t} ms).`,
          answer: sineValue({ amplitude: u, frequencyHz: f, phaseDegrees: 0 }, t / 1000),
          working: `u = ${u}·sin(2π·${f}·${t}/1000) V`,
        }
      },
    },
    inductive: {
      topic: 'ac-inductor',
      title: 'Induktiver Blindwiderstand',
      unit: 'Ω',
      make: (pick) => {
        const f = pick([25, 50, 100]),
          l = pick([50, 100, 200])
        return {
          prompt: `f = ${f} Hz; L = ${l} mH. Berechne XL.`,
          answer: inductiveReactance(f, l / 1000),
          working: `XL = 2π·${f}·${l}/1000 Ω`,
        }
      },
    },
    capacitive: {
      topic: 'ac-capacitor',
      title: 'Kapazitiver Blindwiderstand',
      unit: 'Ω',
      make: (pick) => {
        const f = pick([25, 50, 100]),
          c = pick([10, 47, 100])
        return {
          prompt: `f = ${f} Hz; C = ${c} µF. Berechne XC.`,
          answer: capacitiveReactance(f, c / 1e6),
          working: `XC = 1/(2π·${f}·${c}·10⁻⁶) Ω`,
        }
      },
    },
    current: {
      topic: 'ac-resistor',
      title: 'Strom am idealen R',
      unit: 'A',
      make: (pick) => {
        const u = pick([12, 24, 48]),
          r = pick([60, 120, 240])
        return {
          prompt: `Ueff = ${u} V, R = ${r} Ω. Berechne Ieff.`,
          answer: idealAc('R', 50, u, r).currentRms,
          working: `Ieff = ${u}/${r} A`,
        }
      },
    },
    vector: {
      topic: 'ac-phasors',
      title: 'Zeigeraddition',
      unit: 'V',
      make: (pick) => {
        const u = pick([10, 20, 30]),
          v = pick([5, 15, 25]),
          angle = pick([30, 60, 90])
        return {
          prompt: `Gleiche Frequenz: U1 = ${u} V bei 0°, U2 = ${v} V bei ${angle}°. Berechne den Summenbetrag.`,
          answer: addPhasors(
            { magnitude: u, angleDegrees: 0, frequencyHz: 50 },
            { magnitude: v, angleDegrees: angle, frequencyHz: 50 },
          ).magnitude,
          working: `|U| = √(${u}²+${v}²+2·${u}·${v}·cos${angle}°) V`,
        }
      },
    },
  },
  motor: {
    force: {
      topic: 'motor-force',
      title: 'Lorentzkraft',
      unit: 'N',
      make: (pick) => {
        const b = pick([0.4, 0.8, 1]),
          i = pick([1, 2, 3]),
          l = pick([2, 3, 5])
        return {
          prompt: `Ein Leiter senkrecht zu B: B = ${b} T, I = ${i} A, l = ${l} cm. Berechne F.`,
          answer: lorentzForce(b, i, l / 100),
          working: `F = ${b}·${i}·${l}/100 N`,
        }
      },
    },
    torque: {
      topic: 'motor-force',
      title: 'Schleifendrehmoment',
      unit: 'N·m',
      make: (pick) => {
        const f = pick([0.02, 0.04, 0.08]),
          r = pick([1, 2, 4])
        return {
          prompt: `Eine Schleife hat zwei gegenüberliegende Leiter mit je F = ${f} N. α = 0°, r = ${r} cm. Berechne Mges.`,
          answer: (2 * f * r) / 100,
          working: `M = 2·${f}·${r}/100 N·m`,
        }
      },
    },
    armature: {
      topic: 'motor-emf',
      title: 'Ankerstrom',
      unit: 'A',
      make: (pick) => {
        const u = pick([24, 48]),
          r = pick([2, 4]),
          fraction = pick([0.5, 0.75])
        const ui = u * fraction
        return {
          prompt: `U = ${u} V, Ui = ${ui} V, RA = ${r} Ω. Berechne IA im stationären Modell.`,
          answer: armatureCurrent(u, ui, r),
          working: `IA = (${u}−${ui})/${r} A`,
        }
      },
    },
    startup: {
      topic: 'motor-emf',
      title: 'Anlauf-Rechenwert',
      unit: 'A',
      make: (pick) => {
        const u = pick([12, 24, 48]),
          r = pick([1, 2, 4])
        return {
          prompt: `U = ${u} V, RA = ${r} Ω; Stillstand mit Ui = 0 V. Berechne den Anlauf-Rechenwert.`,
          answer: armatureCurrent(u, 0, r),
          working: `IA = (${u}−0)/${r} A; kein zeitlicher Anlaufverlauf`,
        }
      },
    },
  },
  plc: {
    load: {
      topic: 'plc-generator',
      title: 'Active-Low-Leistung',
      unit: 'W',
      make: (pick) => {
        const bits = pick([0, 1, 3, 4, 5, 6, 8, 9, 10, 12, 15]).toString(2).padStart(4, '0'),
          state = generatorState(bits)
        return {
          prompt: `Bits E24.3…E24.0 = ${bits}; 0 = läuft. Motor 1…4: 2, 3, 5, 7 kW. Berechne P.`,
          answer: state.totalKw * 1000,
          working: `${
            state.motors
              .filter((m) => m.running)
              .map((m) => m.powerKw)
              .join(' + ') || '0'
          } = ${state.totalKw} kW; A24.0 = ${Number(state.indicator)} nach P < 10 kW`,
        }
      },
    },
    margin: {
      topic: 'plc-generator',
      title: 'Abstand zur Grenze',
      unit: 'W',
      make: (pick) => {
        const bits = pick([4, 5, 6, 8, 9, 10, 12, 15]).toString(2).padStart(4, '0'),
          state = generatorState(bits)
        return {
          prompt: `Bits E24.3…E24.0 = ${bits}, Active-Low; Motor 1…4: 2, 3, 5, 7 kW. Berechne den vorzeichenbehafteten Abstand 10 kW − P. Null bedeutet: strikte Grenze nicht erfüllt.`,
          answer: (10 - state.totalKw) * 1000,
          working: `10 − ${state.totalKw} = ${10 - state.totalKw} kW; A24.0 = ${Number(state.indicator)}`,
        }
      },
    },
  },
} satisfies Record<SchoolArea, Record<string, Template>>
export const schoolTemplateNames = (area: SchoolArea) => Object.keys(templates[area])
export const schoolArea = (value: string | null): value is SchoolArea =>
  value === 'ac' || value === 'motor' || value === 'plc'
/** Frozen v1 integer selection. Template name, code and draw order define an immutable task. */
export function schoolProblem(area: SchoolArea, name: string, code: string): Exercise | undefined {
  if (!/^\d{6}$/.test(code)) return undefined
  const template: Template | undefined = (templates[area] as Record<string, Template>)[name]
  if (!template) return undefined
  let seed =
    ([...`${area}:${name}`].reduce((s, ch) => (Math.imul(s, 31) + ch.charCodeAt(0)) >>> 0, 17) ^
      Number(code)) >>>
    0
  const pick = (values: number[]) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return values[seed % values.length]!
  }
  const task = template.make(pick)
  return {
    id: `${area}1-${name}-${code}`,
    version: 1,
    type: 'numeric',
    topicId: template.topic,
    conceptIds: [template.topic],
    difficulty: 2,
    title: template.title,
    prompt: task.prompt,
    answer: task.answer,
    unit: template.unit,
    tolerance: Math.max(Math.abs(task.answer) * 0.001, 1e-9),
    explanation: `${task.working}. Ergebnis: ${task.answer.toLocaleString('de', { useGrouping: false, maximumSignificantDigits: 8 })} ${template.unit}.`,
    hint: 'Rechne zuerst in Basiseinheiten. Runde erst am Ende; Toleranz 0,1 % (bei null ±10⁻⁹).',
    reviewable: false,
    provenance: {
      tag: 'schulstoff-2026-10',
      source: area === 'plc' ? 'A' : 'A+B',
      pages: area === 'ac' ? 'A:10–17; B:6' : area === 'motor' ? 'A:18–24; B:1–5' : 'A:2–7',
      basis: 'Ergänzende Erklärung',
    },
  }
}
export function schoolRound(area: SchoolArea, code: string): Exercise[] {
  if (!/^\d{6}$/.test(code)) throw new Error('Der Übungscode besteht aus sechs Ziffern.')
  return schoolTemplateNames(area).map((name) => schoolProblem(area, name, code)!)
}
export function resolveSchoolProblem(id: string) {
  const match = /^(ac|motor|plc)1-([a-z]+)-(\d{6})$/.exec(id)
  return match ? schoolProblem(match[1] as SchoolArea, match[2]!, match[3]!) : undefined
}
