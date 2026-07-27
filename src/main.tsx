import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { ColorModeProvider } from './contexts/ColorModeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ContentProvider } from './contexts/ContentContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeProvider>
      <AuthProvider>
        <ContentProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ContentProvider>
      </AuthProvider>
    </ColorModeProvider>
  </React.StrictMode>,
)
