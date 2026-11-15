import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

const repoRoot = '/Users/ryantrapp/Desktop/Code/aquarium-homepage'
const sourcePath = `${repoRoot}/src/server/cpu-temperature.ts`
const expectedHash = '059702b3abc1a818f1680fdfe460bc4826ee10ba502ff67ab67dfb1853fc90f1'
const source = readFileSync(sourcePath, 'utf8')
const sourceHash = createHash('sha256').update(source).digest('hex')
if (sourceHash !== expectedHash) throw new Error(`AQ-15 reader source changed: ${sourceHash}`)
const jiti = createRequire(`${repoRoot}/package.json`)('jiti')
const transform = jiti.createJiti(import.meta.url).transform({
  source,
  filename: 'cpu-temperature.ts',
  ts: true,
  async: false,
})

function readRemoteSensor(sensorId) {
  const bootstrap = `${transform}\nconst store = createCpuTemperatureStore({ rootPath: ['/run/host-sensors/coretemp.0', '/sys/devices/platform/coretemp.0', '/sys/class/hwmon'] });\nPromise.all([store.getSensors(), store.read(${JSON.stringify(sensorId)})]).then(([sensors, reading]) => console.log(JSON.stringify({ sensors, reading })));\n`
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', [
      '-oBatchMode=yes',
      '-oConnectTimeout=5',
      'trappserv.er',
      'docker exec -i aquarium-homepage node --input-type=commonjs',
    ], { stdio: ['pipe', 'pipe', 'pipe'] })
    const stdout = []
    const stderr = []
    const timeout = setTimeout(() => child.kill('SIGTERM'), 12000)
    child.stdout.on('data', (chunk) => stdout.push(chunk))
    child.stderr.on('data', (chunk) => stderr.push(chunk))
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code, signal) => {
      clearTimeout(timeout)
      const output = Buffer.concat(stdout).toString('utf8').trim()
      if (code !== 0) {
        reject(new Error(`Read-only sensor bridge failed (${code ?? signal}): ${Buffer.concat(stderr).toString('utf8').trim()}`))
        return
      }
      try {
        resolve(JSON.parse(output))
      } catch (error) {
        reject(new Error(`Sensor bridge returned invalid JSON: ${String(error)}`))
      }
    })
    child.stdin.end(bootstrap)
  })
}

export function aq15LiveReaderVitePlugin() {
  return {
    name: 'aq15-live-reader-readonly-bridge',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url || '/', 'http://localhost')
        if (url.pathname !== '/api/telemetry/cpu-temperature') return next()
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.setHeader('Allow', 'GET, HEAD')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify({ message: 'Method not allowed.' }))
          return
        }
        const sensorId = url.searchParams.get('sensorId') || 'coretemp.0:package-id-0'
        void readRemoteSensor(sensorId).then((result) => {
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify(result))
        }).catch((error) => {
          response.statusCode = 502
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify({ message: String(error) }))
        })
      })
    },
  }
}
