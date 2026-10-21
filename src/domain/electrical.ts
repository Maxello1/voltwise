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
  if (
    ![equivalentResistance, totalCurrent, voltage * totalCurrent, ...branchCurrents].every(
      Number.isFinite,
    ) ||
    equivalentResistance <= 0
  )
    throw new Error('Rechenergebnis außerhalb des unterstützten Bereichs.')
  return { branchCurrents, totalCurrent, equivalentResistance, totalPower: voltage * totalCurrent }
}

export function seriesCircuit(voltage: number, resistances: number[]) {
  if (
    !Number.isFinite(voltage) ||
    voltage < 0 ||
    !resistances.length ||
    resistances.some((r) => !Number.isFinite(r) || r <= 0)
  ) {
    throw new Error('Spannung und Widerstände müssen endliche, gültige Werte sein.')
  }
  const equivalentResistance = resistances.reduce((sum, resistance) => sum + resistance, 0)
  if (!Number.isFinite(equivalentResistance))
    throw new Error('Widerstandssumme außerhalb des unterstützten Bereichs.')
  const totalCurrent = voltage / equivalentResistance
  const voltageDrops = resistances.map((resistance) => totalCurrent * resistance)
  const powers = voltageDrops.map((drop) => drop * totalCurrent)
  if (![totalCurrent, voltage * totalCurrent, ...voltageDrops, ...powers].every(Number.isFinite))
    throw new Error('Rechenergebnis außerhalb des unterstützten Bereichs.')
  return {
    equivalentResistance,
    totalCurrent,
    voltageDrops,
    powers,
    totalPower: voltage * totalCurrent,
  }
}

export function unloadedVoltageDivider(
  voltage: number,
  upperResistance: number,
  lowerResistance: number,
) {
  const result = seriesCircuit(voltage, [upperResistance, lowerResistance])
  return { ...result, outputVoltage: result.voltageDrops[1]! }
}
