import { describe, expect, it } from 'vitest'
import {
  SURFACE_FOCUS_NORMALISER,
  SURFACE_RIPPLE_OCTAVE,
  SURFACE_WAVE_GLSL,
  SURFACE_WAVE_TOTAL_AMPLITUDE_M,
  SURFACE_WAVES,
  evaluateSurfaceFocus,
  evaluateSurfaceHeight,
  evaluateSurfaceNormal,
  evaluateSurfaceRippleNormal,
  evaluateSurfaceRippleSlope,
  evaluateSurfaceSlope,
  evaluateSurfaceWaveField,
  surfaceWaveFrequenciesHz,
} from './surface-waves'

// The wave table, re-stated literally so the expectations below are
// independent of the implementation's derivation helpers.
const WAVES = [
  { dirX: 1, dirZ: 0, wavelengthM: 3.6, amplitudeM: 0.014, phaseRad: 0.7 },
  { dirX: 0.6, dirZ: 0.8, wavelengthM: 3.0, amplitudeM: 0.01, phaseRad: 2.1 },
  { dirX: 0, dirZ: 1, wavelengthM: 0.9, amplitudeM: 0.005, phaseRad: 4.0 },
  { dirX: -0.8, dirZ: 0.6, wavelengthM: 0.65, amplitudeM: 0.004, phaseRad: 1.3 },
] as const

function expectedHeight(x: number, z: number, t: number): number {
  let h = 0
  for (const w of WAVES) {
    const k = (2 * Math.PI) / w.wavelengthM
    const omega = Math.sqrt(9.81 * k)
    h += w.amplitudeM * Math.sin((x * w.dirX + z * w.dirZ) * k - omega * t + w.phaseRad)
  }
  return h
}

function expectedFocus(x: number, z: number, t: number): number {
  let f = 0
  let norm = 0
  for (const w of WAVES) {
    const k = (2 * Math.PI) / w.wavelengthM
    const omega = Math.sqrt(9.81 * k)
    f += w.amplitudeM * k * k * Math.sin((x * w.dirX + z * w.dirZ) * k - omega * t + w.phaseRad)
    norm += w.amplitudeM * k * k
  }
  return f / norm
}

describe('shared surface wave field (AQ-96 / AQ-14.2 / AQ-70.6)', () => {
  it('has four waves totalling ~0.033 m amplitude', () => {
    expect(SURFACE_WAVES).toHaveLength(4)
    expect(SURFACE_WAVE_TOTAL_AMPLITUDE_M).toBeCloseTo(0.033, 3)
    for (const wave of SURFACE_WAVES) {
      expect(Math.hypot(wave.dirX, wave.dirZ)).toBeCloseTo(1, 9)
    }
  })

  it('matches hand-computed height values at (0,0,0) and sampled points', () => {
    // Hand-computed: 0.014·sin(0.7) + 0.01·sin(2.1) + 0.005·sin(4.0)
    // + 0.004·sin(1.3) ≈ 0.01772 m.
    expect(evaluateSurfaceHeight(0, 0, 0)).toBeCloseTo(0.01772, 4)
    for (const [x, z, t] of [
      [0, 0, 0],
      [1.2, -0.8, 0],
      [-2.5, 1.7, 3.5],
      [4.0, 2.0, 12.25],
      [0.3, -3.1, 3599],
    ] as const) {
      expect(evaluateSurfaceHeight(x, z, t)).toBeCloseTo(expectedHeight(x, z, t), 9)
    }
  })

  it('keeps height bounded by the total amplitude and finite at the t=3600 wrap', () => {
    for (let i = 0; i < 200; i++) {
      const x = Math.sin(i * 1.7) * 8
      const z = Math.cos(i * 2.3) * 6
      const h = evaluateSurfaceHeight(x, z, (i * 37) % 3600)
      expect(Number.isFinite(h)).toBe(true)
      expect(Math.abs(h)).toBeLessThanOrEqual(SURFACE_WAVE_TOTAL_AMPLITUDE_M + 1e-12)
    }
    expect(evaluateSurfaceHeight(1, 1, 3600)).toBeCloseTo(evaluateSurfaceHeight(1, 1, 0), 9)
  })

  it('returns analytic normals that are unit length, point up, and match the slope', () => {
    for (const [x, z, t] of [
      [0, 0, 0],
      [1.2, -0.8, 2.5],
      [-3.3, 0.4, 9.1],
    ] as const) {
      const normal = evaluateSurfaceNormal(x, z, t)
      expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 9)
      expect(normal.y).toBeGreaterThan(0.9)
      const slope = evaluateSurfaceSlope(x, z, t)
      // normal = normalize(-dhdx, 1, -dhdz): the xz ratios must agree.
      expect(normal.x / normal.y).toBeCloseTo(-slope.x, 9)
      expect(normal.z / normal.y).toBeCloseTo(-slope.z, 9)
    }
  })

  it('returns a focus proxy in [-1, 1] matching the hand-computed negative Laplacian', () => {
    // Hand-computed at (0,0,0): ≈ 0.342 (crest lensing at t=0 there).
    expect(evaluateSurfaceFocus(0, 0, 0)).toBeCloseTo(0.342, 2)
    expect(SURFACE_FOCUS_NORMALISER).toBeGreaterThan(0)
    for (const [x, z, t] of [
      [0, 0, 0],
      [1.2, -0.8, 0],
      [-2.5, 1.7, 3.5],
      [4.0, 2.0, 12.25],
    ] as const) {
      const focus = evaluateSurfaceFocus(x, z, t)
      expect(focus).toBeGreaterThanOrEqual(-1)
      expect(focus).toBeLessThanOrEqual(1)
      expect(focus).toBeCloseTo(expectedFocus(x, z, t), 9)
    }
  })

  it('derives wave frequencies from deep-water dispersion (long waves outrun short ones)', () => {
    const freqs = surfaceWaveFrequenciesHz()
    expect(freqs).toHaveLength(4)
    // Longest wavelength (3.6 m) is the slowest; shortest (0.65 m) fastest.
    expect(freqs[0]).toBeLessThan(freqs[1])
    expect(freqs[1]).toBeLessThan(freqs[2])
    expect(freqs[2]).toBeLessThan(freqs[3])
    expect(freqs[0]).toBeCloseTo(Math.sqrt(9.81 * ((2 * Math.PI) / 3.6)) / (2 * Math.PI), 9)
  })

  it('freezes height, normal, and focus at the t=0 phase on pause or reduced-motion', () => {
    const frozen = evaluateSurfaceWaveField(1.2, -0.8, 0)
    for (const t of [1.2, 9.8, 100]) {
      expect(evaluateSurfaceWaveField(1.2, -0.8, t, { paused: true })).toEqual(frozen)
      expect(evaluateSurfaceWaveField(1.2, -0.8, t, { reducedMotion: true })).toEqual(frozen)
    }
    const moving = evaluateSurfaceWaveField(1.2, -0.8, 1.2)
    expect(moving.height).not.toBeCloseTo(frozen.height, 3)
  })

  it('exports a GLSL mirror generated from the same wave table', () => {
    for (const fn of ['surfaceWaveHeight', 'surfaceWaveSlope', 'surfaceWaveNormal', 'surfaceWaveFocus', 'surfaceRippleSlope', 'surfaceRippleNormal']) {
      expect(SURFACE_WAVE_GLSL).toContain(fn)
    }
    // Every wave's amplitude and phase appears as a GLSL literal.
    for (const wave of SURFACE_WAVES) {
      expect(SURFACE_WAVE_GLSL).toContain(wave.amplitudeM.toFixed(6))
      expect(SURFACE_WAVE_GLSL).toContain(wave.phaseRad.toFixed(6))
    }
    // The ripple octave's slope constants (a·k) appear too
    // (normals/glitter only — the ripple has no height term).
    for (const wave of SURFACE_RIPPLE_OCTAVE) {
      const ak = wave.amplitudeM * ((2 * Math.PI) / wave.wavelengthM)
      expect(SURFACE_WAVE_GLSL).toContain(ak.toFixed(6))
      expect(SURFACE_WAVE_GLSL).toContain(wave.phaseRad.toFixed(6))
    }
    expect(SURFACE_WAVE_GLSL).toContain(SURFACE_FOCUS_NORMALISER.toFixed(6))
    // 4 height terms + 4 focus terms use sin(dot(p, ...)); 4 slope terms
    // + 2 ripple-slope terms use cos.
    expect(SURFACE_WAVE_GLSL.split('sin(dot(p,').length - 1).toBe(8)
    expect(SURFACE_WAVE_GLSL.split('cos(dot(p,').length - 1).toBe(6)
  })

  it('ripple octave: two short low-amplitude waves, normals-only (surface-water pass 2)', () => {
    expect(SURFACE_RIPPLE_OCTAVE).toHaveLength(2)
    for (const wave of SURFACE_RIPPLE_OCTAVE) {
      expect(Math.hypot(wave.dirX, wave.dirZ)).toBeCloseTo(1, 9)
      // Shorter than the 0.65 m chop, far below the 0.50 m mesh spacing:
      // displacing with these would alias, so they are normals-only.
      expect(wave.wavelengthM).toBeLessThan(0.65)
      expect(wave.amplitudeM).toBeLessThan(0.002)
    }
    // Slopes stay small (a·k sums to ~0.067 max) so the surface never
    // looks choppy, and the ripple normal stays unit-length and close
    // to the canonical normal.
    const maxSlope = SURFACE_RIPPLE_OCTAVE.reduce(
      (sum, w) => sum + w.amplitudeM * ((2 * Math.PI) / w.wavelengthM),
      0,
    )
    for (const [x, z, t] of [[0, 0, 0], [1.2, -0.8, 2.5], [-3.3, 0.4, 9.1]] as const) {
      const ripple = evaluateSurfaceRippleSlope(x, z, t)
      expect(Math.hypot(ripple.x, ripple.z)).toBeLessThanOrEqual(maxSlope + 1e-12)
      const base = evaluateSurfaceNormal(x, z, t)
      const fine = evaluateSurfaceRippleNormal(x, z, t)
      expect(Math.hypot(fine.x, fine.y, fine.z)).toBeCloseTo(1, 9)
      expect(fine.y).toBeGreaterThan(0.9)
      // The ripple perturbs the normal but never re-points it: the dot
      // with the canonical normal stays above 0.99 (a few degrees).
      expect(base.x * fine.x + base.y * fine.y + base.z * fine.z).toBeGreaterThan(0.99)
      // It actually changes the normal somewhere (not a no-op octave).
      expect(Math.hypot(fine.x - base.x, fine.z - base.z)).toBeGreaterThan(0)
    }
    // Frozen on pause / reduced-motion, like the rest of the field.
    const frozen = evaluateSurfaceRippleNormal(1.2, -0.8, 0)
    expect(evaluateSurfaceRippleNormal(1.2, -0.8, 9.8, { paused: true })).toEqual(frozen)
    expect(evaluateSurfaceRippleNormal(1.2, -0.8, 9.8, { reducedMotion: true })).toEqual(frozen)
    expect(evaluateSurfaceRippleSlope(NaN, 0, 0)).toEqual({ x: 0, z: 0 })
  })
})
