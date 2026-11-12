// Camera zoom into focal areas of the reef aquascape (AQ-62).
//
// The scene keeps its sharp front-on view: the camera always looks straight
// down -Z at a focal target, and zooming dollies it toward that target while
// panning the target itself. No orbit, no tilt — the contained-tank framing
// from AGENTS.md is preserved at every zoom state.
//
// This module is pure arithmetic (no THREE dependency) so the clamping and
// zoom-to-cursor math can be unit-tested without a renderer. aquarium.ts
// owns the live camera and applies these states; AquariumScene.tsx owns the
// buttons and the Esc reset.

export type CameraZoomState = {
  /** World point the camera looks at. */
  targetX: number
  targetY: number
  targetZ: number
  /** Distance from the camera to the focal target, in metres. */
  distance: number
}

/** Default full-tank overview: the camera setup from createAquarium(). */
export const DEFAULT_CAMERA_TARGET = { x: 0, y: 0.15, z: 0 }
export const DEFAULT_CAMERA_DISTANCE_M = 9
/** Closest the camera may come to its focal target. */
export const MIN_CAMERA_DISTANCE_M = 4.5
export const MAX_CAMERA_DISTANCE_M = DEFAULT_CAMERA_DISTANCE_M
/**
 * Closest the camera itself may come to the reef, in world z. The fish
 * volume runs to z = 2.8, so the camera never sits among the fish: the
 * effective minimum distance is max(MIN_CAMERA_DISTANCE_M,
 * MIN_CAMERA_POSITION_Z_M - targetZ), which keeps the camera at z >= 3.15
 * for every clamped target — ahead of the fish volume and the front glass
 * line, and clear of the live rock (AQ-62 AC #2).
 */
export const MIN_CAMERA_POSITION_Z_M = 3.15

/** The focal target must stay inside the water volume and ahead of the rear
 * wall (z = -4.6), with room for the camera in front of the fish volume. */
export const FOCAL_TARGET_BOUNDS = {
  x: { min: -3.2, max: 3.2 },
  y: { min: -2.0, max: 1.2 },
  z: { min: -2.4, max: 0.6 },
}

export const DEFAULT_CAMERA_ZOOM_STATE: CameraZoomState = {
  targetX: DEFAULT_CAMERA_TARGET.x,
  targetY: DEFAULT_CAMERA_TARGET.y,
  targetZ: DEFAULT_CAMERA_TARGET.z,
  distance: DEFAULT_CAMERA_DISTANCE_M,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function clampCameraZoomState(state: CameraZoomState): CameraZoomState {
  const targetZ = clamp(state.targetZ, FOCAL_TARGET_BOUNDS.z.min, FOCAL_TARGET_BOUNDS.z.max)
  // The camera must stay ahead of the fish volume (see
  // MIN_CAMERA_POSITION_Z_M): a rearmost target needs a longer distance.
  const minDistance = Math.max(MIN_CAMERA_DISTANCE_M, MIN_CAMERA_POSITION_Z_M - targetZ)
  return {
    targetX: clamp(state.targetX, FOCAL_TARGET_BOUNDS.x.min, FOCAL_TARGET_BOUNDS.x.max),
    targetY: clamp(state.targetY, FOCAL_TARGET_BOUNDS.y.min, FOCAL_TARGET_BOUNDS.y.max),
    targetZ,
    distance: clamp(state.distance, minDistance, MAX_CAMERA_DISTANCE_M),
  }
}

export function isOverviewZoomState(state: CameraZoomState): boolean {
  return (
    state.distance >= MAX_CAMERA_DISTANCE_M - 0.001 &&
    Math.abs(state.targetX - DEFAULT_CAMERA_TARGET.x) < 0.001 &&
    Math.abs(state.targetY - DEFAULT_CAMERA_TARGET.y) < 0.001 &&
    Math.abs(state.targetZ - DEFAULT_CAMERA_TARGET.z) < 0.001
  )
}

export type FocalAreaId = 'overview' | 'left-reef' | 'right-reef' | 'sand-bed'

export type FocalArea = {
  id: FocalAreaId
  label: string
  state: CameraZoomState
}

/**
 * Named focal areas (AQ-62 AC #1). The reef targets sit on the live-rock
 * island placements from rebuildHabitat() — left island centred at
 * (-2.35, -2.70, -1.35), right island at (2.65, -2.70, -1.20) — aimed at
 * their coral canopies (y ≈ -0.6) rather than their bases. The sand target
 * sits in the open middle gap between the islands, above the bed. Every
 * target keeps the camera (target.z + distance) at z >= 3.15, ahead of the
 * fish volume's front bound (z = 2.8), so zooming never clips into a fish
 * or the front glass (AQ-62 AC #2).
 */
export const FOCAL_AREAS: ReadonlyArray<FocalArea> = [
  { id: 'overview', label: 'Full tank overview', state: { ...DEFAULT_CAMERA_ZOOM_STATE } },
  { id: 'left-reef', label: 'Left reef', state: { targetX: -2.35, targetY: -0.6, targetZ: -1.35, distance: 5.5 } },
  { id: 'right-reef', label: 'Right reef', state: { targetX: 2.65, targetY: -0.6, targetZ: -1.2, distance: 5.5 } },
  { id: 'sand-bed', label: 'Sand bed', state: { targetX: 0.15, targetY: -1.85, targetZ: -1.0, distance: 6 } },
]

export function zoomStateForFocalArea(id: FocalAreaId): CameraZoomState | undefined {
  const area = FOCAL_AREAS.find(candidate => candidate.id === id)
  return area ? { ...area.state } : undefined
}

/** One button step in or out (AQ-62 AC #1). */
export const ZOOM_STEP_FACTOR = 1.35

export function stepZoomDistance(distance: number, direction: 'in' | 'out'): number {
  const next = direction === 'in' ? distance / ZOOM_STEP_FACTOR : distance * ZOOM_STEP_FACTOR
  return clamp(next, MIN_CAMERA_DISTANCE_M, MAX_CAMERA_DISTANCE_M)
}

/**
 * Zoom toward the point under the cursor (AQ-62 AC #1). The camera is
 * front-on, so the world point at the focal plane for a normalised-device
 * cursor position is target + ndc * tan(fov/2) * distance (* aspect for x).
 * The new target is shifted so that point stays under the cursor as the
 * distance changes: target' = target + (point - target) * (1 - new/old).
 * The result is clamped to the water volume (AQ-62 AC #2).
 */
export function zoomToCursor(
  state: CameraZoomState,
  aspect: number,
  fovDegrees: number,
  ndcX: number,
  ndcY: number,
  newDistance: number,
): CameraZoomState {
  const clampedDistance = clamp(newDistance, MIN_CAMERA_DISTANCE_M, MAX_CAMERA_DISTANCE_M)
  if (clampedDistance === state.distance) return { ...state }
  const halfHeight = Math.tan((fovDegrees * Math.PI) / 360) * state.distance
  const halfWidth = halfHeight * aspect
  const pointX = state.targetX + ndcX * halfWidth
  const pointY = state.targetY + ndcY * halfHeight
  const scale = clampedDistance / state.distance
  return clampCameraZoomState({
    targetX: state.targetX + (pointX - state.targetX) * (1 - scale),
    targetY: state.targetY + (pointY - state.targetY) * (1 - scale),
    targetZ: state.targetZ,
    distance: clampedDistance,
  })
}

/** Pan the focal target by a screen-space drag, in pixels (positive dx drags
 * the view right, positive dy drags it down). `viewportHeightPx` converts
 * pixels to metres at the focal plane. */
export function panCameraZoomState(
  state: CameraZoomState,
  fovDegrees: number,
  viewportHeightPx: number,
  dxPx: number,
  dyPx: number,
): CameraZoomState {
  if (viewportHeightPx <= 0) return { ...state }
  const worldPerPixel = (2 * Math.tan((fovDegrees * Math.PI) / 360) * state.distance) / viewportHeightPx
  return clampCameraZoomState({
    ...state,
    targetX: state.targetX - dxPx * worldPerPixel,
    targetY: state.targetY + dyPx * worldPerPixel,
  })
}

/** Frame-rate-independent smoothing step toward the desired state
 * (AQ-62 AC #1). Returns the desired state itself once close enough. */
export const CAMERA_ZOOM_SMOOTHING_RATE_PER_SECOND = 6

export function dampCameraZoomState(current: CameraZoomState, desired: CameraZoomState, dtSeconds: number): CameraZoomState {
  if (dtSeconds <= 0) return { ...desired }
  const factor = 1 - Math.exp(-CAMERA_ZOOM_SMOOTHING_RATE_PER_SECOND * dtSeconds)
  const next: CameraZoomState = {
    targetX: current.targetX + (desired.targetX - current.targetX) * factor,
    targetY: current.targetY + (desired.targetY - current.targetY) * factor,
    targetZ: current.targetZ + (desired.targetZ - current.targetZ) * factor,
    distance: current.distance + (desired.distance - current.distance) * factor,
  }
  const close =
    Math.abs(next.targetX - desired.targetX) < 0.001 &&
    Math.abs(next.targetY - desired.targetY) < 0.001 &&
    Math.abs(next.targetZ - desired.targetZ) < 0.001 &&
    Math.abs(next.distance - desired.distance) < 0.001
  return close ? { ...desired } : next
}

/** Default dolly distance when focusing on an individual service fish (AQ-100 AC #1). */
export const DEFAULT_FISH_FOCUS_DISTANCE_M = 4.8

/**
 * Resolves a clamped camera zoom state focused on a specific fish's 3D position
 * (AQ-100 AC #1/#2). Keeps the camera ahead of the fish volume (`z >= 3.15`) so
 * focusing never clips into foreground fish or rock geometry.
 */
export function zoomStateForFishPosition(
  fishPosition: Readonly<{ x: number; y: number; z: number }>,
  distanceM = DEFAULT_FISH_FOCUS_DISTANCE_M,
): CameraZoomState {
  const x = Number.isFinite(fishPosition.x) ? fishPosition.x : DEFAULT_CAMERA_TARGET.x
  const y = Number.isFinite(fishPosition.y) ? fishPosition.y : DEFAULT_CAMERA_TARGET.y
  const z = Number.isFinite(fishPosition.z) ? fishPosition.z : DEFAULT_CAMERA_TARGET.z
  const dist = Number.isFinite(distanceM) ? distanceM : DEFAULT_FISH_FOCUS_DISTANCE_M
  return clampCameraZoomState({
    targetX: x,
    targetY: y,
    targetZ: z,
    distance: dist,
  })
}

/**
 * Tracks a focused fish's moving 3D position with smooth damped camera interpolation,
 * or cuts/snaps immediately without dolly motion when `reducedMotion` or `paused` is active
 * (AQ-100 AC #1, #2, #4).
 */
export function trackFocusedFishCameraState(
  current: CameraZoomState,
  fishPosition: Readonly<{ x: number; y: number; z: number }>,
  dtSeconds: number,
  options: { distanceM?: number; reducedMotion?: boolean; paused?: boolean } = {},
): CameraZoomState {
  const desired = zoomStateForFishPosition(
    fishPosition,
    options.distanceM ?? DEFAULT_FISH_FOCUS_DISTANCE_M,
  )
  if (options.reducedMotion || options.paused) {
    return { ...desired }
  }
  return dampCameraZoomState(current, desired, dtSeconds)
}
