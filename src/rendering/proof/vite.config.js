import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { createReadStream } from 'node:fs'
import { realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const proofRoot = fileURLToPath(new URL('.', import.meta.url))
const reviewDirectory = '/tmp/aq40-pipeline-review'

export default defineConfig({
  root: proofRoot,
  cacheDir: fileURLToPath(new URL('../../../node_modules/.vite-reef-study', import.meta.url)),
  server: { port: 5189, host: '127.0.0.1', strictPort: true },
  plugins: [{
    name: 'aq40-explicit-local-review',
    // Dev-only opt-in mount; never copies temporary files into a build.
    configureServer(server) {
      server.middlewares.use('/pipeline-review', async (request, response) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        if (!['GET', 'HEAD'].includes(request.method ?? '') || !/^\/(manifest\.json|[a-z0-9][a-z0-9-]*\.glb)$/.test(path)) {
          response.statusCode = 404; response.end(); return
        }
        try {
          const directory = await realpath(reviewDirectory)
          const file = await realpath(join(directory, path.slice(1)))
          if (dirname(file) !== directory) { response.statusCode = 404; response.end(); return }
          response.setHeader('Content-Type', path.endsWith('.glb') ? 'model/gltf-binary' : 'application/json')
          response.setHeader('Cache-Control', 'no-store')
          if (request.method === 'HEAD') { response.end(); return }
          const stream = createReadStream(file)
          stream.on('error', () => { response.destroy() }); stream.pipe(response)
        } catch {
          response.statusCode = 404; response.end('Review artifact unavailable')
        }
      })
    },
  }],
  build: {
    rollupOptions: {
      input: {
        engine: fileURLToPath(new URL('./engine-study.html', import.meta.url)),
        pipeline: fileURLToPath(new URL('./pipeline-study.html', import.meta.url)),
      },
    },
  },
})
