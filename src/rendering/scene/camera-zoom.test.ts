// @vitest-environment happy-dom
import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  clampCameraZoomState,
  dampCameraZoomState,
  DEFAULT_CAMERA_DISTANCE_M,
  DEFAULT_CAMERA_ZOOM_STATE,
  DEFAULT_FISH_FOCUS_DISTANCE_M,
  FOCAL_AREAS,
  isOverviewZoomState,
  MAX_CAMERA_DISTANCE_M,
  MIN_CAMERA_DISTANCE_M,
  MIN_CAMERA_POSITION_Z_M,
  overviewHalfWidthAtDepth,
  panCameraZoomState,
  stepZoomDistance,
  trackFocusedFishCameraState,
  zoomStateForFishPosition,
  zoomStateForFocalArea,
  zoomToCursor,
  type CameraZoomState,
} from './camera-zoom'
import { projectFishLinkBounds } from './fish-link-projection'

const state = (overrides: Partial<CameraZoomState> = {}): CameraZoomState => ({ ...DEFAULT_CAMERA_ZOOM_STATE, ...overrides })

describe('camera zoom clamping (AQ-62 AC #2)', () => {
  it('keeps the overview state unchanged', () => {
    expect(clampCameraZoomState({ ...DEFAULT_CAMERA_ZOOM_STATE })).toEqual(DEFAULT_CAMERA_ZOOM_STATE)
    expect(isOverviewZoomState(DEFAULT_CAMERA_ZOOM_STATE)).toBe(true)
  })

  it('clamps the focal target inside the water volume', () => {
    const clamped = clampCameraZoomState(state({ targetX: 9, targetY: -9, targetZ: -9, distance: 2 }))
    expect(clamped.targetX).toBe(3.2)
    expect(clamped.targetY).toBe(-2.0)
    expect(clamped.targetZ).toBe(-2.4)
    expect(clamped.distance).toBeGreaterThanOrEqual(MIN_CAMERA_DISTANCE_M)
  })

  it('never lets the camera sit among the fish, even at the rearmost target', () => {
    // At target z = -2.4 the distance floor rises so camera z stays >= 3.15.
    const clamped = clampCameraZoomState(state({ targetZ: -2.4, distance: MIN_CAMERA_DISTANCE_M }))
    expect(clamped.targetZ + clamped.distance).toBeGreaterThanOrEqual(MIN_CAMERA_POSITION_Z_M)
    for (const area of FOCAL_AREAS) {
      const atArea = clampCameraZoomState(area.state)
      expect(atArea.targetZ + atArea.distance).toBeGreaterThanOrEqual(MIN_CAMERA_POSITION_Z_M)
    }
  })

  it('clamps distance to the overview distance at the far end', () => {
    expect(clampCameraZoomState(state({ distance: 99 })).distance).toBe(MAX_CAMERA_DISTANCE_M)
  })
})

describe('overview frustum habitat width', () => {
  it('uses the reef-plane width for tank bounds and narrows fish at the front glass', () => {
    expect(overviewHalfWidthAtDepth(1440 / 900, 2.8)).toBeCloseTo(3.65, 1)
    expect(overviewHalfWidthAtDepth(1440 / 900, -1.35)).toBe(5.2)
    expect(overviewHalfWidthAtDepth(1440 / 900, -4.6)).toBe(5.2)
    expect(overviewHalfWidthAtDepth(402 / 874, -1.35)).toBeGreaterThan(overviewHalfWidthAtDepth(402 / 874, 2.8))
    expect(overviewHalfWidthAtDepth(0, 0)).toBe(0)
    expect(overviewHalfWidthAtDepth(1, Number.NaN)).toBe(0)
  })
})

describe('camera zoom steps and focal areas (AQ-62 AC #1)', () => {
  it('steps in and out by a fixed factor and stops at the limits', () => {
    expect(stepZoomDistance(9, 'in')).toBeCloseTo(9 / 1.35, 10)
    expect(stepZoomDistance(9, 'out')).toBe(MAX_CAMERA_DISTANCE_M)
    expect(stepZoomDistance(MIN_CAMERA_DISTANCE_M, 'in')).toBe(MIN_CAMERA_DISTANCE_M)
  })

  it('resolves every focal area to a clamped, in-volume state', () => {
    for (const area of FOCAL_AREAS) {
      const resolved = zoomStateForFocalArea(area.id)
      expect(resolved).toBeDefined()
      expect(clampCameraZoomState(resolved!)).toEqual(resolved)
      expect(isOverviewZoomState(resolved!)).toBe(area.id === 'overview')
    }
    expect(zoomStateForFocalArea('nope' as never)).toBeUndefined()
  })

  it('zoom-to-cursor keeps the cursor point fixed on screen', () => {
    const aspect = 1440 / 900
    const fov = 42
    const before = state()
    const ndcX = 0.5
    const ndcY = -0.25
    const after = zoomToCursor(before, aspect, fov, ndcX, ndcY, 5.5)
    expect(after.distance).toBeCloseTo(5.5, 10)
    // The world point under the cursor before the zoom must project back to
    // the same NDC after it: recompute it from the new state and compare.
    const halfHeightBefore = Math.tan((fov * Math.PI) / 360) * before.distance
    const pointX = before.targetX + ndcX * halfHeightBefore * aspect
    const pointY = before.targetY + ndcY * halfHeightBefore
    const halfHeightAfter = Math.tan((fov * Math.PI) / 360) * after.distance
    const ndcXAfter = (pointX - after.targetX) / (halfHeightAfter * aspect)
    const ndcYAfter = (pointY - after.targetY) / halfHeightAfter
    expect(ndcXAfter).toBeCloseTo(ndcX, 10)
    expect(ndcYAfter).toBeCloseTo(ndcY, 10)
  })

  it('zoom-to-cursor at a distance limit does not move the target', () => {
    const atMin = state({ distance: MIN_CAMERA_DISTANCE_M })
    expect(zoomToCursor(atMin, 16 / 9, 42, 0.5, 0.5, 1)).toEqual(atMin)
  })

  it('pans the target by the dragged screen distance, clamped to the volume', () => {
    const zoomed = state({ targetX: 0, targetY: 0, targetZ: -1.2, distance: 5.5 })
    const panned = panCameraZoomState(zoomed, 42, 900, 100, -50)
    // Dragging right moves the view right (target moves left); dragging up
    // (negative dy) moves the view up (target moves down in world y).
    expect(panned.targetX).toBeLessThan(zoomed.targetX)
    expect(panned.targetY).toBeLessThan(zoomed.targetY)
    const far = panCameraZoomState(zoomed, 42, 900, 100000, 100000)
    expect(far.targetX).toBe(-3.2)
    expect(far.targetY).toBe(1.2)
  })

  it('damps toward the desired state and snaps when close', () => {
    const desired = state({ targetX: -2.35, targetY: -0.6, targetZ: -1.35, distance: 5.5 })
    const stepped = dampCameraZoomState({ ...DEFAULT_CAMERA_ZOOM_STATE }, desired, 1 / 60)
    expect(stepped.distance).toBeGreaterThan(desired.distance)
    expect(stepped.distance).toBeLessThan(DEFAULT_CAMERA_DISTANCE_M)
    expect(stepped.targetX).toBeLessThan(0)
    const settled = dampCameraZoomState({ ...DEFAULT_CAMERA_ZOOM_STATE }, desired, 60)
    expect(settled).toEqual(desired)
    expect(dampCameraZoomState(desired, desired, 0)).toEqual(desired)
  })
})

describe('fish links under a zoomed camera (AQ-62 AC #4)', () => {
  function cameraFor(zoom: CameraZoomState) {
    const camera = new PerspectiveCamera(42, 1440 / 900, 0.1, 60)
    camera.position.set(zoom.targetX, zoom.targetY, zoom.targetZ + zoom.distance)
    camera.lookAt(zoom.targetX, zoom.targetY, zoom.targetZ)
    camera.updateMatrixWorld(true)
    return camera
  }

  it('a fish at the focal point keeps a valid, centred link when zoomed', () => {
    const scratch = new Vector3()
    const focal = new Vector3(-2.35, -0.6, -1.35)
    const overview = projectFishLinkBounds(focal, cameraFor(DEFAULT_CAMERA_ZOOM_STATE), 1440, 900, 0.2, scratch)
    const zoomed = projectFishLinkBounds(focal, cameraFor(zoomStateForFocalArea('left-reef')!), 1440, 900, 0.2, scratch)
    expect(overview).toBeDefined()
    expect(zoomed).toBeDefined()
    // Zoomed in, the same fish reads larger on screen and sits near centre.
    expect(zoomed!.width).toBeGreaterThan(overview!.width)
    expect(Math.abs(zoomed!.x + zoomed!.width / 2 - 720)).toBeLessThan(60)
    expect(Math.abs(zoomed!.y + zoomed!.height / 2 - 450)).toBeLessThan(60)
    // The 44px minimum link target survives zooming.
    expect(zoomed!.width).toBeGreaterThanOrEqual(44)
    expect(zoomed!.height).toBeGreaterThanOrEqual(44)
  })

  it('a fish far from the focal point leaves the view when zoomed', () => {
    const scratch = new Vector3()
    const farFish = new Vector3(2.65, -0.6, -1.2)
    const overview = projectFishLinkBounds(farFish, cameraFor(DEFAULT_CAMERA_ZOOM_STATE), 1440, 900, 0.2, scratch)
    expect(overview).toBeDefined()
    const zoomed = projectFishLinkBounds(farFish, cameraFor(zoomStateForFocalArea('left-reef')!), 1440, 900, 0.2, scratch)
    // Either it no longer projects, or its link box is entirely off-screen.
    if (zoomed) expect(zoomed.x > 1440 || zoomed.x + zoomed.width < 0 || zoomed.y > 900 || zoomed.y + zoomed.height < 0).toBe(true)
  })
})

describe('click-to-focus fish camera dolly and tracking (AQ-100 AC #1, #2, #4)', () => {
  it('computes a clamped focus zoom state and smoothly dollies toward a swimming fish', () => {
    const fishPos = { x: -1.4, y: 0.4, z: -0.8 }
    const desired = zoomStateForFishPosition(fishPos)
    expect(desired.targetX).toBeCloseTo(-1.4, 5)
    expect(desired.targetY).toBeCloseTo(0.4, 5)
    expect(desired.targetZ).toBeCloseTo(-0.8, 5)
    expect(desired.distance).toBeCloseTo(DEFAULT_FISH_FOCUS_DISTANCE_M, 5)
    expect(desired.targetZ + desired.distance).toBeGreaterThanOrEqual(MIN_CAMERA_POSITION_Z_M)

    const stepped = trackFocusedFishCameraState(DEFAULT_CAMERA_ZOOM_STATE, fishPos, 1 / 60)
    expect(stepped.distance).toBeLessThan(DEFAULT_CAMERA_DISTANCE_M)
    expect(stepped.distance).toBeGreaterThan(desired.distance)

    // Under prefers-reduced-motion or paused, transitions cut immediately without dolly motion
    expect(trackFocusedFishCameraState(DEFAULT_CAMERA_ZOOM_STATE, fishPos, 1 / 60, { reducedMotion: true })).toEqual(desired)
    expect(trackFocusedFishCameraState(DEFAULT_CAMERA_ZOOM_STATE, fishPos, 1 / 60, { paused: true })).toEqual(desired)
  })
})
