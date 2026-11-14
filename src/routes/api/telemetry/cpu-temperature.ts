import { createFileRoute } from '@tanstack/react-router'
import { createCpuTemperatureStore, DEFAULT_CPU_TEMPERATURE_SENSOR_ID } from '../../../server/cpu-temperature'

export const DEFAULT_CPU_HWMON_ROOTS = [
  '/run/host-sensors/coretemp.0',
  '/sys/devices/platform/coretemp.0',
  '/sys/class/hwmon',
] as const

export function resolveCpuHwmonRoots(
  env: NodeJS.ProcessEnv = process.env,
): string | readonly string[] {
  const explicit = env.REEF_CPU_HWMON_ROOT?.trim()
  return explicit ? explicit : DEFAULT_CPU_HWMON_ROOTS
}

const store = createCpuTemperatureStore({
  rootPath: resolveCpuHwmonRoots(),
})

export function createCpuTemperatureGetHandler(
  source: ReturnType<typeof createCpuTemperatureStore> = store,
) {
  return async ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const sensorId = url.searchParams.get('sensorId') ?? DEFAULT_CPU_TEMPERATURE_SENSOR_ID
    const [sensors, reading] = await Promise.all([source.getSensors(), source.read(sensorId)])
    return Response.json({ sensors, reading }, { headers: { 'Cache-Control': 'no-store' } })
  }
}

export function createCpuTemperatureAnyHandler() {
  return async (_context: { request: Request }) => Response.json(
    { message: 'Method not allowed.' },
    { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } },
  )
}

export function createCpuTemperatureHandlers(
  source: ReturnType<typeof createCpuTemperatureStore> = store,
) {
  return {
    GET: createCpuTemperatureGetHandler(source),
    ANY: createCpuTemperatureAnyHandler(),
  }
}

export const Route = createFileRoute('/api/telemetry/cpu-temperature')({
  server: {
    handlers: createCpuTemperatureHandlers(),
  },
})
