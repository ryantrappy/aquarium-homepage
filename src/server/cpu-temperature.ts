import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const DEFAULT_CPU_TEMPERATURE_SENSOR_ID = 'coretemp.0:package-id-0'

export type CpuTemperatureSensor = {
  id: string
  chip: 'coretemp'
  label: string
  unit: '°C'
}

export type CpuTemperatureReading =
  | {
      status: 'fresh' | 'stale'
      sensorId: string
      chip: 'coretemp'
      label: string
      value: number
      unit: '°C'
      observedAt: string
      ageMs: number
      message?: string
    }
  | {
      status: 'unavailable'
      sensorId: string
      unit: '°C'
      message: string
    }

type DiscoveredSensor = {
  descriptor: CpuTemperatureSensor
  inputPath: string
}

type LastSuccessfulSample = {
  value: number
  observedAtMs: number
  label: string
}

type CpuTemperatureStoreOptions = {
  rootPath: string
  now?: () => number
}

const packageLabel = /^Package id (\d+)$/i
const coreLabel = /^Core (\d+)$/i
const hwmonDirectory = /^hwmon\d+$/
const temperatureLabelFile = /^temp(\d+)_label$/
const stableSensorId = /^coretemp\.0:(?:package-id-\d+|core-\d+)$/

function stableLabelId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function isSupportedLabel(label: string) {
  return packageLabel.test(label) || coreLabel.test(label)
}

export function createCpuTemperatureStore({ rootPath, now = Date.now }: CpuTemperatureStoreOptions) {
  const lastSamples = new Map<string, LastSuccessfulSample>()

  async function discoverSensors(): Promise<DiscoveredSensor[]> {
    let hwmonEntries
    try {
      hwmonEntries = await readdir(join(rootPath, 'hwmon'), { withFileTypes: true })
    } catch {
      return []
    }

    const sensors: DiscoveredSensor[] = []
    for (const entry of hwmonEntries) {
      if (!entry.isDirectory() || !hwmonDirectory.test(entry.name)) continue
      const hwmonPath = join(rootPath, 'hwmon', entry.name)
      let chip: string
      let files: string[]
      try {
        chip = (await readFile(join(hwmonPath, 'name'), 'utf8')).trim()
        if (chip !== 'coretemp') continue
        files = await readdir(hwmonPath)
      } catch {
        continue
      }

      for (const file of files) {
        const match = temperatureLabelFile.exec(file)
        if (!match) continue
        const labelPath = join(hwmonPath, file)
        try {
          const label = (await readFile(labelPath, 'utf8')).trim()
          if (!isSupportedLabel(label)) continue
          const id = `coretemp.0:${stableLabelId(label)}`
          sensors.push({
            descriptor: { id, chip: 'coretemp', label, unit: '°C' },
            inputPath: join(hwmonPath, `temp${match[1]}_input`),
          })
        } catch {
          // A disappearing or unreadable sensor should not hide other sensors.
        }
      }
    }

    return sensors.sort((left, right) => left.descriptor.id.localeCompare(right.descriptor.id))
  }

  async function read(sensorId = DEFAULT_CPU_TEMPERATURE_SENSOR_ID): Promise<CpuTemperatureReading> {
    if (!stableSensorId.test(sensorId)) {
      return {
        status: 'unavailable',
        sensorId: 'unsupported',
        unit: '°C',
        message: 'The selected CPU temperature sensor is unavailable.',
      }
    }
    const sensor = (await discoverSensors()).find(({ descriptor }) => descriptor.id === sensorId)
    if (!sensor) return staleOrUnavailable(sensorId, 'The selected CPU temperature sensor is unavailable.')

    let milliCelsius: number
    try {
      const contents = (await readFile(sensor.inputPath, 'utf8')).trim()
      if (!/^-?\d+$/.test(contents)) throw new Error('Invalid temperature value')
      milliCelsius = Number(contents)
      if (!Number.isSafeInteger(milliCelsius) || milliCelsius < -40000 || milliCelsius > 150000) {
        throw new Error('Temperature value is outside the supported range')
      }
    } catch {
      return staleOrUnavailable(sensorId, 'The selected CPU temperature sensor could not be read.')
    }

    const observedAtMs = now()
    const value = milliCelsius / 1000
    lastSamples.set(sensorId, { value, observedAtMs, label: sensor.descriptor.label })
    return {
      status: 'fresh',
      sensorId,
      chip: sensor.descriptor.chip,
      label: sensor.descriptor.label,
      value,
      unit: '°C',
      observedAt: new Date(observedAtMs).toISOString(),
      ageMs: 0,
    }
  }

  function staleOrUnavailable(sensorId: string, message: string): CpuTemperatureReading {
    const previous = lastSamples.get(sensorId)
    if (!previous) return { status: 'unavailable', sensorId, unit: '°C', message }

    const observedAtMs = previous.observedAtMs
    return {
      status: 'stale',
      sensorId,
      chip: 'coretemp',
      label: previous.label,
      value: previous.value,
      unit: '°C',
      observedAt: new Date(observedAtMs).toISOString(),
      ageMs: Math.max(0, now() - observedAtMs),
      message,
    }
  }

  return {
    async getSensors(): Promise<CpuTemperatureSensor[]> {
      return (await discoverSensors()).map(({ descriptor }) => descriptor)
    },
    read,
  }
}
