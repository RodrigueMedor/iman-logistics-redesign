import { Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

export function CountUp({ value, suffix = '', label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setCount(value); observer.disconnect(); return }
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 1000, 1)
        setCount(Math.round(value * (1 - Math.pow(1 - progress, 3))))
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      observer.disconnect()
    }, { threshold: .4 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [value])
  return <div ref={ref}><Typography variant="h2" fontWeight={900} color="secondary" lineHeight={1}>{count}{suffix}</Typography><Typography mt={1} color="rgba(255,255,255,.78)" fontWeight={700}>{label}</Typography></div>
}

