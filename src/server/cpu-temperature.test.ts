import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCpuTemperatureStore } from './cpu-temperature'

const roots: string[] = []

async function makeSensor({
  hwmon = 'hwmon2',
  chip = 'coretemp',
  label = 'Package id 0',
  value = '42000',
}: { hwmon?: string; chip?: string; label?: string; value?: string } = {}) {
  const rootPath = await mkdtemp(join(tmpdir(), 'reef-cpu-temperature-'))
  roots.push(rootPath)
  const hwmonPath = join(rootPath, 'hwmon', hwmon)
  await mkdir(hwmonPath, { recursive: true })
  await writeFile(join(hwmonPath, 'name'), `${chip}\n`)
  await writeFile(join(hwmonPath, 'temp1_label'), `${label}\n`)
  await writeFile(join(hwmonPath, 'temp1_input'), `${value}\n`)
  return { rootPath, inputPath: join(hwmonPath, 'temp1_input') }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((rootPath) => rm(rootPath, { recursive: true, force: true })))
})

describe('CPU temperature source', () => {
  it('discovers package and core sensors with IDs independent of hwmon numbering', async () => {
    const first = await makeSensor({ hwmon: 'hwmon2' })
    const firstStore = createCpuTemperatureStore({ rootPath: first.rootPath, now: () => 1_800_000_000_000 })
    await writeFile(join(first.rootPath, 'hwmon', 'hwmon2', 'temp2_label'), 'Core 0\n')
    await writeFile(join(first.rootPath, 'hwmon', 'hwmon2', 'temp2_input'), '43750\n')

    const second = await makeSensor({ hwmon: 'hwmon9' })
    const secondStore = createCpuTemperatureStore({ rootPath: second.rootPath })

    expect(await firstStore.getSensors()).toEqual([
      { id: 'coretemp.0:core-0', chip: 'coretemp', label: 'Core 0', unit: '°C' },
      { id: 'coretemp.0:package-id-0', chip: 'coretemp', label: 'Package id 0', unit: '°C' },
    ])
    expect((await secondStore.getSensors())[0]?.id).toBe('coretemp.0:package-id-0')

    const reading = await firstStore.read()
    expect(reading).toMatchObject({
      status: 'fresh',
      sensorId: 'coretemp.0:package-id-0',
      chip: 'coretemp',
      label: 'Package id 0',
      value: 42,
      unit: '°C',
      observedAt: '2027-01-15T08:00:00.000Z',
      ageMs: 0,
    })
  })

  it('returns a stale last-known measurement with age when the source stops reading', async () => {
    const sensor = await makeSensor({ value: '43125' })
    let clock = 1_800_000_000_000
    const store = createCpuTemperatureStore({ rootPath: sensor.rootPath, now: () => clock })

    expect((await store.read()).status).toBe('fresh')
    clock += 5_250
    await rm(sensor.inputPath)

    expect(await store.read()).toMatchObject({
      status: 'stale',
      value: 43.125,
      label: 'Package id 0',
      ageMs: 5_250,
      message: 'The selected CPU temperature sensor could not be read.',
    })
  })

  it('returns unavailable without a healthy-looking fallback before any valid sample', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'reef-cpu-temperature-empty-'))
    roots.push(rootPath)
    const store = createCpuTemperatureStore({ rootPath })

    expect(await store.read()).toMatchObject({
      status: 'unavailable',
      sensorId: 'coretemp.0:package-id-0',
      unit: '°C',
    })
    expect((await store.read()) as object).not.toHaveProperty('value')
  })

  it('rejects unrecognized sensors, non-numeric sysfs values, and out-of-range values', async () => {
    const wrongChip = await makeSensor({ chip: 'nvme', label: 'Composite' })
    const wrongChipStore = createCpuTemperatureStore({ rootPath: wrongChip.rootPath })
    expect((await wrongChipStore.read()).status).toBe('unavailable')

    const invalid = await makeSensor({ value: '-ENODATA' })
    const invalidStore = createCpuTemperatureStore({ rootPath: invalid.rootPath })
    expect((await invalidStore.read()).status).toBe('unavailable')

    await writeFile(invalid.inputPath, '999999\n')
    expect((await invalidStore.read()).status).toBe('unavailable')
  })

  it('does not resolve a sensor ID as a filesystem path', async () => {
    const sensor = await makeSensor()
    const store = createCpuTemperatureStore({ rootPath: sensor.rootPath })

    expect(await store.read('../../etc/passwd')).toMatchObject({
      status: 'unavailable',
      sensorId: 'unsupported',
    })
  })
})
