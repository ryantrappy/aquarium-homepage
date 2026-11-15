import { resolve } from 'node:path'

const fixtureRoot = resolve('/tmp/aq103-bounded-meniscus-20261114')
const repoRoot = resolve('/Users/ryantrapp/Desktop/Code/aquarium-homepage')

export default {
  root: fixtureRoot,
  cacheDir: "/tmp/aq103-bounded-meniscus-vite-cache",
  resolve: {
    alias: [
      { find: /^\/src\//, replacement: `${repoRoot}/src/` },
      { find: /^three\/addons\//, replacement: `${repoRoot}/node_modules/three/examples/jsm/` },
      { find: /^three$/, replacement: resolve(repoRoot, 'node_modules/three/build/three.module.js') },
    ],
  },
  server: {
    fs: { allow: [repoRoot, fixtureRoot, "/private/tmp/aq103-bounded-meniscus-20261114"] },
  },
}
