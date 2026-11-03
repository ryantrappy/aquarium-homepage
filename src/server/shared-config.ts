import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { EXAMPLE_SERVICES } from '../lib/services'
import { sharedConfigSchema, type SharedConfig } from '../lib/validation'

export type VersionedConfig = {
  config: SharedConfig
  revision: string
}

export class ConfigConflictError extends Error {
  constructor(public readonly current: VersionedConfig) {
    super('The shared configuration changed in another browser. Reload it before saving again.')
    this.name = 'ConfigConflictError'
  }
}

export class ConfigUnavailableError extends Error {
  constructor(message = 'The shared configuration file is unavailable. Your changes were not saved.') {
    super(message)
    this.name = 'ConfigUnavailableError'
  }
}

export class ConfigInvalidError extends ConfigUnavailableError {
  constructor() {
    super('The shared configuration file is invalid. It was left untouched; fix or restore it before editing services.')
    this.name = 'ConfigInvalidError'
  }
}

const defaultConfig = (): SharedConfig => ({ version: 1, mode: 'reef', services: [...EXAMPLE_SERVICES] })

function revisionFor(config: SharedConfig) {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex')
}

function version(config: SharedConfig): VersionedConfig {
  return { config, revision: revisionFor(config) }
}

export function createSharedConfigStore(filePath: string, seed: SharedConfig = defaultConfig()) {
  let writeQueue: Promise<void> = Promise.resolve()

  async function atomicallyWrite(config: SharedConfig): Promise<VersionedConfig> {
    const contents = `${JSON.stringify(config, null, 2)}\n`
    const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
    let handle: Awaited<ReturnType<typeof open>> | undefined
    try {
      await mkdir(dirname(filePath), { recursive: true })
      handle = await open(tempPath, 'wx', 0o600)
      await handle.writeFile(contents, 'utf8')
      await handle.sync()
      await handle.close()
      handle = undefined
      await rename(tempPath, filePath)
    } catch {
      await handle?.close().catch(() => undefined)
      await unlink(tempPath).catch(() => undefined)
      throw new ConfigUnavailableError()
    }
    return version(config)
  }

  function enqueue<T>(operation: () => Promise<T>) {
    const result = writeQueue.then(operation)
    writeQueue = result.then(() => undefined, () => undefined)
    return result
  }

  async function read(): Promise<VersionedConfig> {
    let contents: string
    try {
      contents = await readFile(filePath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return version(sharedConfigSchema.parse(seed))
      throw new ConfigUnavailableError()
    }

    try {
      return version(sharedConfigSchema.parse(JSON.parse(contents)))
    } catch {
      throw new ConfigInvalidError()
    }
  }

  async function write(config: unknown, expectedRevision: string): Promise<VersionedConfig> {
    return enqueue(async () => {
      const current = await read()
      if (current.revision !== expectedRevision) throw new ConfigConflictError(current)

      let valid: SharedConfig
      try {
        valid = sharedConfigSchema.parse(config)
      } catch {
        throw new TypeError('The service configuration is invalid. Check names, addresses, fish choices, and aquarium mode.')
      }

      return atomicallyWrite(valid)
    })
  }

  async function reset(expectedRevision?: string, repairInvalid = false): Promise<VersionedConfig> {
    return enqueue(async () => {
      let current: VersionedConfig
      try {
        current = await read()
      } catch (error) {
        if (repairInvalid && error instanceof ConfigInvalidError) {
          return atomicallyWrite(sharedConfigSchema.parse(seed))
        }
        throw error
      }
      if (!expectedRevision || current.revision !== expectedRevision) throw new ConfigConflictError(current)
      return atomicallyWrite(sharedConfigSchema.parse(seed))
    })
  }

  return { read, write, reset }
}

const configPath = process.env.REEF_CONFIG_PATH ?? `${process.cwd()}/.data/reef-config.json`
const sharedConfigStore = createSharedConfigStore(configPath)

export const readSharedConfig = sharedConfigStore.read
export const writeSharedConfig = sharedConfigStore.write
export const resetSharedConfig = sharedConfigStore.reset
