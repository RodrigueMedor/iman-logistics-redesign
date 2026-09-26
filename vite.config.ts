import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  server: {
    // In development the API runs separately (npm run dev:api).
    proxy: { '/api': 'http://localhost:3001', '/runtime-config.js': 'http://localhost:3001' },
  },
})
