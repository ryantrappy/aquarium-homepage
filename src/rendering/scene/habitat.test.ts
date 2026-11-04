import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { deriveReefHabitat } from './habitat'

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
})
