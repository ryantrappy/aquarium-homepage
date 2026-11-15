// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CPU_TEMPERATURE_SENSOR_ID,
  DEFAULT_THERMOMETER_PLACEMENT,
  THERMOMETER_PLACEMENT_STORAGE_KEY,
  THERMOMETER_SENSOR_STORAGE_KEY,
  buildCpuTemperatureSensorOptions,
  fetchCpuTemperatureTelemetry,
  formatSensorFallbackLabel,
  formatStaleAge,
  formatThermometerLcd,
  isThermometerPlacement,
  isValidCpuTemperatureSensorId,
  normalizeThermometerPlacement,
  normalizeThermometerSensorId,
  readThermometerPlacement,
  readThermometerSensorId,
  startCpuTemperaturePolling,
  writeThermometerPlacement,
  writeThermometerSensorId,
} from './thermometer-settings'

describe('thermometer settings validation and persistence', () => {
  it('validates and defaults placement values', () => {
    expect(DEFAULT_THERMOMETER_PLACEMENT).toBe('front')
    expect(isThermometerPlacement('front')).toBe(true)
    expect(isThermometerPlacement('side')).toBe(true)
    expect(isThermometerPlacement('hidden')).toBe(true)
    expect(isThermometerPlacement('top')).toBe(false)

    expect(normalizeThermometerPlacement('side')).toBe('side')
    expect(normalizeThermometerPlacement('hidden')).toBe('hidden')
    expect(normalizeThermometerPlacement('bogus')).toBe('front')
    expect(normalizeThermometerPlacement(null)).toBe('front')
  })

  it('validates and normalizes CPU temperature sensor IDs', () => {
    expect(isValidCpuTemperatureSensorId('coretemp.0:package-id-0')).toBe(true)
    expect(isValidCpuTemperatureSensorId('coretemp.0:core-12')).toBe(true)
    expect(isValidCpuTemperatureSensorId('k10temp.0:tctl')).toBe(true)
    expect(isValidCpuTemperatureSensorId('zenpower.0:tdie')).toBe(true)
    expect(isValidCpuTemperatureSensorId('../etc/passwd')).toBe(false)
    expect(isValidCpuTemperatureSensorId('lm75.0:temp1')).toBe(false)

    expect(normalizeThermometerSensorId('  k10temp.0:tctl  ')).toBe('k10temp.0:tctl')
    expect(normalizeThermometerSensorId('bad:sensor')).toBe(DEFAULT_CPU_TEMPERATURE_SENSOR_ID)
    expect(normalizeThermometerSensorId(undefined)).toBe(DEFAULT_CPU_TEMPERATURE_SENSOR_ID)
  })

  it('reads and writes placement and sensor ID cleanly when storage works or throws', () => {
    const store = new Map<string, string>()
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    }

    expect(readThermometerPlacement(mockStorage)).toBe('front')
    expect(readThermometerSensorId(mockStorage)).toBe(DEFAULT_CPU_TEMPERATURE_SENSOR_ID)

    writeThermometerPlacement('side', mockStorage)
    writeThermometerSensorId('zenpower.0:tdie', mockStorage)
    expect(store.get(THERMOMETER_PLACEMENT_STORAGE_KEY)).toBe('side')
    expect(store.get(THERMOMETER_SENSOR_STORAGE_KEY)).toBe('zenpower.0:tdie')
    expect(readThermometerPlacement(mockStorage)).toBe('side')
    expect(readThermometerSensorId(mockStorage)).toBe('zenpower.0:tdie')

    const brokenStorage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('quota') },
    }
    expect(readThermometerPlacement(brokenStorage)).toBe('front')
    expect(readThermometerSensorId(brokenStorage)).toBe(DEFAULT_CPU_TEMPERATURE_SENSOR_ID)
    expect(() => writeThermometerPlacement('hidden', brokenStorage)).not.toThrow()
    expect(() => writeThermometerSensorId('k10temp.0:tctl', brokenStorage)).not.toThrow()
    expect(readThermometerPlacement(null)).toBe('front')
  })
})

describe('thermometer LCD formatting and stale/unavailable truth', () => {
  it('formats fresh readings as XX.X 7-segment cells matching the LCD photo layout', () => {
    const lcd = formatThermometerLcd({
      status: 'fresh',
      sensorId: 'coretemp.0:package-id-0',
      chip: 'coretemp',
      label: 'Package id 0',
      value: 28.14,
      unit: '°C',
      observedAt: '2026-11-14T20:00:00.000Z',
      ageMs: 400,
    })

    expect(lcd.cells).toEqual(['2', '8', '1'])
    expect(lcd.showDecimal).toBe(true)
    expect(lcd.displayValue).toBe('28.1°C')
    expect(lcd.status).toBe('fresh')
    expect(lcd.statusText).toBe('LIVE')
    expect(lcd.sensorText).toBe('Package id 0')
    expect(lcd.ariaText).toContain('28.1°C')
  })

  it('handles single-digit, >= 100°C, and negative temperatures without overflowing 3 cells', () => {
    const cool = formatThermometerLcd({
      status: 'fresh',
      sensorId: 'coretemp.0:core-0',
      chip: 'coretemp',
      label: 'Core 0',
      value: 8.96,
      unit: '°C',
      observedAt: '2026-11-14T20:00:00.000Z',
      ageMs: 100,
    })
    expect(cool.cells).toEqual([' ', '9', '0'])
    expect(cool.showDecimal).toBe(true)
    expect(cool.displayValue).toBe('9.0°C')

    const hot = formatThermometerLcd({
      status: 'fresh',
      sensorId: 'k10temp.0:tctl',
      chip: 'k10temp',
      label: 'Tctl',
      value: 100.4,
      unit: '°C',
      observedAt: '2026-11-14T20:00:00.000Z',
      ageMs: 100,
    })
    expect(hot.cells).toEqual(['1', '0', '0'])
    expect(hot.showDecimal).toBe(false)
    expect(hot.displayValue).toBe('100°C')

    const subzero = formatThermometerLcd({
      status: 'fresh',
      sensorId: 'k10temp.0:tctl',
      chip: 'k10temp',
      label: 'Tctl',
      value: -4.2,
      unit: '°C',
      observedAt: '2026-11-14T20:00:00.000Z',
      ageMs: 100,
    })
    expect(subzero.cells).toEqual(['-', '4', '2'])
    expect(subzero.showDecimal).toBe(true)
    expect(subzero.displayValue).toBe('-4.2°C')
  })

  it('clearly flags stale readings with their age and keeps last known value', () => {
    expect(formatStaleAge(45_000)).toBe('45s')
    expect(formatStaleAge(185_000)).toBe('3m')
    expect(formatStaleAge(7_200_000)).toBe('2h')

    const stale = formatThermometerLcd({
      status: 'stale',
      sensorId: 'coretemp.0:package-id-0',
      chip: 'coretemp',
      label: 'Package id 0',
      value: 54.6,
      unit: '°C',
      observedAt: '2026-11-14T19:57:00.000Z',
      ageMs: 180_000,
      message: 'Showing cached reading because sysfs read failed.',
    })

    expect(stale.cells).toEqual(['5', '4', '6'])
    expect(stale.displayValue).toBe('54.6°C')
    expect(stale.status).toBe('stale')
    expect(stale.statusText).toBe('STALE · 3m')
    expect(stale.ariaText).toContain('stale reading (3m old)')
  })

  it('renders --.-°C and UNAVAILABLE when telemetry is missing or unavailable', () => {
    const missing = formatThermometerLcd(undefined, 'k10temp.0:tctl')
    expect(missing.cells).toEqual(['-', '-', '-'])
    expect(missing.showDecimal).toBe(true)
    expect(missing.displayValue).toBe('--.-°C')
    expect(missing.status).toBe('unavailable')
    expect(missing.statusText).toBe('UNAVAILABLE')
    expect(missing.sensorText).toBe('Tctl')
    expect(missing.ariaText).toContain('Tctl (k10temp.0)')

    const unavailable = formatThermometerLcd({
      status: 'unavailable',
      sensorId: 'coretemp.0:package-id-0',
      unit: '°C',
      message: 'No Linux hwmon CPU temperature sensor was found.',
    })
    expect(unavailable.cells).toEqual(['-', '-', '-'])
    expect(unavailable.displayValue).toBe('--.-°C')
    expect(unavailable.status).toBe('unavailable')
    expect(unavailable.statusText).toBe('UNAVAILABLE')
    expect(unavailable.ariaText).toContain('unavailable')
  })
})

describe('sensor options and read-only GET telemetry fetch', () => {
  it('builds sensor select options and includes offline selected fallback', () => {
    expect(formatSensorFallbackLabel('coretemp.0:core-3')).toBe('Core 3 (coretemp.0)')

    const withSelectedOffline = buildCpuTemperatureSensorOptions(
      [{ id: 'coretemp.0:package-id-0', chip: 'coretemp', label: 'Package id 0', unit: '°C' }],
      'k10temp.0:tctl',
    )
    expect(withSelectedOffline).toEqual([
      { id: 'k10temp.0:tctl', label: 'Tctl (k10temp.0) · unavailable', available: false },
      { id: 'coretemp.0:package-id-0', label: 'Package id 0 (coretemp.0 · °C)', available: true },
    ])
  })

  it('performs strictly GET no-store requests and falls back cleanly on HTTP/network errors', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          sensors: [{ id: 'coretemp.0:package-id-0', chip: 'coretemp', label: 'Package id 0', unit: '°C' }],
          reading: {
            status: 'fresh',
            sensorId: 'coretemp.0:package-id-0',
            chip: 'coretemp',
            label: 'Package id 0',
            value: 27.5,
            unit: '°C',
            observedAt: '2026-11-14T20:00:00.000Z',
            ageMs: 0,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await fetchCpuTemperatureTelemetry('coretemp.0:package-id-0', mockFetch)
    expect(mockFetch).toHaveBeenCalledExactlyOnceWith(
      '/api/telemetry/cpu-temperature?sensorId=coretemp.0%3Apackage-id-0',
      { method: 'GET', cache: 'no-store', signal: undefined },
    )
    expect(result.reading.status).toBe('fresh')

    const failingFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))
    const failed = await fetchCpuTemperatureTelemetry('bad:id', failingFetch)
    expect(failed.sensors).toEqual([])
    expect(failed.reading).toEqual({
      status: 'unavailable',
      sensorId: DEFAULT_CPU_TEMPERATURE_SENSOR_ID,
      unit: '°C',
      message: 'Could not reach the temperature telemetry endpoint.',
    })
  })

  it('polls read-only telemetry on mount, intervals when visible, and stops after cleanup', async () => {
    vi.useFakeTimers()
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
    let hidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })

    try {
      const mockFetch = vi.fn<typeof fetch>().mockImplementation(async () =>
        new Response(
          JSON.stringify({
            sensors: [],
            reading: {
              status: 'fresh',
              sensorId: DEFAULT_CPU_TEMPERATURE_SENSOR_ID,
              chip: 'coretemp',
              label: 'Package id 0',
              value: 29.4,
              unit: '°C',
              observedAt: '2026-11-14T20:00:00.000Z',
              ageMs: 0,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

      const onTelemetry = vi.fn()
      const stop = startCpuTemperaturePolling({
        sensorId: DEFAULT_CPU_TEMPERATURE_SENSOR_ID,
        intervalMs: 1000,
        fetchImpl: mockFetch,
        onTelemetry,
      })

      await vi.waitFor(() => expect(onTelemetry).toHaveBeenCalledTimes(1))

      await vi.advanceTimersByTimeAsync(1000)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      hidden = true
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      hidden = false
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3))

      stop()
      await vi.advanceTimersByTimeAsync(2000)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    } finally {
      if (hiddenDescriptor) {
        Object.defineProperty(document, 'hidden', hiddenDescriptor)
      } else {
        delete (document as unknown as Record<string, unknown>).hidden
      }
      vi.useRealTimers()
    }
  })
})
