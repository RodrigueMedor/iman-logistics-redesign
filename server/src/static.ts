import fs from 'node:fs'
import path from 'node:path'
import express, { type Express } from 'express'
import { config } from './config'

// Browser settings the website needs at runtime. Only public values: the
// Supabase URL and publishable key are designed to be exposed.
export function runtimeConfigScript() {
  const value = { supabaseUrl: config.supabaseUrl, supabasePublishableKey: config.supabasePublishableKey, apiBaseUrl: '' }
  return `window.__IMAN_CONFIG__ = ${JSON.stringify(value).replace(/</g, '\\u003c')};\n`
}

// Serves the built React site from the same process as the API (the way the
// Iman Trucking School runs on Hostinger): hashed assets are cached for a year,
// index.html never is, and unknown page routes fall back to index.html so
// React Router can handle them.
export function serveWebsite(app: Express, distDir: string) {
  const indexFile = path.join(distDir, 'index.html')
  if (!fs.existsSync(indexFile)) {
    console.warn(`Website build not found at ${indexFile}; serving the API only. Run "npm run build".`)
    return false
  }

  app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }))
  app.use(express.static(distDir, { index: false, maxAge: '1h' }))

  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    // A missing file (has an extension) is a real 404, not a page route.
    if (path.extname(req.path)) return next()
    res.set('Cache-Control', 'no-cache').sendFile(indexFile)
  })
  return true
}

export const defaultDistDir = () => path.resolve(process.env.STATIC_DIR || path.join(process.cwd(), 'dist'))
