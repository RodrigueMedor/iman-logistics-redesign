import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material'
import type { PaletteMode } from '@mui/material'
import { createAppTheme } from '../theme'

type ColorModeValue = {
  mode: PaletteMode
  toggleMode: () => void
}

const ColorModeContext = createContext<ColorModeValue | undefined>(undefined)

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('iman-color-mode')
    return saved === 'light' || saved === 'dark' ? saved : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  useEffect(() => {
    if (!localStorage.getItem('iman-color-mode')) setMode(systemPrefersDark ? 'dark' : 'light')
  }, [systemPrefersDark])

  useEffect(() => {
    localStorage.setItem('iman-color-mode', mode)
    document.documentElement.dataset.colorMode = mode
  }, [mode])

  const value = useMemo(() => ({ mode, toggleMode: () => setMode(current => current === 'light' ? 'dark' : 'light') }), [mode])
  const theme = useMemo(() => createAppTheme(mode), [mode])

  return <ColorModeContext.Provider value={value}><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></ColorModeContext.Provider>
}

export function useColorMode() {
  const value = useContext(ColorModeContext)
  if (!value) throw new Error('useColorMode must be used inside ColorModeProvider')
  return value
}
