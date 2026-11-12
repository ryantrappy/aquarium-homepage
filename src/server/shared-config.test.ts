import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EXAMPLE_SERVICES } from '../lib/services'
import { ConfigConflictError, ConfigUnavailableError, createSharedConfigStore } from './shared-config'

const directories: string[] = []

async function temporaryStore() {
  const directory = await mkdtemp(join(tmpdir(), 'reef-config-'))
  directories.push(directory)
  const filePath = join(directory, 'settings', 'config.json')
  const store = createSharedConfigStore(filePath, { version: 1, mode: 'reef', services: EXAMPLE_SERVICES })
  return { directory, filePath, store }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('shared config file store', () => {
  it('uses and persists the approved real starter roster when a fresh checkout has no saved config', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'reef-config-default-'))
    directories.push(directory)
    const filePath = join(directory, 'settings', 'config.json')
    const store = createSharedConfigStore(filePath)

    const initial = await store.read()
    expect(initial.config).toMatchObject({ version: 1, mode: 'reef' })
    expect(initial.config.services.map(({ name, url, fishId, isExample }) => ({ name, url, fishId, isExample }))).toEqual([
      { name: 'Komodo', url: 'https://komodo.ryantr.app', fishId: 'yellow-tang', isExample: false },
      { name: 'WatchMyBirds', url: 'https://watchmybirds.ryantr.app', fishId: 'banggai-cardinalfish', isExample: false },
      { name: 'Paperless', url: 'https://paperless.ryantr.app', fishId: 'royal-gramma', isExample: false },
      { name: 'Home Assistant', url: 'https://ha.ryantr.app', fishId: 'ocellaris-clownfish', isExample: false },
      { name: 'Ombi', url: 'https://ombi.ryantr.app', fishId: 'blue-tang', isExample: false },
    ])

    const persisted = await store.write(initial.config, initial.revision)
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual(persisted.config)
    expect((await store.read()).config).toEqual(persisted.config)
  })

  it('seeds a versioned reef config and atomically persists a successful update', async () => {
    const { filePath, store } = await temporaryStore()
    const initial = await store.read()
    expect(initial.config).toMatchObject({ version: 1, mode: 'reef', services: EXAMPLE_SERVICES })

    const nextConfig = { ...initial.config, services: [] }
    const saved = await store.write(nextConfig, initial.revision)
    expect(saved.config.services).toEqual([])
    expect(saved.revision).not.toBe(initial.revision)
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual(nextConfig)
    expect(await readdir(join(filePath, '..'))).toEqual(['config.json'])
  })

  it('rejects stale revisions and returns the current shared config', async () => {
    const { store } = await temporaryStore()
    const original = await store.read()
    await store.write({ ...original.config, services: [] }, original.revision)

    await expect(store.write(original.config, original.revision)).rejects.toMatchObject({
      name: 'ConfigConflictError',
      current: { config: { services: [] } },
    })
  })

  it('rejects a reset from a stale browser without replacing the newer config', async () => {
    const { filePath, store } = await temporaryStore()
    const original = await store.read()
    const current = await store.write({ ...original.config, services: [] }, original.revision)

    await expect(store.reset(original.revision)).rejects.toMatchObject({
      name: 'ConfigConflictError',
      current: { revision: current.revision, config: { services: [] } },
    })
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual(current.config)
  })

  it('serializes concurrent writes using revision checks', async () => {
    const { store } = await temporaryStore()
    const initial = await store.read()
    const candidates = [[], EXAMPLE_SERVICES.slice(0, 1)].map((services) =>
      store.write({ ...initial.config, services }, initial.revision),
    )
    const results = await Promise.allSettled(candidates)
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  })

  it('only repairs corrupt configuration through explicit reset and leaves valid config revision guarded', async () => {
    const { filePath, store } = await temporaryStore()
    await mkdir(join(filePath, '..'), { recursive: true })
    await writeFile(filePath, '{ "not": "a supported config" }')
    const raw = await readFile(filePath, 'utf8')

    await expect(store.read()).rejects.toBeInstanceOf(ConfigUnavailableError)
    await expect(store.write({ version: 1, mode: 'reef', services: [] }, 'anything')).rejects.toBeInstanceOf(ConfigUnavailableError)
    await expect(store.reset()).rejects.toBeInstanceOf(ConfigUnavailableError)
    expect(await readFile(filePath, 'utf8')).toBe(raw)
    const repaired = await store.reset(undefined, true)
    expect(repaired.config.services).toEqual(EXAMPLE_SERVICES)
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual(repaired.config)
  })

  it('does not let invalid-repair mode overwrite a valid config without its revision', async () => {
    const { directory, store } = await temporaryStore()
    const initial = await store.read()
    await expect(store.reset(undefined, true)).rejects.toMatchObject({
      name: 'ConfigConflictError',
      current: { revision: initial.revision },
    })
    expect(await readdir(directory)).toEqual([])
  })

  it('rejects an unsupported envelope without changing the on-disk config', async () => {
    const { directory, store } = await temporaryStore()
    const current = await store.read()
    await expect(store.write({ version: 2, mode: 'freshwater', services: [] }, current.revision)).rejects.toThrow(/invalid/)
    expect(await readdir(directory)).toEqual([])
  })
})
