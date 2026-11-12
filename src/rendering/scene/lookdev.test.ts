import { describe, expect, it } from 'vitest'
import {
  LOOKDEV_PRESETS,
  lookDevCameraState,
  percentileMs,
  resolveLookDevConfig,
  summarizeLookDevAssetBytes,
  summarizeLookDevTiming,
} from './lookdev'

describe('look-dev capture helpers', () => {
  it('keeps the opt-in mode inert outside development or without the exact flag', () => {
    expect(resolveLookDevConfig('?lookdev=1', false)).toBeUndefined()
    expect(resolveLookDevConfig('', true)).toBeUndefined()
    expect(resolveLookDevConfig('?lookdev=true', true)).toBeUndefined()
    expect(resolveLookDevConfig('?lookdev=0&preset=fish-macro', true)).toBeUndefined()
  })

  it('uses stable defaults and parses explicit seed, frozen time, preset, subject, and label visibility', () => {
    const defaults = resolveLookDevConfig('?lookdev=1', true)
    expect(defaults).toEqual({ enabled: true, seed: 0x5eed, timeSeconds: 0, preset: 'full-scene', labelsVisible: true })

    const query = '?lookdev=1&seed=0&time=12.5&preset=fish-macro&subject=yellow-tang&labels=off'
    const config = resolveLookDevConfig(query, true)
    expect(config).toEqual({ enabled: true, seed: 0, timeSeconds: 12.5, preset: 'fish-macro', subjectId: 'yellow-tang', labelsVisible: false })
    expect(resolveLookDevConfig(query, true)).toEqual(config)
  })

  it('declares full-scene plus all three close-up presets', () => {
    expect(LOOKDEV_PRESETS).toEqual(['full-scene', 'fish-macro', 'coral-macro', 'rock-sand-contact'])
  })

  it('provides stable front-on camera targets and centers the fish macro on its selected subject', () => {
    expect(lookDevCameraState('full-scene')).toEqual({ targetX: 0, targetY: 0.15, targetZ: 0, distance: 9 })
    expect(lookDevCameraState('fish-macro', { x: 1, y: 0.7, z: 0.4 })).toEqual({
      targetX: 1, targetY: 0.7, targetZ: 0.4, distance: 5.2,
    })
    expect(lookDevCameraState('coral-macro')).toEqual({ targetX: -2, targetY: -0.55, targetZ: -1.4, distance: 5.6 })
    expect(lookDevCameraState('rock-sand-contact')).toEqual({ targetX: -1.2, targetY: -1.65, targetZ: -1.2, distance: 5.8 })
    expect(lookDevCameraState('fish-macro')).toEqual({ targetX: 0, targetY: 0.4, targetZ: 0, distance: 5.2 })
  })

  it('keeps portrait reef macros on the single central island instead of the empty left water', () => {
    const coral = lookDevCameraState('coral-macro', undefined, true)
    const contact = lookDevCameraState('rock-sand-contact', undefined, true)
    expect(Math.abs(coral.targetX)).toBeLessThan(0.5)
    expect(Math.abs(contact.targetX)).toBeLessThan(0.5)
    expect(contact.targetY).toBeLessThan(coral.targetY - 1)
    expect(lookDevCameraState('fish-macro', { x: 0.2, y: 0.7, z: 0.4 }, true).targetX).toBe(0.2)
  })

  it.each([
    '?lookdev=1&seed=-1',
    '?lookdev=1&seed=',
    '?lookdev=1&seed=%20%20',
    '?lookdev=1&seed=1.5',
    '?lookdev=1&seed=4294967296',
    '?lookdev=1&time=-0.1',
    '?lookdev=1&time=',
    '?lookdev=1&time=%20',
    '?lookdev=1&time=Infinity',
    '?lookdev=1&time=3601',
    '?lookdev=1&preset=underwater',
    '?lookdev=1&labels=maybe',
    '?lookdev=1&subject=not/a/service',
  ])('rejects malformed opted-in configuration %s', search => {
    expect(resolveLookDevConfig(search, true)).toBeUndefined()
  })

  it('computes linear-interpolated percentiles after excluding invalid timings without mutating input', () => {
    const values = [8, Number.NaN, 2, -1, 6, 4]
    expect(percentileMs(values, 0.5)).toBe(5)
    expect(percentileMs(values, 0.95)).toBeCloseTo(7.7)
    expect(values[0]).toBe(8)
    expect(summarizeLookDevTiming(values)).toEqual({ sampleCount: 4, p50Ms: 5, p95Ms: expect.closeTo(7.7) })
    expect(percentileMs(values, -0.1)).toBeUndefined()
    expect(summarizeLookDevTiming([Number.NaN, -2])).toBeUndefined()
  })

  it('reports encoded asset bodies separately from wire transfer and cache/restriction zero counts', () => {
    const stats = summarizeLookDevAssetBytes([
      { name: '/assets/reef.glb?import', encodedBodySize: 1000, transferSize: 1100 },
      { name: '/assets/reef.glb?import', encodedBodySize: 1000, transferSize: 1100 },
      { name: 'https://cdn.example/fish.PNG', encodedBodySize: 250, transferSize: 0 },
      { name: '/assets/coral.bin', encodedBodySize: Number.NaN, transferSize: -1 },
      { name: '/assets/empty.webp', encodedBodySize: 0, transferSize: 0 },
      { name: '/src/main.tsx', encodedBodySize: 400, transferSize: 500 },
    ])
    expect(stats).toEqual({
      assetResourceCount: 5,
      encodedAssetBytes: 2250,
      transferBytes: 2200,
      encodedBytesUnavailableCount: 1,
      transferBytesUnavailableCount: 1,
      encodedZeroByteCount: 1,
      transferZeroByteCount: 2,
    })
  })
})
