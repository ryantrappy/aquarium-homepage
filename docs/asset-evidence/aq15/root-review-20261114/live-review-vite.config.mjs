import { loadConfigFromFile, mergeConfig } from '/Users/ryantrapp/Desktop/Code/aquarium-homepage/node_modules/vite/dist/node/index.js'
import { aq15LiveReaderVitePlugin } from './aq15-live-reader-vite-plugin.mjs'

export default async function aq15BridgeConfig(env) {
  const base = await loadConfigFromFile(env, '/tmp/aquarium-showcase-v1-proof-7c08b43/vite.config.ts')
  if (!base) throw new Error('Could not load the aquarium project Vite config')
  return mergeConfig(base.config, {
    root: "/tmp/aquarium-showcase-v1-proof-7c08b43",
    cacheDir: "/tmp/aq15-root-live-vite-cache",
    plugins: [aq15LiveReaderVitePlugin()],
  })
}
