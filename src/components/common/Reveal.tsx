import { Box, type BoxProps } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

export function Reveal({ children, delay = 0, ...props }: BoxProps & { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.12 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <Box ref={ref} {...props} sx={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transition: `opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms`, ...props.sx }}>{children}</Box>
}

