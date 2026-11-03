import { createServer } from 'vite'

const vite = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { runBehaviorRuntimeDemo } = await vite.ssrLoadModule('/src/simulation/behavior-demo.ts')
  const records = runBehaviorRuntimeDemo()
  console.log('Engine-independent behavior trace; speeds are profile tuning values, not rendered motion.')
  console.table(records.map((record) => ({
    t: `${record.atSeconds.toFixed(1)}s`,
    fish: record.instanceId,
    species: record.speciesId,
    event: record.event,
    state: record.state,
    anchor: record.anchor ?? '—',
    speed: record.stateTunedSpeedTankWidthsPerSecond,
    cue: record.cue,
  })))
} finally {
  await vite.close()
}
