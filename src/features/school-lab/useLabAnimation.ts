import { useEffect, useState } from 'react'

export function useLabAnimation(playing: boolean, onTick: () => void) {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!playing || reduced) return
    const timer = window.setInterval(onTick, 80)
    return () => window.clearInterval(timer)
  }, [playing, reduced, onTick])
  return reduced
}
