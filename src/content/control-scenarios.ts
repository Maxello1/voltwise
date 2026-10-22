import type { ControlInputs } from '../domain/control'

export const controlScenarios: {
  id: string
  title: string
  question: string
  inputs: Partial<ControlInputs>[]
}[] = [
  {
    id: 'trip',
    title: 'K1 zieht nicht an',
    question: 'Start ist gedrückt, die Spannung ist da. Welcher Kontakt unterbricht den Strompfad?',
    inputs: [{ fault: true }, { start: true }],
  },
  {
    id: 'restore',
    title: 'Spannung zurück, K1 bleibt aus',
    question: 'Start wurde während des Ausfalls festgehalten. Warum bleibt B1 offen?',
    inputs: [{ start: true }, { supply: false }, { supply: true }],
  },
  {
    id: 'stop',
    title: 'Start und Stop gleichzeitig',
    question: 'Beide Taster sind gedrückt. Verfolge den Strompfad durch S0.',
    inputs: [{ start: true, stop: true }],
  },
]
