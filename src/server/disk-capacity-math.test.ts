import { describe, expect, it } from 'vitest'
import { aggregateDiskCapacity, type DiskCapacityRecord } from './disk-capacity-math'

const disk = (filesystemId: string, totalBytes: bigint, availableBytes: bigint, label = filesystemId): DiskCapacityRecord => ({ filesystemId, label, totalBytes, availableBytes })

describe('disk capacity aggregation', () => {
  it('returns exact single-filesystem capacity and weights unequal disks by bytes', () => {
    expect(aggregateDiskCapacity([disk('small', 100n, 90n)])).toMatchObject({
      status: 'available', totalBytes: 100n, availableBytes: 90n, availablePercent: 90,
    })
    const aggregate = aggregateDiskCapacity([disk('small', 100n, 90n), disk('large', 900n, 90n)])
    expect(aggregate).toMatchObject({ status: 'available', totalBytes: 1000n, availableBytes: 180n, availablePercent: 18 })
    // The mean of the individual 90% and 10% values would incorrectly be 50%.
  })

  it('counts mount aliases once while preserving the first selected display label', () => {
    const result = aggregateDiskCapacity([
      disk('data-uuid', 1000n, 250n, 'Data'),
      disk('data-uuid', 1000n, 250n, 'Data bind mount'),
      disk('backup-uuid', 3000n, 750n, 'Backup'),
    ])
    expect(result).toEqual({
      status: 'available', totalBytes: 4000n, availableBytes: 1000n, availablePercent: 25,
      filesystems: [disk('data-uuid', 1000n, 250n, 'Data'), disk('backup-uuid', 3000n, 750n, 'Backup')],
    })
  })

  it.each([
    disk('same-id', 200n, 50n),
    disk('same-id', 100n, 40n),
  ])('rejects conflicting alias capacity instead of silently selecting a reading', conflicting => {
    const result = aggregateDiskCapacity([disk('same-id', 100n, 50n), conflicting])
    expect(result).toMatchObject({ status: 'unavailable', reason: 'conflicting-filesystem' })
    expect(result).toHaveProperty('message', 'Conflicting capacity readings for filesystem same-id.')
    expect(result).not.toHaveProperty('availablePercent')
  })

  it('keeps byte totals exact beyond MAX_SAFE_INTEGER and avoids Infinity for enormous capacities', () => {
    const huge = 1n << 2000n
    const result = aggregateDiskCapacity([disk('one', huge * 2n + 1n, huge), disk('two', huge + 2n, 1n)])
    expect(result).toMatchObject({ status: 'available', totalBytes: huge * 3n + 3n, availableBytes: huge + 1n, availablePercent: 33.333333 })
    if (result.status === 'available') {
      expect(Number.isFinite(result.availablePercent)).toBe(true)
      expect(result.availablePercent).toBeGreaterThanOrEqual(0)
      expect(result.availablePercent).toBeLessThanOrEqual(100)
    }
  })

  it('reports exact valid full and exhausted endpoints without rounding a nearly-full disk up', () => {
    expect(aggregateDiskCapacity([disk('full-free', 10n, 10n)])).toHaveProperty('availablePercent', 100)
    expect(aggregateDiskCapacity([disk('none-free', 10n, 0n)])).toHaveProperty('availablePercent', 0)
    expect(aggregateDiskCapacity([disk('nearly-all-free', 10_000_000_000n, 9_999_999_999n)])).toHaveProperty('availablePercent', 99.999999)
  })

  it('returns explicit unavailable outcomes for empty or malformed scope', () => {
    expect(aggregateDiskCapacity([])).toMatchObject({ status: 'unavailable', reason: 'empty-scope' })
    expect(aggregateDiskCapacity(null as unknown as DiskCapacityRecord[])).toMatchObject({ status: 'unavailable', reason: 'invalid-scope' })
  })

  it.each([
    null,
    {},
    disk('', 10n, 5n),
    disk(' ', 10n, 5n),
    disk(' padded-id ', 10n, 5n),
    { ...disk('id', 10n, 5n), filesystemId: 12 },
    disk('id', 10n, 5n, ''),
    disk('id', 10n, 5n, ' '),
    disk('id', 0n, 0n),
    disk('id', -1n, 0n),
    disk('id', 10n, -1n),
    disk('id', 10n, 11n),
    { ...disk('id', 10n, 5n), totalBytes: 10 },
    { ...disk('id', 10n, 5n), availableBytes: undefined },
  ])('rejects invalid reading %# without returning a fabricated capacity', invalid => {
    const result = aggregateDiskCapacity([invalid as DiskCapacityRecord])
    expect(result).toMatchObject({ status: 'unavailable', reason: 'invalid-record' })
    expect(result).not.toHaveProperty('totalBytes')
    expect(result).not.toHaveProperty('availablePercent')
  })
})
