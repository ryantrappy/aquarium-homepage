import { createFileRoute } from '@tanstack/react-router'
import { createCpuTemperatureStore, DEFAULT_CPU_TEMPERATURE_SENSOR_ID } from '../../../server/cpu-temperature'

const store = createCpuTemperatureStore({
  rootPath: process.env.REEF_CPU_HWMON_ROOT ?? '/run/host-sensors/coretemp.0',
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

export const Route = createFileRoute('/api/telemetry/cpu-temperature')({
  server: {
    handlers: {
      GET: createCpuTemperatureGetHandler(),
    },
  },
})
