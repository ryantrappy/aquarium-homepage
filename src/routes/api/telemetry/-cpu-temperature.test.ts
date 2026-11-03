import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCpuTemperatureStore } from '../../../server/cpu-temperature'
import { createCpuTemperatureGetHandler } from './cpu-temperature'

const roots: string[] = []

async function makeSource() {
  const rootPath = await mkdtemp(join(tmpdir(), 'reef-cpu-temperature-route-'))
  roots.push(rootPath)
  const hwmonPath = join(rootPath, 'hwmon', 'hwmon4')
  await mkdir(hwmonPath, { recursive: true })
  await writeFile(join(hwmonPath, 'name'), 'coretemp\n')
  await writeFile(join(hwmonPath, 'temp1_label'), 'Package id 0\n')
  await writeFile(join(hwmonPath, 'temp1_input'), '44750\n')
  await writeFile(join(hwmonPath, 'temp2_label'), 'Core 0\n')
  await writeFile(join(hwmonPath, 'temp2_input'), '46125\n')
  return createCpuTemperatureStore({ rootPath, now: () => 1_800_000_000_000 })
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((rootPath) => rm(rootPath, { recursive: true, force: true })))
})

describe('CPU temperature API handler', () => {
  it('returns discovered sensors and the selected live measurement without caching', async () => {
    const handler = createCpuTemperatureGetHandler(await makeSource())
    const response = await handler({ request: new Request('http://reef-control/api/telemetry/cpu-temperature?sensorId=coretemp.0%3Acore-0') })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      sensors: [
        { id: 'coretemp.0:core-0', chip: 'coretemp', label: 'Core 0', unit: '°C' },
        { id: 'coretemp.0:package-id-0', chip: 'coretemp', label: 'Package id 0', unit: '°C' },
      ],
      reading: {
        status: 'fresh',
        sensorId: 'coretemp.0:core-0',
        chip: 'coretemp',
        label: 'Core 0',
        value: 46.125,
        unit: '°C',
        observedAt: '2027-01-15T08:00:00.000Z',
        ageMs: 0,
      },
    })
  })
})
