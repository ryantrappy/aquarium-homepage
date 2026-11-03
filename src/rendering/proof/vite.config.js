import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const proofRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: proofRoot,
  server: { port: 5188, host: '127.0.0.1' },
  build: {
    rollupOptions: {
      input: fileURLToPath(new URL('./engine-study.html', import.meta.url)),
    },
  },
})
