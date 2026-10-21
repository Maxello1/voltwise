export function parallelCircuit(voltage: number, resistances: number[]) {
  if (
    !Number.isFinite(voltage) ||
    voltage < 0 ||
    !resistances.length ||
    resistances.some((r) => !Number.isFinite(r) || r <= 0)
  ) {
    throw new Error('Spannung und Widerstände müssen endliche, gültige Werte sein.')
  }
  const branchCurrents = resistances.map((r) => voltage / r)
  const equivalentResistance = 1 / resistances.reduce((sum, r) => sum + 1 / r, 0)
  const totalCurrent = branchCurrents.reduce((sum, i) => sum + i, 0)
  return { branchCurrents, totalCurrent, equivalentResistance, totalPower: voltage * totalCurrent }
}
