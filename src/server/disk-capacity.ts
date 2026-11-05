import { stat as nodeStat, statfs as nodeStatfs } from 'node:fs/promises'
import type { BigIntStats, BigIntStatsFs } from 'node:fs'
import { isAbsolute } from 'node:path'
import { aggregateDiskCapacity, type DiskCapacityRecord } from './disk-capacity-math'

const sourceIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
const allScopeId = 'all'

// Linux UAPI filesystem magic values from include/uapi/linux/magic.h and
// statfs(2) (https://www.man7.org/linux/man-pages/man2/statfs.2.html).
// Node's bigint statfs fields follow https://nodejs.org/api/fs.html#class-fsstatfs.
// ext2/3/4 share 0xef53. Btrfs is intentionally excluded: independently
// mounted subvolumes can report distinct st_dev values while sharing the same
// filesystem capacity pool, and this adapter has no safe filesystem-ID source
// for deduplicating them. Only ext and xfs are currently allowlisted; overlayfs
// and unknown/virtual filesystems remain unavailable.
const supportedLinuxFilesystemTypes = new Map<bigint, string>([
  [0xef53n, 'ext'],
  [0x58465342n, 'xfs'],
])

export type DiskCapacitySourceConfig = {
  id: string
  label: string
  directory: string
}

export type DiskCapacitySource = Pick<DiskCapacitySourceConfig, 'id' | 'label'>

type AvailableDiskCapacityFields = {
  scopeId: string
  label: string
  totalBytes: bigint
  availableBytes: bigint
  availablePercent: number
  filesystems: DiskCapacityRecord[]
  observedAt: string
  ageMs: number | null
}

export type DiskCapacityReading =
  | (AvailableDiskCapacityFields & { status: 'fresh' })
  | (AvailableDiskCapacityFields & { status: 'stale'; message: string })
  | {
      status: 'unavailable'
      scopeId: string
      label?: string
      message: string
    }

type StatResult = Pick<BigIntStats, 'dev' | 'isDirectory'>
type StatFsResult = Pick<BigIntStatsFs, 'type' | 'bsize' | 'blocks' | 'bavail'>
type StatReader = (path: string, options: { bigint: true }) => Promise<StatResult>
type StatFsReader = (path: string, options: { bigint: true }) => Promise<StatFsResult>

type DiskCapacityStoreOptions = {
  sources: readonly DiskCapacitySourceConfig[]
  stat?: StatReader
  statfs?: StatFsReader
  platform?: NodeJS.Platform
  wallNow?: () => number
  elapsedNow?: () => number
}

type FreshDiskCapacityReading = Extract<DiskCapacityReading, { status: 'fresh' }>
type LastGoodReading = {
  reading: FreshDiskCapacityReading
  elapsedAt: number
}

const unsupportedFilesystemMessage = 'The configured directory is not on a supported persistent filesystem.'
const readFailureMessage = 'The configured disk capacity source could not be read.'

function cloneReading(reading: DiskCapacityReading): DiskCapacityReading {
  return reading.status === 'unavailable'
    ? { ...reading }
    : { ...reading, filesystems: reading.filesystems.map(filesystem => ({ ...filesystem })) }
}

function isValidWallTime(value: number) {
  return Number.isFinite(value) && Math.abs(value) <= 8.64e15
}

function elapsedAge(sampledAt: number, now: number | null): number | null {
  if (now === null || !Number.isFinite(now) || now < sampledAt) return null
  const age = now - sampledAt
  return Number.isFinite(age) ? age : null
}

export function createDiskCapacityStore({
  sources,
  stat = (directory, options) => nodeStat(directory, options),
  statfs = (directory, options) => nodeStatfs(directory, options),
  platform = process.platform,
  wallNow = Date.now,
  elapsedNow = () => performance.now(),
}: DiskCapacityStoreOptions) {
  const sourceById = new Map<string, DiskCapacitySourceConfig>()
  for (const candidate of sources) {
    if (!candidate || typeof candidate !== 'object'
      || typeof candidate.id !== 'string' || typeof candidate.label !== 'string' || typeof candidate.directory !== 'string') {
      throw new Error('Each disk source needs a stable ID, display label, and absolute directory')
    }
    const source = { id: candidate.id, label: candidate.label, directory: candidate.directory }
    if (!sourceIdPattern.test(source.id) || source.id === allScopeId
      || source.label.trim() === '' || !isAbsolute(source.directory)) {
      throw new Error('Each disk source needs a stable ID, display label, and absolute directory')
    }
    if (sourceById.has(source.id)) throw new Error(`Duplicate disk source ID: ${source.id}`)
    sourceById.set(source.id, source)
  }

  const lastGood = new Map<string, LastGoodReading>()
  const inFlight = new Map<string, Promise<DiskCapacityReading>>()

  function unavailable(scopeId: string, source: DiskCapacitySourceConfig | undefined, message: string): DiskCapacityReading {
    return {
      status: 'unavailable',
      scopeId,
      ...(source ? { label: source.label } : {}),
      message,
    }
  }

  function staleOrUnavailable(scopeId: string, source: DiskCapacitySourceConfig | undefined, message: string): DiskCapacityReading {
    const previous = lastGood.get(scopeId)
    if (!previous) return unavailable(scopeId, source, message)
    let elapsedAt: number | null = null
    try {
      const now = elapsedNow()
      if (Number.isFinite(now)) elapsedAt = now
    } catch {
      // A missing monotonic clock means the stale value has no honest age.
    }
    const ageMs = elapsedAge(previous.elapsedAt, elapsedAt)
    return {
      ...previous.reading,
      status: 'stale',
      ageMs,
      message,
    }
  }

  async function readFilesystemRecord(source: DiskCapacitySourceConfig, dev: bigint): Promise<DiskCapacityRecord> {
    const stats = await statfs(source.directory, { bigint: true })
    if (typeof stats.type !== 'bigint' || platform !== 'linux') throw new Error(unsupportedFilesystemMessage)
    const filesystemType = supportedLinuxFilesystemTypes.get(stats.type)
    if (!filesystemType) throw new Error(unsupportedFilesystemMessage)
    if (typeof stats.bsize !== 'bigint' || stats.bsize <= 0n
      || typeof stats.blocks !== 'bigint' || stats.blocks <= 0n
      || typeof stats.bavail !== 'bigint' || stats.bavail < 0n || stats.bavail > stats.blocks) {
      throw new Error(readFailureMessage)
    }

    return {
      filesystemId: `linux-dev:${dev}`,
      label: source.label,
      totalBytes: stats.bsize * stats.blocks,
      availableBytes: stats.bsize * stats.bavail,
    }
  }

  async function sample(scopeId: string, selected: readonly DiskCapacitySourceConfig[]): Promise<DiskCapacityReading> {
    if (!selected.length) return unavailable(scopeId, undefined, 'No configured disk sources are available.')
    if (platform !== 'linux') return staleOrUnavailable(scopeId, selected.length === 1 ? selected[0] : undefined, 'Disk filesystem types cannot be safely classified on this platform.')

    let records: DiskCapacityRecord[]
    try {
      const mounts = await Promise.all(selected.map(async source => {
        const sourceStat = await stat(source.directory, { bigint: true })
        if (!sourceStat.isDirectory() || typeof sourceStat.dev !== 'bigint' || sourceStat.dev < 0n) {
          throw new Error(readFailureMessage)
        }
        return { source, dev: sourceStat.dev }
      }))

      // Linux mountinfo defines major:minor as st_dev for files on a filesystem
      // (https://docs.kernel.org/filesystems/proc.html#proc-pid-mountinfo-information-about-mounts).
      // Group aliases before statfs so each filesystem has one capacity sample.
      const unique = new Map<string, { source: DiskCapacitySourceConfig; dev: bigint }>()
      for (const mount of mounts) {
        const identity = mount.dev.toString()
        if (!unique.has(identity)) unique.set(identity, mount)
      }

      records = []
      for (const { source, dev } of unique.values()) records.push(await readFilesystemRecord(source, dev))
    } catch (error) {
      const message = error instanceof Error && error.message === unsupportedFilesystemMessage
        ? unsupportedFilesystemMessage
        : readFailureMessage
      return staleOrUnavailable(scopeId, selected.length === 1 ? selected[0] : undefined, message)
    }

    const aggregate = aggregateDiskCapacity(records)
    if (aggregate.status !== 'available') return staleOrUnavailable(scopeId, selected.length === 1 ? selected[0] : undefined, aggregate.message)

    let wallAt: number, elapsedAt: number
    try {
      wallAt = wallNow()
      elapsedAt = elapsedNow()
    } catch {
      return staleOrUnavailable(scopeId, selected.length === 1 ? selected[0] : undefined, 'The disk sample clock is unavailable.')
    }
    if (!isValidWallTime(wallAt) || !Number.isFinite(elapsedAt)) {
      return staleOrUnavailable(scopeId, selected.length === 1 ? selected[0] : undefined, 'The disk sample clock is invalid.')
    }

    const reading: FreshDiskCapacityReading = {
      status: 'fresh',
      scopeId,
      label: scopeId === allScopeId ? 'All configured disks' : selected[0].label,
      totalBytes: aggregate.totalBytes,
      availableBytes: aggregate.availableBytes,
      availablePercent: aggregate.availablePercent,
      filesystems: aggregate.filesystems,
      observedAt: new Date(wallAt).toISOString(),
      ageMs: 0,
    }
    lastGood.set(scopeId, { reading, elapsedAt })
    return cloneReading(reading)
  }

  return {
    getSources(): DiskCapacitySource[] {
      return [...sourceById.values()].map(({ id, label }) => ({ id, label }))
    },
    read(scopeId = allScopeId): Promise<DiskCapacityReading> {
      if (scopeId !== allScopeId && !sourceById.has(scopeId)) {
        return Promise.resolve(unavailable('unsupported', undefined, 'The selected disk capacity source is unavailable.'))
      }
      const pending = inFlight.get(scopeId)
      if (pending) return pending.then(cloneReading)

      const source = sourceById.get(scopeId)
      const selected = scopeId === allScopeId ? [...sourceById.values()] : source ? [source] : []
      const request = sample(scopeId, selected)
      inFlight.set(scopeId, request)
      return request.then(cloneReading).finally(() => inFlight.delete(scopeId))
    },
  }
}
