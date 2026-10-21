export const de = {
  brand: 'Voltwise',
  tagline: 'Verstehen. Anwenden. Weiterkommen.',
  local: 'Auf diesem Gerät gespeichert',
  sync: 'Cloud-Sync nicht eingerichtet',
} as const
export const formatNumber = (number: number, decimals = 0) =>
  number.toLocaleString('de-DE', { maximumFractionDigits: decimals })
export const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
