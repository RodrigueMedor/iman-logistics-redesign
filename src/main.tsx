import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { ColorModeProvider } from './contexts/ColorModeContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ColorModeProvider>
  </React.StrictMode>,
)
