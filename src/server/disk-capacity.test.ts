import { mkdtemp, rm, stat, statfs } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDiskCapacityStore, type DiskCapacitySourceConfig } from './disk-capacity'

const linuxMagic = {
  ext: 0xef53n,
  btrfs: 0x9123683en,
  xfs: 0x58465342n,
  overlay: 0x794c7630n,
  tmpfs: 0x01021994n,
} as const

function source(id: string, directory = `/mnt/${id}`, label = id): DiskCapacitySourceConfig {
  return { id, label, directory }
}

function directoryStat(dev: bigint, directory = true) {
  return { dev, isDirectory: () => directory }
}

function fsStat(type: bigint, blocks = 100n, bavail = 25n, bsize = 4096n) {
  return { type, blocks, bavail, bsize }
}

describe('configured disk capacity source', () => {
  it('lists only trusted IDs and labels, reads one selected source, and treats client paths as unknown IDs', async () => {
    const configured = [source('data-volume', '/srv/data', 'Data volume')]
    const statReader = vi.fn(async () => directoryStat(12n))
    const statfsReader = vi.fn(async () => fsStat(linuxMagic.ext, 1000n, 400n, 1024n))
    const store = createDiskCapacityStore({ sources: configured, stat: statReader, statfs: statfsReader, platform: 'linux', wallNow: () => 1_800_000_000_000, elapsedNow: () => 10 })

    expect(store.getSources()).toEqual([{ id: 'data-volume', label: 'Data volume' }])
    expect(Object.keys(store).sort()).toEqual(['getSources', 'read'])
    expect(await store.read('../../etc/passwd')).toMatchObject({ status: 'unavailable', scopeId: 'unsupported' })
    expect(statReader).not.toHaveBeenCalled()
    expect(statfsReader).not.toHaveBeenCalled()

    const reading = await store.read('data-volume')
    expect(reading).toMatchObject({
      status: 'fresh', scopeId: 'data-volume', label: 'Data volume',
      totalBytes: 1_024_000n, availableBytes: 409_600n, availablePercent: 40,
      observedAt: new Date(1_800_000_000_000).toISOString(), ageMs: 0,
    })
    expect(statReader).toHaveBeenCalledExactlyOnceWith('/srv/data', { bigint: true })
    expect(statfsReader).toHaveBeenCalledExactlyOnceWith('/srv/data', { bigint: true })
    expect(configured).toEqual([source('data-volume', '/srv/data', 'Data volume')])
    expect(reading).not.toHaveProperty('directory')
  })

  it('deduplicates device aliases before capacity reads and weights unique filesystems by exact bytes', async () => {
    const sources = [
      source('data', '/srv/data', 'Data'),
      source('data-alias', '/srv/data-alias', 'Data alias'),
      source('backup', '/srv/backup', 'Backup'),
    ]
    const statReader = vi.fn(async (directory: string) => directoryStat(directory === '/srv/backup' ? 22n : 11n))
    const statfsReader = vi.fn(async (directory: string) => directory === '/srv/data'
      ? fsStat(linuxMagic.ext, 100n, 90n, 1n)
      : fsStat(linuxMagic.xfs, 900n, 90n, 1n))
    const store = createDiskCapacityStore({ sources, stat: statReader, statfs: statfsReader, platform: 'linux', wallNow: () => 0, elapsedNow: () => 0 })

    const reading = await store.read('all')
    expect(reading).toMatchObject({ status: 'fresh', scopeId: 'all', totalBytes: 1000n, availableBytes: 180n, availablePercent: 18 })
    if (reading.status === 'fresh') {
      expect(reading.filesystems).toEqual([
        { filesystemId: 'linux-dev:11', label: 'Data', totalBytes: 100n, availableBytes: 90n },
        { filesystemId: 'linux-dev:22', label: 'Backup', totalBytes: 900n, availableBytes: 90n },
      ])
    }
    expect(statReader).toHaveBeenCalledTimes(3)
    expect(statfsReader).toHaveBeenCalledTimes(2)
    expect(statfsReader).toHaveBeenNthCalledWith(1, '/srv/data', { bigint: true })
    expect(statfsReader).toHaveBeenNthCalledWith(2, '/srv/backup', { bigint: true })
  })

  it('keeps an all-scope reading atomic and returns the previous coherent result as honestly aged stale data', async () => {
    const sources = [source('data'), source('backup')]
    let elapsed = 100
    let wall = 1_800_000_000_000
    let failBackup = false
    const statReader = vi.fn(async (directory: string) => {
      if (failBackup && directory === '/mnt/backup') throw new Error('permission denied')
      return directoryStat(directory === '/mnt/backup' ? 22n : 11n)
    })
    const statfsReader = vi.fn(async () => fsStat(linuxMagic.ext))
    const store = createDiskCapacityStore({
      sources, stat: statReader, statfs: statfsReader, platform: 'linux',
      wallNow: () => wall, elapsedNow: () => elapsed,
    })
    const fresh = await store.read('all')
    expect(fresh).toMatchObject({ status: 'fresh', totalBytes: 819_200n, availableBytes: 204_800n })

    failBackup = true
    elapsed += 2_500
    wall -= 30_000 // Wall-clock changes must not affect elapsed age.
    const stale = await store.read('all')
    expect(stale).toMatchObject({
      status: 'stale', scopeId: 'all', totalBytes: 819_200n, availableBytes: 204_800n,
      observedAt: new Date(1_800_000_000_000).toISOString(), ageMs: 2_500,
      message: 'The configured disk capacity source could not be read.',
    })
  })

  it('never returns a partial aggregate after an all-scope path failure', async () => {
    const statReader = vi.fn(async (directory: string) => {
      if (directory === '/mnt/backup') throw new Error('missing')
      return directoryStat(11n)
    })
    const statfsReader = vi.fn(async () => fsStat(linuxMagic.ext))
    const store = createDiskCapacityStore({ sources: [source('data'), source('backup')], stat: statReader, statfs: statfsReader, platform: 'linux' })

    const reading = await store.read('all')
    expect(reading).toMatchObject({ status: 'unavailable', scopeId: 'all' })
    expect(reading).not.toHaveProperty('totalBytes')
    expect(reading).not.toHaveProperty('availablePercent')
    expect(statfsReader).not.toHaveBeenCalled()
  })

  it.each([
    ['btrfs (subvolume identity is not safely deduplicated)', linuxMagic.btrfs],
    ['overlay', linuxMagic.overlay],
    ['tmpfs', linuxMagic.tmpfs],
    ['unknown filesystem', 0xfeed1234n],
  ])('rejects %s rather than reporting a virtual or unknown capacity', async (_name, type) => {
    const store = createDiskCapacityStore({
      sources: [source('data')], stat: async () => directoryStat(11n),
      statfs: async () => fsStat(type), platform: 'linux',
    })
    const reading = await store.read('data')
    expect(reading).toMatchObject({ status: 'unavailable', message: 'The configured directory is not on a supported persistent filesystem.' })
    expect(reading).not.toHaveProperty('totalBytes')
  })

  it.each([
    { type: linuxMagic.ext, blocks: 0n, bavail: 0n, bsize: 4096n },
    { type: linuxMagic.ext, blocks: 10n, bavail: 11n, bsize: 4096n },
    { type: linuxMagic.ext, blocks: 10n, bavail: 5n, bsize: 0n },
    { type: linuxMagic.ext, blocks: 10n, bavail: -1n, bsize: 4096n },
  ])('rejects malformed block readings %#', async (stats) => {
    const store = createDiskCapacityStore({
      sources: [source('data')], stat: async () => directoryStat(11n),
      statfs: async () => fsStat(stats.type, stats.blocks, stats.bavail, stats.bsize), platform: 'linux',
    })
    const reading = await store.read('data')
    expect(reading).toMatchObject({ status: 'unavailable', message: 'The configured disk capacity source could not be read.' })
    expect(reading).not.toHaveProperty('availablePercent')
  })

  it('rejects directories that are not directories and invalid trusted registry entries', async () => {
    const notDirectory = createDiskCapacityStore({
      sources: [source('data')], stat: async () => directoryStat(11n, false),
      statfs: async () => fsStat(linuxMagic.ext), platform: 'linux',
    })
    expect(await notDirectory.read('data')).toMatchObject({ status: 'unavailable' })

    expect(() => createDiskCapacityStore({ sources: [source('all')] })).toThrow('Each disk source needs a stable ID, display label, and absolute directory')
    expect(() => createDiskCapacityStore({ sources: [source('duplicate'), source('duplicate', '/mnt/other')] })).toThrow('Duplicate disk source ID: duplicate')
    expect(() => createDiskCapacityStore({ sources: [source('relative', 'mnt/relative')] })).toThrow('Each disk source needs a stable ID, display label, and absolute directory')
  })

  it('returns unavailable on non-Linux platforms instead of interpreting their numeric statfs type as a host disk', async () => {
    const statReader = vi.fn(async () => directoryStat(11n))
    const statfsReader = vi.fn(async () => fsStat(26n))
    const store = createDiskCapacityStore({ sources: [source('data')], stat: statReader, statfs: statfsReader, platform: 'darwin' })

    const reading = await store.read('data')
    expect(reading).toMatchObject({ status: 'unavailable', message: 'Disk filesystem types cannot be safely classified on this platform.' })
    expect(statReader).not.toHaveBeenCalled()
    expect(statfsReader).not.toHaveBeenCalled()
  })

  it('returns explicit unavailable when no trusted sources are configured', async () => {
    const store = createDiskCapacityStore({ sources: [], platform: 'darwin' })

    expect(store.getSources()).toEqual([])
    expect(await store.read('all')).toMatchObject({
      status: 'unavailable', scopeId: 'all', message: 'No configured disk sources are available.',
    })
  })

  it('smokes real temporary-directory stat/statfs while keeping unsupported platforms unavailable', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'reef-disk-capacity-'))
    try {
      const [actualStat, actualFs] = await Promise.all([
        stat(directory, { bigint: true }),
        statfs(directory, { bigint: true }),
      ])
      expect(typeof actualStat.dev).toBe('bigint')
      expect(actualStat.isDirectory()).toBe(true)
      expect(typeof actualFs.type).toBe('bigint')
      expect(typeof actualFs.bsize).toBe('bigint')
      expect(typeof actualFs.blocks).toBe('bigint')
      expect(typeof actualFs.bavail).toBe('bigint')

      const store = createDiskCapacityStore({ sources: [source('temporary-data', directory)], platform: process.platform })
      const reading = await store.read('temporary-data')
      if (process.platform !== 'linux') {
        expect(reading).toMatchObject({ status: 'unavailable', message: 'Disk filesystem types cannot be safely classified on this platform.' })
      } else if (supportedType(actualFs.type)) {
        expect(reading).toMatchObject({
          status: 'fresh',
          totalBytes: actualFs.bsize * actualFs.blocks,
          availableBytes: actualFs.bsize * actualFs.bavail,
        })
      } else {
        expect(reading).toMatchObject({ status: 'unavailable', message: 'The configured directory is not on a supported persistent filesystem.' })
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

function supportedType(type: bigint) {
  return new Set<bigint>([linuxMagic.ext, linuxMagic.xfs]).has(type)
}
