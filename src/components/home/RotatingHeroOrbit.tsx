import { Box } from '@mui/material'
import { keyframes } from '@mui/material/styles'
import type { ReactNode } from 'react'

const rotateClockwise = keyframes`
  from { transform: rotate(0deg) translateZ(0); }
  to { transform: rotate(360deg) translateZ(0); }
`

const rotateCounterClockwise = keyframes`
  from { transform: rotate(360deg) translateZ(0); }
  to { transform: rotate(0deg) translateZ(0); }
`

const breathe = keyframes`
  0%, 100% { opacity: .3; transform: scale(.96) translateZ(0); }
  50% { opacity: .62; transform: scale(1.04) translateZ(0); }
`

const ringBase = {
  position: 'absolute',
  inset: 0,
  m: 'auto',
  borderRadius: '50%',
  pointerEvents: 'none',
  backfaceVisibility: 'hidden',
  transformStyle: 'preserve-3d',
  willChange: 'transform',
} as const

export function RotatingHeroOrbit({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ position: 'relative', isolation: 'isolate' }}>
      <Box
        aria-hidden="true"
        data-testid="hero-rotating-orbit"
        sx={{
          position: 'absolute',
          zIndex: 2,
          left: '50%',
          top: '50%',
          width: { xs: '104%', sm: '108%', md: '112%', xl: '118%' },
          maxWidth: 560,
          aspectRatio: '1',
          transform: 'translate3d(-50%, -50%, 0)',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 0 15px rgba(255,255,255,.09))',
          '@media (prefers-reduced-motion: reduce)': {
            '& [data-orbit-layer]': { animation: 'none !important' },
          },
        }}
      >
        <Box
          data-orbit-layer="outer"
          sx={{
            ...ringBase,
            width: '100%',
            height: '100%',
            border: '1.5px dashed rgba(255,255,255,.30)',
            animation: `${rotateClockwise} 80s linear infinite`,
          }}
        >
          <OrbitDot top="7%" left="27%" size={8} glow />
          <OrbitDot top="68%" left="91%" size={6} />
          <OrbitDot top="91%" left="28%" size={5} />
        </Box>

        <Box
          data-orbit-layer="middle"
          sx={{
            ...ringBase,
            width: '84%',
            height: '84%',
            background: 'conic-gradient(from 35deg, transparent 0 8%, rgba(255,255,255,.46) 8% 23%, transparent 23% 47%, rgba(255,0,0,.78) 47% 50%, transparent 50% 78%, rgba(255,255,255,.25) 78% 91%, transparent 91%)',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))',
            animation: `${rotateCounterClockwise} 56s linear infinite`,
            opacity: .88,
          }}
        >
          <OrbitDot top="18%" left="9%" size={7} glow />
          <OrbitDot top="77%" left="88%" size={5} />
        </Box>

        <Box
          data-orbit-layer="inner"
          sx={{
            ...ringBase,
            width: '68%',
            height: '68%',
            border: '1px solid rgba(255,255,255,.22)',
            boxShadow: 'inset 0 0 24px rgba(255,255,255,.06), 0 0 22px rgba(255,255,255,.05)',
            animation: `${rotateClockwise} 38s linear infinite`,
            '&::before, &::after': {
              content: '""',
              position: 'absolute',
              width: 28,
              height: 2,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,.72)',
              boxShadow: '0 0 8px rgba(255,255,255,.42)',
            },
            '&::before': { top: '12%', right: '14%', transform: 'rotate(38deg)' },
            '&::after': { bottom: '11%', left: '16%', transform: 'rotate(32deg)', bgcolor: 'secondary.main', boxShadow: '0 0 9px rgba(255,0,0,.55)' },
          }}
        />

        <Box
          data-orbit-layer="decorative"
          sx={{
            ...ringBase,
            width: '49%',
            height: '49%',
            background: 'conic-gradient(from 120deg, rgba(255,255,255,.58) 0 7%, transparent 7% 30%, rgba(255,0,0,.7) 30% 34%, transparent 34% 66%, rgba(255,255,255,.34) 66% 82%, transparent 82%)',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))',
            animation: `${rotateCounterClockwise} 64s linear infinite`,
          }}
        />

        <Box
          data-orbit-layer="glow"
          sx={{
            ...ringBase,
            width: '34%',
            height: '34%',
            background: 'radial-gradient(circle, rgba(255,255,255,.15) 0, rgba(255,255,255,.04) 42%, transparent 72%)',
            animation: `${breathe} 6s ease-in-out infinite`,
            willChange: 'transform, opacity',
          }}
        />
      </Box>
      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
    </Box>
  )
}

function OrbitDot({ top, left, size, glow = false }: { top: string; left: string; size: number; glow?: boolean }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: glow ? 'secondary.main' : 'rgba(255,255,255,.78)',
        boxShadow: glow ? '0 0 7px 3px rgba(255,0,0,.30)' : '0 0 6px rgba(255,255,255,.45)',
      }}
    />
  )
}

