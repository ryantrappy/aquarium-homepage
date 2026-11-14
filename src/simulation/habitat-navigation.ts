import { getSpeciesBehaviorProfile, type HabitatAnchor, type SpeciesBehaviorId } from '../lib/fish-behavior'
import type { NavigationRequest } from './behavior-runtime'

export type Vec3 = Readonly<{ x: number; y: number; z: number }>
export type AxisAlignedBox = Readonly<{ min: Vec3; max: Vec3 }>
export type MaxAbsXAtDepth = (z: number) => number

export type SolidObstacleVolume = {
  id: string
  bounds: AxisAlignedBox
}

/** Positions are supplied by a scene adapter; this module does not invent reef locations. */
export type HabitatAnchorLocation = {
  id: string
  anchor: HabitatAnchor
  position: Vec3
  /** Authored interaction radius derived from a mounted soft host, when supplied. */
  softHomeRadius?: number
  compatibleSpecies?: readonly SpeciesBehaviorId[]
}

export type ResolveHabitatRouteInput = {
  request: NavigationRequest
  start: Vec3
  waterBounds: AxisAlignedBox
  obstacles: readonly SolidObstacleVolume[]
  anchorLocations: readonly HabitatAnchorLocation[]
  fishClearanceRadius: number
  maxAbsXAtDepth?: MaxAbsXAtDepth
  lateralClearanceRadius?: number
}

export type HabitatRouteResult =
  | {
      status: 'route'
      instanceId: string
      generation: number
      speciesId: string
      anchor: HabitatAnchor
      locationId: string
      path: readonly Vec3[]
      length: number
    }
  | {
      status: 'blocked' | 'unavailable'
      instanceId: string
      generation: number
      speciesId: string
      anchor: HabitatAnchor
    }

const MAX_OBSTACLE_VOLUMES = 32
const MAX_ANCHOR_LOCATIONS = 128
const CORNER_CLEARANCE = 1e-4
const COORDINATE_EPSILON = 1e-9

function finiteVec(point: Vec3): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)
}

function validateBox(box: AxisAlignedBox, label: string) {
  if (!finiteVec(box.min) || !finiteVec(box.max)) throw new RangeError(`${label} must use finite 3D coordinates.`)
  if (!(box.min.x < box.max.x && box.min.y < box.max.y && box.min.z < box.max.z)) {
    throw new RangeError(`${label} must have positive width, height, and depth.`)
  }
}

function validateInput(input: ResolveHabitatRouteInput) {
  const { request, start, waterBounds, obstacles, anchorLocations, fishClearanceRadius } = input
  if (!request.instanceId.trim() || !Number.isSafeInteger(request.generation) || request.generation < 0) {
    throw new RangeError('Navigation request requires a non-empty instance ID and non-negative safe generation.')
  }
  if (!finiteVec(start)) throw new RangeError('Fish start position must use finite 3D coordinates.')
  if (!Number.isFinite(fishClearanceRadius) || fishClearanceRadius < 0) {
    throw new RangeError('Fish clearance radius must be finite and non-negative.')
  }
  if (input.lateralClearanceRadius !== undefined && (!Number.isFinite(input.lateralClearanceRadius) || input.lateralClearanceRadius < 0)) {
    throw new RangeError('Lateral clearance radius must be finite and non-negative.')
  }
  validateBox(waterBounds, 'Water bounds')
  if (obstacles.length > MAX_OBSTACLE_VOLUMES) throw new RangeError(`Navigation supports at most ${MAX_OBSTACLE_VOLUMES} obstacle volumes per request.`)
  if (anchorLocations.length > MAX_ANCHOR_LOCATIONS) throw new RangeError(`Navigation supports at most ${MAX_ANCHOR_LOCATIONS} anchor locations per request.`)
  const obstacleIds = new Set<string>()
  for (const obstacle of obstacles) {
    if (!obstacle.id.trim() || obstacleIds.has(obstacle.id)) throw new RangeError('Obstacle IDs must be non-empty and unique per request.')
    obstacleIds.add(obstacle.id)
    validateBox(obstacle.bounds, `Obstacle ${obstacle.id}`)
  }
  const anchorIds = new Set<string>()
  for (const location of anchorLocations) {
    if (!location.id.trim() || anchorIds.has(location.id)) throw new RangeError('Anchor location IDs must be non-empty and unique per request.')
    anchorIds.add(location.id)
    if (!finiteVec(location.position)) throw new RangeError(`Anchor location ${location.id} must use finite 3D coordinates.`)
  }
}

function strictPointInside(point: Vec3, box: AxisAlignedBox): boolean {
  return point.x > box.min.x && point.x < box.max.x
    && point.y > box.min.y && point.y < box.max.y
    && point.z > box.min.z && point.z < box.max.z
}

function inflate(box: AxisAlignedBox, radius: number): AxisAlignedBox {
  return {
    min: { x: box.min.x - radius, y: box.min.y - radius, z: box.min.z - radius },
    max: { x: box.max.x + radius, y: box.max.y + radius, z: box.max.z + radius },
  }
}

type ExpandedObstacleCacheEntry = {
  sourceVolumes: readonly SolidObstacleVolume[]
  bounds: readonly number[]
  expanded: readonly AxisAlignedBox[]
}

// Obstacle arrays are stable for a mounted habitat. Keep one expanded-box
// array per clearance radius and source array so movement checks can reuse the
// same geometry. Snapshot primitive bounds as well as object references to
// invalidate correctly if a caller mutates a habitat in place.
const expandedObstacleCache = new WeakMap<readonly SolidObstacleVolume[], Map<number, ExpandedObstacleCacheEntry>>()

/** Returns cached clearance-inflated boxes, refreshing when source geometry changes. */
export function getClearanceExpandedObstacles(
  obstacles: readonly SolidObstacleVolume[],
  clearanceRadius: number,
): readonly AxisAlignedBox[] {
  if (!Number.isFinite(clearanceRadius) || clearanceRadius < 0) throw new RangeError('Obstacle clearance must be finite and non-negative.')
  let byRadius = expandedObstacleCache.get(obstacles)
  if (!byRadius) {
    byRadius = new Map()
    expandedObstacleCache.set(obstacles, byRadius)
  }

  const cached = byRadius.get(clearanceRadius)
  let unchanged = Boolean(cached && cached.sourceVolumes.length === obstacles.length)
  if (unchanged && cached) {
    for (let index = 0; index < obstacles.length; index += 1) {
      const bounds = obstacles[index].bounds
      const offset = index * 6
      if (cached.sourceVolumes[index] !== obstacles[index]
        || cached.bounds[offset] !== bounds.min.x || cached.bounds[offset + 1] !== bounds.min.y || cached.bounds[offset + 2] !== bounds.min.z
        || cached.bounds[offset + 3] !== bounds.max.x || cached.bounds[offset + 4] !== bounds.max.y || cached.bounds[offset + 5] !== bounds.max.z) {
        unchanged = false
        break
      }
    }
  }
  if (unchanged && cached) return cached.expanded

  const bounds: number[] = []
  const expanded = Object.freeze(obstacles.map(({ bounds: sourceBounds }) => {
    bounds.push(sourceBounds.min.x, sourceBounds.min.y, sourceBounds.min.z, sourceBounds.max.x, sourceBounds.max.y, sourceBounds.max.z)
    const box = inflate(sourceBounds, clearanceRadius)
    return Object.freeze({ min: Object.freeze(box.min), max: Object.freeze(box.max) })
  }))
  byRadius.set(clearanceRadius, { sourceVolumes: obstacles.slice(), bounds: Object.freeze(bounds), expanded })
  return expanded
}

export function isWithinDepthAwareWaterBounds(
  point: Vec3,
  waterBounds: AxisAlignedBox,
  clearanceRadius: number,
  maxAbsXAtDepth?: MaxAbsXAtDepth,
  lateralClearanceRadius = clearanceRadius,
): boolean {
  if (!finiteVec(point) || !finiteVec(waterBounds.min) || !finiteVec(waterBounds.max)
    || !Number.isFinite(clearanceRadius) || clearanceRadius < 0
    || !Number.isFinite(lateralClearanceRadius) || lateralClearanceRadius < 0) return false
  if (point.x < waterBounds.min.x + lateralClearanceRadius || point.x > waterBounds.max.x - lateralClearanceRadius
    || point.y < waterBounds.min.y + clearanceRadius || point.y > waterBounds.max.y - clearanceRadius
    || point.z < waterBounds.min.z + clearanceRadius || point.z > waterBounds.max.z - clearanceRadius) return false
  if (!maxAbsXAtDepth) return true
  try {
    const maxAbsX = maxAbsXAtDepth(point.z)
    return Number.isFinite(maxAbsX) && maxAbsX >= lateralClearanceRadius && Math.abs(point.x) <= maxAbsX - lateralClearanceRadius
  } catch {
    return false
  }
}

function safePoint(
  point: Vec3,
  waterBounds: AxisAlignedBox,
  clearanceRadius: number,
  obstacles: readonly AxisAlignedBox[],
  maxAbsXAtDepth?: MaxAbsXAtDepth,
  lateralClearanceRadius = clearanceRadius,
): boolean {
  if (!isWithinDepthAwareWaterBounds(point, waterBounds, clearanceRadius, maxAbsXAtDepth, lateralClearanceRadius)) return false
  return obstacles.every((obstacle) => !strictPointInside(point, obstacle))
}

/** True when the segment crosses an obstacle interior; tangential contact along a face is allowed. */
function segmentHitsBoxInterior(start: Vec3, end: Vec3, box: AxisAlignedBox): boolean {
  const delta = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z }
  let enter = 0
  let leave = 1
  for (const axis of ['x', 'y', 'z'] as const) {
    const origin = start[axis]
    const direction = delta[axis]
    const minimum = box.min[axis]
    const maximum = box.max[axis]
    if (Math.abs(direction) <= COORDINATE_EPSILON) {
      if (origin <= minimum || origin >= maximum) return false
      continue
    }
    const first = (minimum - origin) / direction
    const second = (maximum - origin) / direction
    enter = Math.max(enter, Math.min(first, second))
    leave = Math.min(leave, Math.max(first, second))
    if (enter >= leave) return false
  }
  const sampleAt = (Math.max(enter, 0) + Math.min(leave, 1)) / 2
  if (!(sampleAt > 0 && sampleAt < 1)) return false
  const sample = {
    x: start.x + delta.x * sampleAt,
    y: start.y + delta.y * sampleAt,
    z: start.z + delta.z * sampleAt,
  }
  return strictPointInside(sample, box)
}

function segmentClear(start: Vec3, end: Vec3, obstacles: readonly AxisAlignedBox[]): boolean {
  return obstacles.every((obstacle) => !segmentHitsBoxInterior(start, end, obstacle))
}

function distance(a: Vec3, b: Vec3): number {
  const x = a.x - b.x
  const y = a.y - b.y
  const z = a.z - b.z
  return Math.hypot(x, y, z)
}

function obstacleCorners(
  obstacles: readonly AxisAlignedBox[],
  waterBounds: AxisAlignedBox,
  clearanceRadius: number,
  maxAbsXAtDepth?: MaxAbsXAtDepth,
  lateralClearanceRadius = clearanceRadius,
): Vec3[] {
  const corners: Vec3[] = []
  const safeMin = {
    x: waterBounds.min.x + lateralClearanceRadius,
    y: waterBounds.min.y + clearanceRadius,
    z: waterBounds.min.z + clearanceRadius,
  }
  const safeMax = {
    x: waterBounds.max.x - lateralClearanceRadius,
    y: waterBounds.max.y - clearanceRadius,
    z: waterBounds.max.z - clearanceRadius,
  }
  const clampToWater = (value: number, axis: 'x' | 'y' | 'z') => Math.min(safeMax[axis], Math.max(safeMin[axis], value))
  const seen = new Set<string>()
  for (const obstacle of obstacles) {
    const xs = [obstacle.min.x - CORNER_CLEARANCE, obstacle.max.x + CORNER_CLEARANCE]
    const ys = [obstacle.min.y - CORNER_CLEARANCE, obstacle.max.y + CORNER_CLEARANCE]
    const zs = [obstacle.min.z - CORNER_CLEARANCE, obstacle.max.z + CORNER_CLEARANCE]
    for (const x of xs) for (const y of ys) for (const z of zs) {
      // Clip boundary-spanning obstacle corners to the safe tank volume. The
      // resulting edge/face points let the graph route around a different,
      // still-open axis when the original 3D corners lie outside the tank.
      const corner = {
        x: clampToWater(x, 'x'),
        y: clampToWater(y, 'y'),
        z: clampToWater(z, 'z'),
      }
      const key = `${corner.x},${corner.y},${corner.z}`
      if (safePoint(corner, waterBounds, clearanceRadius, obstacles, maxAbsXAtDepth, lateralClearanceRadius) && !seen.has(key)) {
        corners.push(corner)
        seen.add(key)
      }
    }
  }
  return corners
}

type GraphEdge = { node: number; length: number }

function buildVisibilityGraph(points: readonly Vec3[], obstacles: readonly AxisAlignedBox[]): GraphEdge[][] {
  const graph = points.map(() => [] as GraphEdge[])
  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      if (!segmentClear(points[first], points[second], obstacles)) continue
      const length = distance(points[first], points[second])
      graph[first].push({ node: second, length })
      graph[second].push({ node: first, length })
    }
  }
  return graph
}

function shortestPaths(graph: readonly GraphEdge[][], startNode: number) {
  const distances = graph.map(() => Number.POSITIVE_INFINITY)
  const previous = graph.map(() => -1)
  const visited = graph.map(() => false)
  distances[startNode] = 0
  for (let count = 0; count < graph.length; count += 1) {
    let current = -1
    for (let candidate = 0; candidate < graph.length; candidate += 1) {
      if (!visited[candidate] && (current === -1 || distances[candidate] < distances[current])) current = candidate
    }
    if (current === -1 || !Number.isFinite(distances[current])) break
    visited[current] = true
    for (const edge of graph[current]) {
      const possible = distances[current] + edge.length
      if (!visited[edge.node] && possible < distances[edge.node]) {
        distances[edge.node] = possible
        previous[edge.node] = current
      }
    }
  }
  return { distances, previous }
}

function pathToNode(previous: readonly number[], node: number): number[] {
  const path = [node]
  while (previous[path[0]] >= 0) path.unshift(previous[path[0]])
  return path
}

function requestedStateAnchor(request: NavigationRequest): HabitatAnchor | undefined {
  const profile = getSpeciesBehaviorProfile(request.speciesId)
  const stateConfig = profile?.states[request.state]
  if (!profile || !stateConfig || !profile.anchors.includes(request.anchor)) return undefined
  const target = 'destination' in stateConfig ? stateConfig.destination : stateConfig.anchor
  return target === request.anchor ? target : undefined
}

export type LateralSide = -1 | 1

function identityHash(instanceId: string): number {
  let hash = 2166136261
  for (const char of instanceId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

/** A stable side preference that flips on each new navigation generation. */
export function preferredLateralSide(request: Pick<NavigationRequest, 'instanceId' | 'generation'>): LateralSide {
  return ((identityHash(request.instanceId) ^ request.generation) & 1) === 0 ? -1 : 1
}

export function habitatAnchorSidePenalty(position: Vec3, waterBounds: AxisAlignedBox, preferredSide: LateralSide): number {
  const width = waterBounds.max.x - waterBounds.min.x
  const centerX = (waterBounds.min.x + waterBounds.max.x) * .5
  const centerTolerance = width * .06
  const side = position.x < centerX - centerTolerance ? -1 : position.x > centerX + centerTolerance ? 1 : 0
  if (side === preferredSide) return 0
  return side === 0 ? width * .18 : width * .45
}

/** Stable side-prioritized anchor ordering shared by both route planners. */
export function orderHabitatAnchorsForRequest<T extends Pick<HabitatAnchorLocation, 'id' | 'position'>>(
  request: Pick<NavigationRequest, 'instanceId' | 'generation'>,
  waterBounds: AxisAlignedBox,
  candidates: readonly T[],
): T[] {
  if (candidates.length < 2) return candidates.slice()
  const preferredSide = preferredLateralSide(request)
  const stable = candidates.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const rotation = (Math.imul(identityHash(request.instanceId) ^ request.generation, 0x9e3779b1) >>> 0) % stable.length
  const rotated = [...stable.slice(rotation), ...stable.slice(0, rotation)]
  const rotatedIndex = new Map(rotated.map((candidate, index) => [candidate.id, index]))
  return rotated.sort((a, b) => habitatAnchorSidePenalty(a.position, waterBounds, preferredSide)
    - habitatAnchorSidePenalty(b.position, waterBounds, preferredSide)
    || rotatedIndex.get(a.id)! - rotatedIndex.get(b.id)!)
}

function resultBase(request: NavigationRequest) {
  return {
    instanceId: request.instanceId,
    generation: request.generation,
    speciesId: request.speciesId,
    anchor: request.anchor,
  }
}

/** Resolve a typed profile request through caller-supplied tank bounds, anchors, and solid obstacle volumes. */
export function resolveHabitatRoute(input: ResolveHabitatRouteInput): HabitatRouteResult {
  validateInput(input)
  const { request, start, waterBounds, obstacles, anchorLocations, fishClearanceRadius, maxAbsXAtDepth } = input
  const lateralClearanceRadius = input.lateralClearanceRadius ?? fishClearanceRadius
  const profile = getSpeciesBehaviorProfile(request.speciesId)
  if (!profile || !requestedStateAnchor(request)) return { ...resultBase(request), status: 'unavailable' }

  const candidates = anchorLocations
    .filter((location) => location.anchor === request.anchor
      && (!location.compatibleSpecies || location.compatibleSpecies.includes(profile.speciesId)))
  const orderedCandidates = orderHabitatAnchorsForRequest(request, waterBounds, candidates)
  if (orderedCandidates.length === 0) return { ...resultBase(request), status: 'unavailable' }

  const expandedObstacles = getClearanceExpandedObstacles(obstacles, fishClearanceRadius)
  for (const [index, obstacle] of expandedObstacles.entries()) validateBox(obstacle, `Clearance-expanded obstacle ${obstacles[index].id}`)
  const safeBounds = {
    min: {
      x: waterBounds.min.x + lateralClearanceRadius,
      y: waterBounds.min.y + fishClearanceRadius,
      z: waterBounds.min.z + fishClearanceRadius,
    },
    max: {
      x: waterBounds.max.x - lateralClearanceRadius,
      y: waterBounds.max.y - fishClearanceRadius,
      z: waterBounds.max.z - fishClearanceRadius,
    },
  }
  if (!finiteVec(safeBounds.min) || !finiteVec(safeBounds.max)) throw new RangeError('Fish clearance exceeds finite tank bounds.')
  if (!safePoint(start, waterBounds, fishClearanceRadius, expandedObstacles, maxAbsXAtDepth, lateralClearanceRadius)) {
    return { ...resultBase(request), status: 'blocked' }
  }
  const reachableCandidates = candidates.filter((candidate) => safePoint(candidate.position, waterBounds, fishClearanceRadius, expandedObstacles, maxAbsXAtDepth, lateralClearanceRadius))
  if (reachableCandidates.length === 0) return { ...resultBase(request), status: 'blocked' }

  const startNode = 0
  const corners = obstacleCorners(expandedObstacles, waterBounds, fishClearanceRadius, maxAbsXAtDepth, lateralClearanceRadius)
  const orderedReachableCandidates = orderHabitatAnchorsForRequest(request, waterBounds, reachableCandidates)
  const points = [start, ...corners, ...orderedReachableCandidates.map((candidate) => candidate.position)]
  const anchorNodeById = new Map<string, number>()
  orderedReachableCandidates.forEach((candidate, index) => anchorNodeById.set(candidate.id, 1 + corners.length + index))
  const graph = buildVisibilityGraph(points, expandedObstacles)
  const { distances, previous } = shortestPaths(graph, startNode)

  const preferredSide = preferredLateralSide(request)
  let best: { candidate: HabitatAnchorLocation; node: number; length: number; score: number } | undefined
  for (const candidate of orderedReachableCandidates) {
    const node = anchorNodeById.get(candidate.id)!
    const length = distances[node]
    const score = length + habitatAnchorSidePenalty(candidate.position, waterBounds, preferredSide)
    if (Number.isFinite(length) && (!best || score < best.score - COORDINATE_EPSILON)) best = { candidate, node, length, score }
  }
  if (!best) return { ...resultBase(request), status: 'blocked' }
  const path = pathToNode(previous, best.node).map((node) => points[node])
  return {
    ...resultBase(request),
    status: 'route',
    locationId: best.candidate.id,
    path: path.map((point) => ({ ...point })),
    length: best.length,
  }
}

/** Free-water routing has no semantic anchor and never fabricates habitat. */
export type WaterRouteInput = {
  start: Vec3
  target: Vec3
  waterBounds: AxisAlignedBox
  obstacles: readonly SolidObstacleVolume[]
  fishClearanceRadius: number
  maxAbsXAtDepth?: MaxAbsXAtDepth
  lateralClearanceRadius?: number
}

export function isWaterSegmentSafe(input: WaterRouteInput): boolean {
  validateBox(input.waterBounds, 'Water bounds')
  if (!finiteVec(input.start) || !finiteVec(input.target) || !Number.isFinite(input.fishClearanceRadius) || input.fishClearanceRadius < 0) throw new RangeError('Water route requires finite points and non-negative clearance.')
  if (input.lateralClearanceRadius !== undefined && (!Number.isFinite(input.lateralClearanceRadius) || input.lateralClearanceRadius < 0)) throw new RangeError('Lateral clearance radius must be finite and non-negative.')
  if (input.obstacles.length > MAX_OBSTACLE_VOLUMES) throw new RangeError('Too many obstacle volumes.')
  input.obstacles.forEach(obstacle => validateBox(obstacle.bounds, 'Obstacle'))
  const expanded = getClearanceExpandedObstacles(input.obstacles, input.fishClearanceRadius)
  return safePoint(input.start, input.waterBounds, input.fishClearanceRadius, expanded, input.maxAbsXAtDepth, input.lateralClearanceRadius)
    && safePoint(input.target, input.waterBounds, input.fishClearanceRadius, expanded, input.maxAbsXAtDepth, input.lateralClearanceRadius)
    && segmentClear(input.start, input.target, expanded)
}

export function findWaterRoute(input: WaterRouteInput): readonly Vec3[] | undefined {
  if (isWaterSegmentSafe(input)) return [{ ...input.start }, { ...input.target }]
  const expanded = getClearanceExpandedObstacles(input.obstacles, input.fishClearanceRadius)
  if (!safePoint(input.start, input.waterBounds, input.fishClearanceRadius, expanded, input.maxAbsXAtDepth, input.lateralClearanceRadius)
    || !safePoint(input.target, input.waterBounds, input.fishClearanceRadius, expanded, input.maxAbsXAtDepth, input.lateralClearanceRadius)) return undefined
  const points = [input.start, ...obstacleCorners(expanded, input.waterBounds, input.fishClearanceRadius, input.maxAbsXAtDepth, input.lateralClearanceRadius), input.target]
  const { distances, previous } = shortestPaths(buildVisibilityGraph(points, expanded), 0)
  const target = points.length - 1
  return Number.isFinite(distances[target]) ? pathToNode(previous, target).map(index => ({ ...points[index] })) : undefined
}
