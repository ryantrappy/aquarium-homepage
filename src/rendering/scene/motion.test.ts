import { describe, expect, it } from 'vitest'
import { createSwimmingFish, distance, startleFish, stepSwimmingFish, type WaterHabitat } from './motion'
import { findWaterRoute, isWaterSegmentSafe } from '../../simulation/habitat-navigation'

const habitat: WaterHabitat = { bounds: { min: { x: -5, y: -2.4, z: -3 }, max: { x: 5, y: 2.8, z: 2.8 } }, obstacles: [{ id: 'real-reef-envelope', bounds: { min: { x: -1.2, y: -2.8, z: -.8 }, max: { x: 1.2, y: .1, z: .8 } } }], anchors: [] }

describe('rendered fish travel adapter', () => {
  it('moves and turns both rigged species, retaining collision clearance on every step', () => {
    for (const species of ['ocellaris-clownfish', 'yellow-tang']) {
      const fish = createSwimmingFish(`travel-${species}`, species, { x: -3, y: 1.4, z: 1.8 }, .5)
      const initial = { ...fish.position }; let traveled = 0; let turn = 0
      for (let frame = 0; frame < 1200; frame++) {
        const previous = { ...fish.position }, yaw = fish.yaw
        stepSwimmingFish(fish, habitat, 1 / 30)
        expect(isWaterSegmentSafe({ start: previous, target: fish.position, waterBounds: habitat.bounds, obstacles: habitat.obstacles, fishClearanceRadius: .5 })).toBe(true)
        traveled += distance(previous, fish.position); turn += Math.abs(yaw - fish.yaw)
      }
      expect(traveled).toBeGreaterThan(1.5); expect(distance(initial, fish.position)).toBeGreaterThan(.4); expect(turn).toBeGreaterThan(.5)
    }
  })
  it('freezes position and orientation while stopped, without a resume catch-up jump', () => {
    const fish = createSwimmingFish('paused', 'yellow-tang', { x: -2, y: 1, z: 2 })
    stepSwimmingFish(fish, habitat, .03)
    const before = { position: { ...fish.position }, yaw: fish.yaw, pitch: fish.pitch }
    stepSwimmingFish(fish, habitat, 50, true)
    expect({ position: fish.position, yaw: fish.yaw, pitch: fish.pitch }).toEqual(before)
    stepSwimmingFish(fish, habitat, 50)
    expect(distance(before.position, fish.position)).toBeLessThan(.15)
  })
  it('scopes activation to one fish and recovers without fabricating an absent refuge', () => {
    const first = createSwimmingFish('first', 'ocellaris-clownfish', { x: -2, y: 1, z: 2 })
    const second = createSwimmingFish('second', 'yellow-tang', { x: 2, y: 1, z: 2 })
    const other = structuredClone(second)
    startleFish(first, habitat)
    expect(second).toEqual(other); expect(first.startleSeconds).toBeGreaterThan(0)
    expect(first.behavior.state).not.toBe('retreat')
    for (let i = 0; i < 100; i++) stepSwimmingFish(first, habitat, .03)
    expect(first.startleSeconds).toBe(0); expect(first.behavior.state).not.toBe('retreat')
  })
  it('routes free-water targets around solid reef via depth, without semantic anchor substitution', () => {
    const input = { start: { x: -3, y: -.5, z: 0 }, target: { x: 3, y: -.5, z: 0 }, waterBounds: habitat.bounds, obstacles: habitat.obstacles, fishClearanceRadius: .5 }
    const route = findWaterRoute(input)!
    expect(route.length).toBeGreaterThan(2)
    for (let i = 1; i < route.length; i++) expect(isWaterSegmentSafe({ ...input, start: route[i - 1], target: route[i] })).toBe(true)
    expect(findWaterRoute({ ...input, start: { x: 0, y: -1, z: 0 } })).toBeUndefined()
  })
})
