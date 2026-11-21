import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { MODULAR_CORAL_ASSET_URLS } from './reef-assembly'
import {
  NSA_MODULE_MOUNTS,
  NSA_ROCK_URLS,
  RUBBLE_TALUS_URL,
  createRubbleTalusGroundingAprons,
  disposeRubbleTalusMaterials,
  rubbleTalusPlacementsForViewport,
} from './reef-nsa'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

describe('AQ-94 NSA modular rock library & rubble-talus grounding', () => {
  it('resolves all 5 NSA module URLs on disk and keeps combined live runtime rock GLBs under 5 MB', () => {
    expect(Object.keys(NSA_ROCK_URLS)).toHaveLength(5)
    for (const url of Object.values(NSA_ROCK_URLS)) {
      const filePath = fileURLToPath(url)
      expect(existsSync(filePath), `missing ${filePath}`).toBe(true)
    }
    expect(RUBBLE_TALUS_URL).toBe(NSA_ROCK_URLS['reef-nsa-rubble-talus'])

    const liveRuntimeRockGlbs = [
      path.join(repoRoot, 'src/rendering/assets/corals/reef-full-model-left.glb'),
      path.join(repoRoot, 'src/rendering/assets/corals/reef-full-model-right.glb'),
      path.join(repoRoot, 'src/rendering/assets/corals/custom-rocks/reef-center-arch.glb'),
      fileURLToPath(RUBBLE_TALUS_URL),
    ]
    const totalLiveBytes = liveRuntimeRockGlbs.reduce((sum, file) => sum + statSync(file).size, 0)
    expect(totalLiveBytes).toBeLessThan(5_000_000)
  })

  it('aligns NSA_MODULE_MOUNTS sockets and archetypes with checked-in custom-rocks inspections', () => {
    for (const [moduleId, mounts] of Object.entries(NSA_MODULE_MOUNTS)) {
      const inspectionPath = path.join(repoRoot, 'src/rendering/assets/corals/custom-rocks', `${moduleId}-inspection.json`)
      const inspection = JSON.parse(readFileSync(inspectionPath, 'utf8')) as {
        sockets: Array<{ name: string; archetype: string }>
      }
      const bySocket = new Map(inspection.sockets.map((socket) => [socket.name, socket.archetype]))
      expect(mounts.length).toBeGreaterThanOrEqual(1)
      for (const mount of mounts) {
        expect(bySocket.get(mount.socketName), `${moduleId}:${mount.socketName}`).toBe(mount.archetype)
        expect(MODULAR_CORAL_ASSET_URLS[mount.coralAssetId], mount.coralAssetId).toBeDefined()
        expect(mount.paletteOverride?.surfaceMode).toBe('baked-pbr')
        if (mount.rigidPaletteOverride) {
          expect(mount.rigidPaletteOverride.surfaceMode).toBe('baked-pbr')
          expect(mount.rigidPaletteOverride.fluorescenceStrength).toBe(0)
        }
      }
    }
  })

  it('creates 6 desktop and 2 phone non-pickable grounded aprons below habitat floor and disposes cloned materials only', () => {
    const sourceRoot = new THREE.Group()
    const sourceGeometry = new THREE.BoxGeometry(0.39, 0.094, 0.27)
    const sourceTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    const sourceMaterial = new THREE.MeshStandardMaterial({ map: sourceTexture })
    const sourceMesh = new THREE.Mesh(sourceGeometry, sourceMaterial)
    sourceRoot.add(sourceMesh)

    const sourceGeoSpy = vi.spyOn(sourceGeometry, 'dispose')
    const sourceMatSpy = vi.spyOn(sourceMaterial, 'dispose')
    const sourceTexSpy = vi.spyOn(sourceTexture, 'dispose')

    const desktopGroup = createRubbleTalusGroundingAprons(sourceRoot, false)
    const phoneGroup = createRubbleTalusGroundingAprons(sourceRoot, true)

    expect(desktopGroup.name).toBe('reef-nsa-rubble-talus-grounding')
    expect(desktopGroup.children).toHaveLength(6)
    expect(phoneGroup.children).toHaveLength(2)

    for (const [narrow, group] of [
      [false, desktopGroup],
      [true, phoneGroup],
    ] as const) {
      const placements = rubbleTalusPlacementsForViewport(narrow)
      group.children.forEach((child, idx) => {
        const apronTopY = child.position.y + 0.094 * placements[idx]!.scale
        expect(apronTopY).toBeLessThan(-2.25)
        child.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return
          expect(node.castShadow).toBe(true)
          expect(node.receiveShadow).toBe(true)
          expect(node.material).not.toBe(sourceMaterial)
          const hits: THREE.Intersection[] = []
          node.raycast(new THREE.Raycaster(), hits)
          expect(hits).toEqual([])
        })
      })
    }

    const clonedMaterialSpies: ReturnType<typeof vi.spyOn>[] = []
    desktopGroup.traverse((node) => {
      if (node instanceof THREE.Mesh) clonedMaterialSpies.push(vi.spyOn(node.material as THREE.Material, 'dispose'))
    })

    disposeRubbleTalusMaterials(desktopGroup)
    disposeRubbleTalusMaterials(phoneGroup)

    for (const spy of clonedMaterialSpies) expect(spy).toHaveBeenCalledTimes(1)
    expect(sourceGeoSpy).not.toHaveBeenCalled()
    expect(sourceMatSpy).not.toHaveBeenCalled()
    expect(sourceTexSpy).not.toHaveBeenCalled()
  })
})
