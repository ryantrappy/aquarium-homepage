import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { projectFishLinkBounds } from './fish-link-projection'

function fixture() {
  const camera = new PerspectiveCamera(42, 1440 / 900, .1, 60)
  camera.position.set(0, .15, 9); camera.lookAt(0, .15, 0); camera.updateMatrixWorld(true)
  const scratch = new Vector3()
  return { camera, project: (position: Vector3, width = 1440, height = 900) => projectFishLinkBounds(position, camera, width, height, 1, scratch) }
}

describe('fish link camera projection', () => {
  it('tracks every consecutive moving pose with positive bounds at both target viewports', () => {
    for (const [width, height] of [[1440, 900], [402, 874]]) {
      const { camera, project } = fixture()
      camera.aspect = width / height; camera.updateProjectionMatrix()
      let previousX = -Infinity
      for (let frame = 0; frame < 60; frame++) {
        const bounds = project(new Vector3(-.5 + frame / 60, 0, 0), width, height)!
        expect(bounds.x).toBeGreaterThan(previousX)
        expect(bounds.width).toBeGreaterThanOrEqual(44)
        expect(bounds.height).toBeGreaterThanOrEqual(44)
        expect(Object.values(bounds).every(Number.isFinite)).toBe(true)
        previousX = bounds.x
      }
    }
  })
  it('rejects points on/behind the camera, inside the near plane and beyond the far plane', () => {
    const { project } = fixture()
    for (const z of [9, 9.1, 20, 8.95, -52]) expect(project(new Vector3(0, 0, z))).toBeUndefined()
    expect(project(new Vector3(0, 0, 8.8))).toBeDefined()
  })
  it('rejects nonfinite projections instead of writing invalid CSS', () => {
    const { project } = fixture()
    for (const position of [new Vector3(NaN, 0, 0), new Vector3(0, Infinity, 0), new Vector3(0, 0, -Infinity)]) expect(project(position)).toBeUndefined()
  })
  it('uses camera-space depth when the camera direction changes', () => {
    const { camera, project } = fixture()
    camera.position.set(9, 0, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true)
    expect(project(new Vector3(0, 0, 0))).toBeDefined()
    expect(project(new Vector3(10, 0, 0))).toBeUndefined()
  })
})
