import { createTheme, type PaletteMode } from '@mui/material/styles'

export const createAppTheme = (mode: PaletteMode) => createTheme({
  palette: {
    mode,
    primary: mode === 'light'
      ? { main: '#0A005A', dark: '#000081', contrastText: '#FFFFFF' }
      : { main: '#AAB4FF', dark: '#7D89F5', contrastText: '#090B18' },
    secondary: mode === 'light'
      ? { main: '#E00000', contrastText: '#FFFFFF' }
      : { main: '#FF6B6B', contrastText: '#140000' },
    text: mode === 'light'
      ? { primary: '#080808', secondary: '#54595F' }
      : { primary: '#F5F6FF', secondary: '#B9BED1' },
    background: mode === 'light'
      ? { default: '#FFFFFF', paper: '#FFFFFF' }
      : { default: '#0C0E17', paper: '#151824' },
    divider: mode === 'light' ? '#E4E7EC' : '#303547',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700, lineHeight: 1.18 },
    h3: { fontWeight: 700, lineHeight: 1.25 },
    body1: { fontSize: '1rem', lineHeight: 1.75 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { colorScheme: mode },
        body: { transition: 'background-color .25s ease, color .25s ease' },
        '*:focus-visible': { outline: `3px solid ${mode === 'light' ? '#605BE5' : '#AAB4FF'}`, outlineOffset: 2 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 4, padding: '11px 28px' },
      },
    },
    MuiContainer: {
      defaultProps: { maxWidth: 'lg' },
    },
    MuiCard: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
})
