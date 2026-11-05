import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsRoot = dirname(fileURLToPath(import.meta.url))

async function collectScripts(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectScripts(path)
    return entry.isFile() && entry.name.endsWith('.mjs') ? [path] : []
  }))
  return nested.flat()
}

const scripts = (await collectScripts(scriptsRoot)).sort()
const failed = []
for (const script of scripts) {
  const result = spawnSync(process.execPath, ['--check', script], { encoding: 'utf8' })
  if (result.status !== 0) failed.push({ script, output: `${result.stdout}${result.stderr}` })
}

if (failed.length) {
  for (const failure of failed) process.stderr.write(`${failure.script}\n${failure.output}`)
  process.exitCode = 1
} else {
  console.log(`Syntax checked ${scripts.length} scripts.`)
}
