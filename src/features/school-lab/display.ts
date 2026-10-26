export const display = (n: number, digits = 3) =>
  n.toLocaleString('de', { useGrouping: false, maximumFractionDigits: digits })
