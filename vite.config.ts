import { defineConfig } from 'vite'

// No backend, no API keys — pure static Three.js frontend.
// Honour a PORT from the environment (used by the preview harness); fall back
// to Vite's default otherwise.
const port = process.env.PORT ? Number(process.env.PORT) : 5173

export default defineConfig({
  server: { port, strictPort: false },
  build: { target: 'es2020' }
})
