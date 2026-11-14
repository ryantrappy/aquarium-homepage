export const DEFAULT_CPU_TEMPERATURE_SENSOR_ID = 'coretemp.0:package-id-0'

export type CpuTemperatureChip = 'coretemp' | 'k10temp' | 'zenpower'

export type CpuTemperatureSensor = {
  id: string
  chip: CpuTemperatureChip
  label: string
  unit: '°C'
}

export type CpuTemperatureReading =
  | {
      status: 'fresh' | 'stale'
      sensorId: string
      chip: CpuTemperatureChip
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

export type CpuTemperatureTelemetryResponse = {
  sensors: CpuTemperatureSensor[]
  reading: CpuTemperatureReading
}

export type ThermometerPlacement = 'front' | 'side' | 'hidden'

export const DEFAULT_THERMOMETER_PLACEMENT: ThermometerPlacement = 'front'
export const THERMOMETER_PLACEMENT_STORAGE_KEY = 'aquarium.thermometer-placement'
export const THERMOMETER_SENSOR_STORAGE_KEY = 'aquarium.thermometer-sensor-id'
export const CPU_TEMPERATURE_POLL_INTERVAL_MS = 10_000

const SENSOR_ID_PATTERN = /^(?:coretemp\.0:(?:package-id-\d+|core-\d+)|(?:k10temp|zenpower)\.0:t(?:ctl|die))$/

export const THERMOMETER_PLACEMENT_OPTIONS: ReadonlyArray<{
  value: ThermometerPlacement
  label: string
  description: string
}> = [
  {
    value: 'front',
    label: 'Front glass',
    description: 'Mounted flush on the upper-left viewing pane.',
  },
  {
    value: 'side',
    label: 'Side glass',
    description: 'Angled along the left side wall inside the tank.',
  },
  {
    value: 'hidden',
    label: 'Hidden',
    description: 'Hide the thermometer from the aquarium view.',
  },
]

export type SegmentGlyph =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '-'
  | ' '

export type FormattedThermometerLcd = {
  cells: readonly [SegmentGlyph, SegmentGlyph, SegmentGlyph]
  showDecimal: boolean
  unit: '°C'
  displayValue: string
  status: 'fresh' | 'stale' | 'unavailable'
  statusText: string
  sensorText: string
  ariaText: string
}

export type ThermometerSensorOption = {
  id: string
  label: string
  available: boolean
}

function getBrowserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function isThermometerPlacement(value: unknown): value is ThermometerPlacement {
  return value === 'front' || value === 'side' || value === 'hidden'
}

export function normalizeThermometerPlacement(value: unknown): ThermometerPlacement {
  return isThermometerPlacement(value) ? value : DEFAULT_THERMOMETER_PLACEMENT
}

export function isValidCpuTemperatureSensorId(value: unknown): value is string {
  return typeof value === 'string' && SENSOR_ID_PATTERN.test(value.trim())
}

export function normalizeThermometerSensorId(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_CPU_TEMPERATURE_SENSOR_ID
  const trimmed = value.trim()
  return SENSOR_ID_PATTERN.test(trimmed) ? trimmed : DEFAULT_CPU_TEMPERATURE_SENSOR_ID
}

export function readThermometerPlacement(
  storage: Pick<Storage, 'getItem'> | null = getBrowserStorage(),
): ThermometerPlacement {
  try {
    return normalizeThermometerPlacement(storage?.getItem(THERMOMETER_PLACEMENT_STORAGE_KEY))
  } catch {
    return DEFAULT_THERMOMETER_PLACEMENT
  }
}

export function writeThermometerPlacement(
  placement: ThermometerPlacement,
  storage: Pick<Storage, 'setItem'> | null = getBrowserStorage(),
): void {
  try {
    storage?.setItem(THERMOMETER_PLACEMENT_STORAGE_KEY, normalizeThermometerPlacement(placement))
  } catch {
    // Ignore storage quota or private browsing write failures.
  }
}

export function readThermometerSensorId(
  storage: Pick<Storage, 'getItem'> | null = getBrowserStorage(),
): string {
  try {
    return normalizeThermometerSensorId(storage?.getItem(THERMOMETER_SENSOR_STORAGE_KEY))
  } catch {
    return DEFAULT_CPU_TEMPERATURE_SENSOR_ID
  }
}

export function writeThermometerSensorId(
  sensorId: string,
  storage: Pick<Storage, 'setItem'> | null = getBrowserStorage(),
): void {
  try {
    storage?.setItem(THERMOMETER_SENSOR_STORAGE_KEY, normalizeThermometerSensorId(sensorId))
  } catch {
    // Ignore storage quota or private browsing write failures.
  }
}

export function formatSensorShortLabel(sensorId: string): string {
  const normalized = normalizeThermometerSensorId(sensorId)
  const [, rawTarget] = normalized.split(':')
  const target = rawTarget ?? 'package-id-0'
  if (target.startsWith('package-id-')) {
    return `Package id ${target.slice('package-id-'.length)}`
  }
  if (target.startsWith('core-')) {
    return `Core ${target.slice('core-'.length)}`
  }
  if (target === 'tctl') {
    return 'Tctl'
  }
  if (target === 'tdie') {
    return 'Tdie'
  }
  return target
}

export function formatSensorFallbackLabel(sensorId: string): string {
  const normalized = normalizeThermometerSensorId(sensorId)
  const [chipInstance] = normalized.split(':')
  const chip = chipInstance ?? 'coretemp.0'
  return `${formatSensorShortLabel(normalized)} (${chip})`
}

export function formatStaleAge(ageMs: number): string {
  if (!Number.isFinite(ageMs) || ageMs <= 0) return '0s'
  const seconds = Math.round(ageMs / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  return `${hours}h`
}

function toGlyph(char: string): SegmentGlyph {
  if (
    char === '0' ||
    char === '1' ||
    char === '2' ||
    char === '3' ||
    char === '4' ||
    char === '5' ||
    char === '6' ||
    char === '7' ||
    char === '8' ||
    char === '9' ||
    char === '-' ||
    char === ' '
  ) {
    return char
  }
  return '-'
}

function formatNumericTemperature(value: number): {
  cells: readonly [SegmentGlyph, SegmentGlyph, SegmentGlyph]
  showDecimal: boolean
  displayValue: string
} | null {
  if (!Number.isFinite(value)) return null
  const roundedTenth = Math.round(value * 10) / 10
  if (roundedTenth >= 100) {
    const roundedInt = Math.round(value)
    if (roundedInt > 999) return null
    const text = String(roundedInt).padStart(3, ' ')
    return {
      cells: [toGlyph(text[0]!), toGlyph(text[1]!), toGlyph(text[2]!)],
      showDecimal: false,
      displayValue: `${roundedInt}°C`,
    }
  }
  if (roundedTenth <= -10) {
    const roundedInt = Math.round(value)
    if (roundedInt < -99) return null
    const absText = String(Math.abs(roundedInt)).padStart(2, ' ')
    return {
      cells: ['-', toGlyph(absText[0]!), toGlyph(absText[1]!)],
      showDecimal: false,
      displayValue: `${roundedInt}°C`,
    }
  }
  if (roundedTenth < 0) {
    const absFixed = Math.abs(roundedTenth).toFixed(1)
    const [ones, tenths] = absFixed.split('.')
    return {
      cells: ['-', toGlyph(ones!), toGlyph(tenths!)],
      showDecimal: true,
      displayValue: `-${ones}.${tenths}°C`,
    }
  }
  const fixed = roundedTenth.toFixed(1)
  const [whole, tenths] = fixed.split('.')
  const tens = whole!.length > 1 ? whole![0]! : ' '
  const ones = whole!.length > 1 ? whole![1]! : whole![0]!
  return {
    cells: [toGlyph(tens), toGlyph(ones), toGlyph(tenths!)],
    showDecimal: true,
    displayValue: `${whole}.${tenths}°C`,
  }
}

export function formatThermometerLcd(
  reading: CpuTemperatureReading | undefined,
  fallbackSensorId = DEFAULT_CPU_TEMPERATURE_SENSOR_ID,
): FormattedThermometerLcd {
  const targetSensorId = reading?.sensorId ?? fallbackSensorId
  const sensorShort = formatSensorShortLabel(targetSensorId)
  const sensorFallback = formatSensorFallbackLabel(targetSensorId)
  if (!reading || reading.status === 'unavailable') {
    const detail = reading?.message ?? 'Temperature sensor unavailable.'
    return {
      cells: ['-', '-', '-'],
      showDecimal: true,
      unit: '°C',
      displayValue: '--.-°C',
      status: 'unavailable',
      statusText: 'UNAVAILABLE',
      sensorText: sensorShort,
      ariaText: `CPU thermometer: --.-°C, unavailable for ${sensorFallback}. ${detail}`,
    }
  }

  const formatted = formatNumericTemperature(reading.value)
  if (!formatted) {
    return {
      cells: ['-', '-', '-'],
      showDecimal: true,
      unit: '°C',
      displayValue: '--.-°C',
      status: 'unavailable',
      statusText: 'UNAVAILABLE',
      sensorText: reading.label || sensorShort,
      ariaText: `CPU thermometer: --.-°C, unavailable for ${reading.label || sensorFallback}.`,
    }
  }

  const sensorText = reading.label || sensorShort
  if (reading.status === 'stale') {
    const ageLabel = formatStaleAge(reading.ageMs)
    return {
      ...formatted,
      unit: '°C',
      status: 'stale',
      statusText: `STALE · ${ageLabel}`,
      sensorText,
      ariaText: `CPU thermometer: ${formatted.displayValue}, stale reading (${ageLabel} old) from ${sensorText}.`,
    }
  }

  return {
    ...formatted,
    unit: '°C',
    status: 'fresh',
    statusText: 'LIVE',
    sensorText,
    ariaText: `CPU thermometer: ${formatted.displayValue}, live reading from ${sensorText}.`,
  }
}

export function buildCpuTemperatureSensorOptions(
  sensors: readonly CpuTemperatureSensor[],
  selectedSensorId: string,
): ThermometerSensorOption[] {
  const normalizedSelected = normalizeThermometerSensorId(selectedSensorId)
  const options: ThermometerSensorOption[] = sensors.map((sensor) => ({
    id: sensor.id,
    label: `${sensor.label} (${sensor.chip}.0 · ${sensor.unit})`,
    available: true,
  }))

  if (!options.some((option) => option.id === normalizedSelected)) {
    options.unshift({
      id: normalizedSelected,
      label: `${formatSensorFallbackLabel(normalizedSelected)} · unavailable`,
      available: false,
    })
  }

  return options
}

function isChip(value: unknown): value is CpuTemperatureChip {
  return value === 'coretemp' || value === 'k10temp' || value === 'zenpower'
}

function isReadingShape(value: unknown): value is CpuTemperatureReading {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (typeof record.sensorId !== 'string' || record.unit !== '°C') return false
  if (record.status === 'unavailable') {
    return typeof record.message === 'string'
  }
  if (record.status === 'fresh' || record.status === 'stale') {
    return (
      isChip(record.chip) &&
      typeof record.label === 'string' &&
      typeof record.value === 'number' &&
      Number.isFinite(record.value) &&
      typeof record.observedAt === 'string' &&
      typeof record.ageMs === 'number'
    )
  }
  return false
}

function isSensorShape(value: unknown): value is CpuTemperatureSensor {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    isChip(record.chip) &&
    typeof record.label === 'string' &&
    record.unit === '°C'
  )
}

export async function fetchCpuTemperatureTelemetry(
  sensorId: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<CpuTemperatureTelemetryResponse> {
  const normalizedId = normalizeThermometerSensorId(sensorId)
  try {
    const response = await fetchImpl(
      `/api/telemetry/cpu-temperature?sensorId=${encodeURIComponent(normalizedId)}`,
      {
        method: 'GET',
        cache: 'no-store',
        signal,
      },
    )
    if (!response.ok) {
      return {
        sensors: [],
        reading: {
          status: 'unavailable',
          sensorId: normalizedId,
          unit: '°C',
          message: `Temperature endpoint returned HTTP ${response.status}.`,
        },
      }
    }
    const payload: unknown = await response.json()
    if (!payload || typeof payload !== 'object') {
      throw new Error('Malformed telemetry payload')
    }
    const record = payload as Record<string, unknown>
    const sensors = Array.isArray(record.sensors) ? record.sensors.filter(isSensorShape) : []
    const reading: CpuTemperatureReading = isReadingShape(record.reading)
      ? record.reading
      : {
          status: 'unavailable',
          sensorId: normalizedId,
          unit: '°C',
          message: 'Temperature payload did not contain a valid reading.',
        }
    return { sensors, reading }
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error
    }
    return {
      sensors: [],
      reading: {
        status: 'unavailable',
        sensorId: normalizedId,
        unit: '°C',
        message: 'Could not reach the temperature telemetry endpoint.',
      },
    }
  }
}

export function startCpuTemperaturePolling({
  sensorId,
  intervalMs = CPU_TEMPERATURE_POLL_INTERVAL_MS,
  fetchImpl = fetch,
  onTelemetry,
}: {
  sensorId: string
  intervalMs?: number
  fetchImpl?: typeof fetch
  onTelemetry: (telemetry: CpuTemperatureTelemetryResponse) => void
}): () => void {
  let active = true
  let controller = new AbortController()

  const poll = async () => {
    controller.abort()
    controller = new AbortController()
    try {
      const telemetry = await fetchCpuTemperatureTelemetry(sensorId, fetchImpl, controller.signal)
      if (active) onTelemetry(telemetry)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (controller.signal.aborted) return
    }
  }

  void poll()
  const timer = window.setInterval(() => {
    if (!document.hidden) void poll()
  }, intervalMs)

  const onVisibilityChange = () => {
    if (!document.hidden) void poll()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    active = false
    controller.abort()
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
