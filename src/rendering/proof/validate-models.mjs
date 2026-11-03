// Run against an unpacked official Khronos gltf-validator npm package without
// adding a production dependency: node validate-models.mjs /path/index.js fish.glb …
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [validatorPath, ...files] = process.argv.slice(2)
if (!validatorPath || !files.length) throw new Error('Expected validator index.js path and one or more GLB paths')
const { default: validator } = await import(pathToFileURL(resolve(validatorPath)).href)
const reports = []
for (const file of files) {
  const bytes = await readFile(file)
  const report = await validator.validateBytes(new Uint8Array(bytes), { uri: file, format: 'glb', maxIssues: 0 })
  reports.push({ file, sha256: createHash('sha256').update(bytes).digest('hex'), report })
  if (report.issues.numErrors) process.exitCode = 1
}
console.log(JSON.stringify({ validator: validator.version(), reports }, null, 2))
