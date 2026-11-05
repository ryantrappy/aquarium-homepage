import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { deriveReefHabitat, instantiateReefHabitat } from './habitat'
import reefHabitat from './reef-habitat.json'
import { fishClearanceRadius } from './fish-scale'
import { resolveHabitatRoute } from '../../simulation/habitat-navigation'

describe('actual reef triangle envelopes', () => {
  it('covers the source surfaces without turning every column into the global-height box', () => {
    const scene = new THREE.Group()
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4, .2, 4)); floor.position.y = -.1; scene.add(floor)
    const rock = new THREE.Mesh(new THREE.BoxGeometry(.7, 1, .7)); rock.position.set(-1.2, .5, -1.2); scene.add(rock)
    const { obstacles, anchors } = deriveReefHabitat(scene, -.3, 'scan')
    expect(obstacles).toHaveLength(16)
    expect(Math.max(...obstacles.map(box => box.bounds.max.y))).toBeGreaterThan(.9)
    expect(obstacles.some(box => box.bounds.max.y < .1)).toBe(true)
    scene.updateMatrixWorld(true)
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const attribute = object.geometry.getAttribute('position'), point = new THREE.Vector3()
      for (let i = 0; i < attribute.count; i++) {
        point.fromBufferAttribute(attribute, i).applyMatrix4(object.matrixWorld)
        expect(obstacles.some(({ bounds: b }) => point.x >= b.min.x - 1e-6 && point.x <= b.max.x + 1e-6 && point.z >= b.min.z - 1e-6 && point.z <= b.max.z + 1e-6 && point.y <= b.max.y && point.y >= b.min.y)).toBe(true)
      }
    })
    expect(anchors.every(anchor => anchor.anchor === 'grazingSurface' && anchor.compatibleSpecies?.[0] === 'yellow-tang')).toBe(true)
    expect(anchors.length).toBeGreaterThan(0)
  })

  it('keeps instantiated grazingSurface anchors reachable for yellow-tang with its true AQ-60 clearance radius (0.57) at mobile and desktop placements (AQ-45)', () => {
    const clearance = fishClearanceRadius('yellow-tang')
    expect(clearance).toBeCloseTo(0.57, 6)

    const mobile = instantiateReefHabitat(
      reefHabitat as Parameters<typeof instantiateReefHabitat>[0],
      { x: 3.6, y: 5, z: 1.4 },
      { x: -0.4, y: -1.65, z: -1.1 },
      -2.74,
      'reef-0',
      0.08,
    )
    const grazingAnchor = mobile.anchors.find(anchor => anchor.anchor === 'grazingSurface')!
    const sourceAnchor = reefHabitat.anchors.find(anchor => `reef-0-${anchor.id}` === grazingAnchor.id)!
    expect(grazingAnchor.position.y - (sourceAnchor.position.y * 5 - 1.65)).toBeCloseTo(clearance + .03, 6)
    const mobileRoute = resolveHabitatRoute({
      request: { instanceId: 'tang-mobile', speciesId: 'yellow-tang', state: 'forage', anchor: 'grazingSurface', cue: 'foraging-opportunity', generation: 1 },
      start: { x: 0, y: 1.25, z: 1.8 },
      waterBounds: { min: { x: -1.6, y: -2.25, z: -4.6 }, max: { x: 1.6, y: 2.8, z: 2.8 } },
      obstacles: mobile.obstacles,
      anchorLocations: mobile.anchors,
      fishClearanceRadius: clearance,
    })
    expect(mobileRoute.status).toBe('route')

    const desktopLeft = instantiateReefHabitat(
      reefHabitat as Parameters<typeof instantiateReefHabitat>[0],
      { x: 4.6, y: 6.2, z: 1.8 },
      { x: -3.2, y: -1.62, z: -1.1 },
      -2.74,
      'reef-0',
      0.1,
    )
    const desktopRight = instantiateReefHabitat(
      reefHabitat as Parameters<typeof instantiateReefHabitat>[0],
      { x: 3.4, y: 4.6, z: 1.5 },
      { x: 3.4, y: -2.09, z: -0.9 },
      -2.74,
      'reef-1',
      -0.18,
    )
    const desktopRoute = resolveHabitatRoute({
      request: { instanceId: 'tang-desktop', speciesId: 'yellow-tang', state: 'forage', anchor: 'grazingSurface', cue: 'foraging-opportunity', generation: 1 },
      start: { x: 0, y: 1.45, z: 1.8 },
      waterBounds: { min: { x: -3.8, y: -2.25, z: -4.6 }, max: { x: 3.8, y: 2.8, z: 2.8 } },
      obstacles: [...desktopLeft.obstacles, ...desktopRight.obstacles],
      anchorLocations: [...desktopLeft.anchors, ...desktopRight.anchors],
      fishClearanceRadius: clearance,
    })
    expect(desktopRoute.status).toBe('route')
  })
})
