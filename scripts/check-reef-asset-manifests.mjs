import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_ROOT = path.resolve(scriptDir, '..')
const MANIFESTS = [
  { relativePath: 'src/rendering/assets/corals/manifest.json', assetDir: 'src/rendering/assets/corals', expectedCount: 10, kinds: ['coral', 'rock'] },
  { relativePath: 'src/rendering/assets/fish/manifest.json', assetDir: 'src/rendering/assets/fish', expectedCount: 6, kinds: ['fish'] },
]

function jsonFile(filePath, errors) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (error) {
    errors.push(`${path.relative(process.cwd(), filePath)}: cannot read valid JSON (${error.message}).`)
    return undefined
  }
}

function resolveContainedPath(root, baseDir, relativePath, label, errors) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) {
    errors.push(`${label}: path must be a non-empty project-relative path.`)
    return undefined
  }
  if (path.isAbsolute(relativePath)) {
    errors.push(`${label}: absolute paths are not allowed.`)
    return undefined
  }

  const absolutePath = path.resolve(root, relativePath)
  const relativeToBase = path.relative(path.resolve(root, baseDir), absolutePath)
  if (!relativeToBase || relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase)) {
    errors.push(`${label}: path must stay inside ${baseDir}.`)
    return undefined
  }
  return absolutePath
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

/** Checks the supplied coral/rock and fish manifests without changing any input. */
export function checkReefAssetManifests(root = DEFAULT_ROOT) {
  const errors = []
  const ids = new Set()
  let verifiedAssetFiles = 0
  let verifiedInspectionFiles = 0
  const projectRoot = path.resolve(root)

  for (const specification of MANIFESTS) {
    const manifestPath = path.resolve(projectRoot, specification.relativePath)
    const manifest = jsonFile(manifestPath, errors)
    if (!manifest) continue
    const label = specification.relativePath

    if (!Array.isArray(manifest.assets)) {
      errors.push(`${label}: assets must be an array.`)
      continue
    }
    if (manifest.assets.length !== specification.expectedCount) {
      errors.push(`${label}: expected ${specification.expectedCount} assets, found ${manifest.assets.length}.`)
    }

    for (const [index, asset] of manifest.assets.entries()) {
      const recordLabel = `${label} assets[${index}]${asset?.id ? ` (${asset.id})` : ''}`
      if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
        errors.push(`${recordLabel}: asset record must be an object.`)
        continue
      }
      if (typeof asset.id !== 'string' || !asset.id.trim()) {
        errors.push(`${recordLabel}: id must be a non-empty string.`)
      } else if (ids.has(asset.id)) {
        errors.push(`${recordLabel}: duplicate asset ID ${asset.id}.`)
      } else {
        ids.add(asset.id)
      }
      if (!specification.kinds.includes(asset.kind)) {
        errors.push(`${recordLabel}: kind must be one of ${specification.kinds.join(', ')}.`)
      }

      const assetPath = resolveContainedPath(projectRoot, specification.assetDir, asset.path, `${recordLabel} path`, errors)
      const expectedAssetPath = asset.file && path.posix.join(specification.assetDir, asset.file)
      if (expectedAssetPath && asset.path !== expectedAssetPath) {
        errors.push(`${recordLabel}: path must exactly match ${expectedAssetPath}.`)
      }
      let assetVerified = false
      if (assetPath) {
        if (!existsSync(assetPath) || !statSync(assetPath).isFile()) {
          errors.push(`${recordLabel}: asset file is missing: ${asset.path}.`)
        } else {
          const actualBytes = statSync(assetPath).size
          if (asset.bytes !== undefined && (!Number.isSafeInteger(asset.bytes) || asset.bytes !== actualBytes)) {
            errors.push(`${recordLabel}: byte size mismatch; manifest has ${asset.bytes}, file has ${actualBytes}.`)
          }
          if (typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(asset.sha256)) {
            errors.push(`${recordLabel}: sha256 must be a 64-character hexadecimal digest.`)
          } else {
            const actualHash = sha256(assetPath)
            if (asset.sha256.toLowerCase() !== actualHash) {
              errors.push(`${recordLabel}: sha256 mismatch; manifest has ${asset.sha256}, file has ${actualHash}.`)
            } else {
              assetVerified = asset.bytes === undefined || asset.bytes === actualBytes
            }
          }
        }
      }
      if (assetVerified) verifiedAssetFiles++

      const inspectionPath = resolveContainedPath(projectRoot, specification.assetDir, asset.inspectionReport, `${recordLabel} inspectionReport`, errors)
      if (!inspectionPath) continue
      if (!existsSync(inspectionPath) || !statSync(inspectionPath).isFile()) {
        errors.push(`${recordLabel}: inspection report is missing: ${asset.inspectionReport}.`)
        continue
      }
      const inspection = jsonFile(inspectionPath, errors)
      const reefAsset = inspection?.extras?.reefAsset
      if (!reefAsset || reefAsset.id !== asset.id) {
        errors.push(`${recordLabel}: inspection identity mismatch; expected extras.reefAsset.id ${asset.id}, found ${reefAsset?.id ?? 'missing'}.`)
        continue
      }
      if (reefAsset.kind !== asset.kind) {
        errors.push(`${recordLabel}: inspection kind mismatch; manifest has ${asset.kind}, report has ${reefAsset.kind ?? 'missing'}.`)
        continue
      }
      if (typeof asset.generatorSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(asset.generatorSha256)) {
        errors.push(`${recordLabel}: generatorSha256 must be a 64-character hexadecimal digest.`)
        continue
      }
      const sourceHash = reefAsset.provenance?.sourceSha256
      if (typeof sourceHash !== 'string' || sourceHash.toLowerCase() !== asset.generatorSha256.toLowerCase()) {
        errors.push(`${recordLabel}: inspection source hash mismatch; manifest generatorSha256 is ${asset.generatorSha256}, report sourceSha256 is ${sourceHash ?? 'missing'}.`)
        continue
      }
      verifiedInspectionFiles++
    }
  }

  return {
    success: errors.length === 0,
    errors,
    verifiedAssetFiles,
    verifiedInspectionFiles,
    verifiedFiles: verifiedAssetFiles + verifiedInspectionFiles,
  }
}

function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT
  const result = checkReefAssetManifests(root)
  if (result.success) {
    console.log(`Verified ${result.verifiedFiles} files (${result.verifiedAssetFiles} assets and ${result.verifiedInspectionFiles} paired inspection reports).`)
    return
  }
  for (const error of result.errors) console.error(`ERROR: ${error}`)
  console.error(`Verified ${result.verifiedFiles} files before finding ${result.errors.length} issue${result.errors.length === 1 ? '' : 's'}.`)
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main()
