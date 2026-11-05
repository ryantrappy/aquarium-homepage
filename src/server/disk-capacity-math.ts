export type DiskCapacityRecord = {
  filesystemId: string
  label: string
  totalBytes: bigint
  availableBytes: bigint
}

export type DiskCapacityResult =
  | {
      status: 'available'
      totalBytes: bigint
      availableBytes: bigint
      availablePercent: number
      filesystems: DiskCapacityRecord[]
    }
  | {
      status: 'unavailable'
      reason: 'invalid-scope' | 'empty-scope' | 'invalid-record' | 'conflicting-filesystem'
      message: string
    }

export function aggregateDiskCapacity(records: readonly DiskCapacityRecord[]): DiskCapacityResult {
  if (!Array.isArray(records)) return { status: 'unavailable', reason: 'invalid-scope', message: 'Disk scope must be a list of filesystem readings.' }
  if (!records.length) return { status: 'unavailable', reason: 'empty-scope', message: 'No filesystems were selected.' }

  const unique = new Map<string, DiskCapacityRecord>()
  for (const [index, record] of records.entries()) {
    if (!record || typeof record !== 'object'
      || typeof record.filesystemId !== 'string' || !record.filesystemId.trim() || record.filesystemId.trim() !== record.filesystemId
      || typeof record.label !== 'string' || !record.label.trim()
      || typeof record.totalBytes !== 'bigint' || record.totalBytes <= 0n
      || typeof record.availableBytes !== 'bigint' || record.availableBytes < 0n || record.availableBytes > record.totalBytes) {
      return { status: 'unavailable', reason: 'invalid-record', message: `Invalid filesystem identity, label or byte capacity at reading ${index + 1}.` }
    }
    const existing = unique.get(record.filesystemId)
    if (existing && (existing.totalBytes !== record.totalBytes || existing.availableBytes !== record.availableBytes)) {
      return { status: 'unavailable', reason: 'conflicting-filesystem', message: `Conflicting capacity readings for filesystem ${record.filesystemId}.` }
    }
    // Mount aliases may have different display labels but represent one capacity.
    if (!existing) unique.set(record.filesystemId, { ...record })
  }

  let totalBytes = 0n, availableBytes = 0n
  for (const record of unique.values()) {
    totalBytes += record.totalBytes
    availableBytes += record.availableBytes
  }
  // Truncate to six decimal places. Only the bounded [0, 100_000_000]
  // fixed-point result becomes a Number; byte totals stay exact at any size.
  const availablePercent = Number(availableBytes * 100_000_000n / totalBytes) / 1_000_000
  return { status: 'available', totalBytes, availableBytes, availablePercent, filesystems: [...unique.values()] }
}
