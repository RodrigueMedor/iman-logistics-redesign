// Production entry point (Hostinger Node.js app / pm2): serves the built
// website and the API from one process. Build first with `npm run build`.
// Hostinger's launcher loads this file with require(), which fails on an ESM
// graph with top-level await, so the server is loaded with a dynamic import.
import('./server/dist/index.js').catch(error => {
  console.error(error)
  process.exit(1)
})
