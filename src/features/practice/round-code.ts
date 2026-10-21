export function newRoundCode(previous?: string) {
  const random = crypto.getRandomValues(new Uint32Array(1))[0]! % 1000000
  const next = String(random).padStart(6, '0')
  return next === previous ? String((random + 1) % 1000000).padStart(6, '0') : next
}
