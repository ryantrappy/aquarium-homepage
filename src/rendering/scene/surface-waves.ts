/**
 * The canonical shared surface wave field (AQ-96 / AQ-14.2 / AQ-70.6 /
 * AQ-98 / AQ-86 lighting + water-surface work).
 *
 * One field drives three systems from the same math, so the surface
 * ripple, the light shafts, and the caustic dapple can never disagree
 * about what the water surface is doing — the coherence requirement of
 * the reference image (ripples focus sunlight into shafts and into the
 * caustic web on the sand). There is exactly one clock: every consumer
 * passes the shared frozen time (0 on pause / reduced-motion / hidden)
 * into these functions.
 *
 * Field: 4 summed sine waves — two long swells (wavelength ~3–4 m,
 * amplitude ~0.01–0.014 m, slow, near-parallel headings for a dominant
 * light direction) + two short chop waves (wavelength ~0.65–0.9 m,
 * amplitude ~0.004–0.005 m, crossed headings). Frequencies come from
 * deep-water dispersion ω = √(g·k), so long waves outrun short ones and
 * the pattern never resolves into one rigidly translating shape; fixed
 * per-wave phase offsets keep all waves from cresting together at the
 * origin at t=0. Total amplitude ≈ 0.033 m, matching the previous
 * `surfaceRippleAmplitudeM: 0.032`.
 *
 * Not full Gerstner: at 3 cm amplitude in a 9 m tank, seen front-on and
 * never edge-on, the horizontal Gerstner displacement is sub-pixel.
 * Summed sines + analytic normals give the same glitter and focus
 * behaviour at a fraction of the shader cost.
 *
 * Analytic normals: for a sine height field h(x, z, t) the normal is
 * exactly normalize(-∂h/∂x, 1, -∂h/∂z) — cheap, exact, no finite
 * differences, no normal-map texture.
 *
 * Focus (convergence) term: the caustic brightness proxy is the negative
 * Laplacian of the height field, `focus = -(∂²h/∂x² + ∂²h/∂z²)`. For
 * small slopes, ray convergence is proportional to −∇²h: positive where
 * the surface is concave-up (crest lensing → bright caustic), negative
 * where convex (→ dim). This is a standard cheap proxy (same form as
 * shadertoy / Moana-style water caustics), NOT Snell's-law ray tracing,
 * and it is labelled as such wherever it is used. It is normalised by
 * the sum of a·k² so it stays in [-1, 1].
 *
 * The matching GLSL (`SURFACE_WAVE_GLSL`) is generated from the same
 * wave table, so the TS and GLSL mirrors cannot drift apart silently;
 * tests assert the GLSL carries the same constants.
 */

const GRAVITY_M_PER_S2 = 9.81
const TWO_PI = Math.PI * 2

export type SurfaceWave = Readonly<{
  /** Unit heading in the XZ plane. */
  dirX: number
  dirZ: number
  /** Wavelength in metres. */
  wavelengthM: number
  /** Amplitude in metres. */
  amplitudeM: number
  /** Fixed phase offset, radians. */
  phaseRad: number
}>

/** The four canonical waves. Order matters only for readability. */
export const SURFACE_WAVES: readonly SurfaceWave[] = Object.freeze([
  { dirX: 1, dirZ: 0, wavelengthM: 3.6, amplitudeM: 0.014, phaseRad: 0.7 },
  { dirX: 0.6, dirZ: 0.8, wavelengthM: 3.0, amplitudeM: 0.01, phaseRad: 2.1 },
  { dirX: 0, dirZ: 1, wavelengthM: 0.9, amplitudeM: 0.005, phaseRad: 4.0 },
  { dirX: -0.8, dirZ: 0.6, wavelengthM: 0.65, amplitudeM: 0.004, phaseRad: 1.3 },
])

/**
 * High-frequency ripple octave (surface-water pass 2, AQ-96 / AQ-70.6):
 * two short, low-amplitude sines used for NORMALS AND GLITTER ONLY.
 * They are deliberately NOT part of the height field, the displacement,
 * the focus term, or the shaft/caustic coupling: at λ 0.28 / 0.19 m they
 * are far below the mesh vertex spacing (0.50 × 0.43 m), so displacing
 * with them would alias, and feeding them into the shafts/caustics
 * would make the beams and the dapple shimmer noisily. Their only job
 * is to break the glitter into finer sparkle so the surface stops
 * reading as four clean sine waves at AQ-62 zoom distances. Slopes stay
 * small (a·k ≈ 0.03) so the surface never looks choppy.
 */
export const SURFACE_RIPPLE_OCTAVE: readonly SurfaceWave[] = Object.freeze([
  { dirX: 0.8, dirZ: -0.6, wavelengthM: 0.28, amplitudeM: 0.0015, phaseRad: 0.9 },
  { dirX: -0.28, dirZ: 0.96, wavelengthM: 0.19, amplitudeM: 0.001, phaseRad: 2.7 },
])

const DERIVED_RIPPLE_WAVES: readonly DerivedWave[] = SURFACE_RIPPLE_OCTAVE.map(wave => {
  const k = TWO_PI / wave.wavelengthM
  return { ...wave, k, omega: Math.sqrt(GRAVITY_M_PER_S2 * k) }
})
export const SURFACE_WAVE_TOTAL_AMPLITUDE_M = SURFACE_WAVES.reduce(
  (sum, wave) => sum + wave.amplitudeM,
  0,
)

type DerivedWave = SurfaceWave & { k: number; omega: number }

const DERIVED_WAVES: readonly DerivedWave[] = SURFACE_WAVES.map(wave => {
  const k = TWO_PI / wave.wavelengthM
  return { ...wave, k, omega: Math.sqrt(GRAVITY_M_PER_S2 * k) }
})

/** Normalisation for the focus term: Σ a·k², so focus stays in [-1, 1]. */
export const SURFACE_FOCUS_NORMALISER = DERIVED_WAVES.reduce(
  (sum, wave) => sum + wave.amplitudeM * wave.k * wave.k,
  0,
)

/** Temporal frequency of each wave, Hz (ω / 2π, dispersion-derived). */
export function surfaceWaveFrequenciesHz(): readonly number[] {
  return DERIVED_WAVES.map(wave => wave.omega / TWO_PI)
}

function wavePhase(wave: DerivedWave, x: number, z: number, t: number): number {
  return (x * wave.dirX + z * wave.dirZ) * wave.k - wave.omega * t + wave.phaseRad
}

function effectiveTime(timeSeconds: number, paused = false, reducedMotion = false): number {
  if (paused || reducedMotion || !Number.isFinite(timeSeconds)) return 0
  return timeSeconds % 3600
}

/**
 * Surface height in metres at world (x, z) and time `t` (seconds).
 * Freezes at the t=0 phase when paused / reduced-motion.
 */
export function evaluateSurfaceHeight(
  x: number,
  z: number,
  timeSeconds: number,
  options?: { paused?: boolean; reducedMotion?: boolean },
): number {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0
  const t = effectiveTime(timeSeconds, options?.paused, options?.reducedMotion)
  let height = 0
  for (const wave of DERIVED_WAVES) {
    height += wave.amplitudeM * Math.sin(wavePhase(wave, x, z, t))
  }
  return height
}

/**
 * Analytic surface slope (∂h/∂x, ∂h/∂z) at world (x, z) and time `t`.
 */
export function evaluateSurfaceSlope(
  x: number,
  z: number,
  timeSeconds: number,
  options?: { paused?: boolean; reducedMotion?: boolean },
): { x: number; z: number } {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { x: 0, z: 0 }
  const t = effectiveTime(timeSeconds, options?.paused, options?.reducedMotion)
  let dhdx = 0
  let dhdz = 0
  for (const wave of DERIVED_WAVES) {
    const c = wave.amplitudeM * wave.k * Math.cos(wavePhase(wave, x, z, t))
    dhdx += c * wave.dirX
    dhdz += c * wave.dirZ
  }
  return { x: dhdx, z: dhdz }
}

/**
 * Analytic unit surface normal at world (x, z) and time `t`:
 * normalize(-∂h/∂x, 1, -∂h/∂z).
 */
export function evaluateSurfaceNormal(
  x: number,
  z: number,
  timeSeconds: number,
  options?: { paused?: boolean; reducedMotion?: boolean },
): { x: number; y: number; z: number } {
  const slope = evaluateSurfaceSlope(x, z, timeSeconds, options)
  const len = Math.hypot(slope.x, 1, slope.z)
  return { x: -slope.x / len, y: 1 / len, z: -slope.z / len }
}

/**
 * Focus (convergence) proxy at world (x, z) and time `t`: the negative
 * Laplacian of the height field, normalised to [-1, 1]. Positive where
 * the surface converges light (bright caustic / bright shaft), negative
 * where it diverges (dim). Cheap proxy, not Snell's-law ray tracing.
 */
export function evaluateSurfaceFocus(
  x: number,
  z: number,
  timeSeconds: number,
  options?: { paused?: boolean; reducedMotion?: boolean },
): number {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0
  const t = effectiveTime(timeSeconds, options?.paused, options?.reducedMotion)
  let focus = 0
  for (const wave of DERIVED_WAVES) {
    focus += wave.amplitudeM * wave.k * wave.k * Math.sin(wavePhase(wave, x, z, t))
  }
  return focus / SURFACE_FOCUS_NORMALISER
}

/** Height + analytic normal + focus in one pass (the full field sample). */
export function evaluateSurfaceWaveField(
  x: number,
  z: number,
  timeSeconds: number,
  options?: { paused?: boolean; reducedMotion?: boolean },
): {
  height: number
  normal: { x: number; y: number; z: number }
  focus: number
} {
  return {
    height: evaluateSurfaceHeight(x, z, timeSeconds, options),
    normal: evaluateSurfaceNormal(x, z, timeSeconds, options),
    focus: evaluateSurfaceFocus(x, z, timeSeconds, options),
  }
}

/**
 * Ripple-octave slope (∂h/∂x, ∂h/∂z) at world (x, z) and time `t`.
 * Normals/glitter only — never height, displacement, focus, shafts, or
 * caustics (see SURFACE_RIPPLE_OCTAVE).
 */
export function evaluateSurfaceRippleSlope(
  x: number,
  z: number,
  timeSeconds: number,
  options?: { paused?: boolean; reducedMotion?: boolean },
): { x: number; z: number } {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { x: 0, z: 0 }
  const t = effectiveTime(timeSeconds, options?.paused, options?.reducedMotion)
  let dhdx = 0
  let dhdz = 0
  for (const wave of DERIVED_RIPPLE_WAVES) {
    const c = wave.amplitudeM * wave.k * Math.cos(wavePhase(wave, x, z, t))
    dhdx += c * wave.dirX
    dhdz += c * wave.dirZ
  }
  return { x: dhdx, z: dhdz }
}

/**
 * Surface normal with the ripple octave folded in: the 4-sine slope plus
 * the ripple slope, normalised. The plain `evaluateSurfaceNormal` stays
 * the canonical field normal for shafts/caustics; this one is for the
 * surface shader's glitter/Fresnel only.
 */
export function evaluateSurfaceRippleNormal(
  x: number,
  z: number,
  timeSeconds: number,
  options?: { paused?: boolean; reducedMotion?: boolean },
): { x: number; y: number; z: number } {
  const slope = evaluateSurfaceSlope(x, z, timeSeconds, options)
  const ripple = evaluateSurfaceRippleSlope(x, z, timeSeconds, options)
  const sx = slope.x + ripple.x
  const sz = slope.z + ripple.z
  const len = Math.hypot(sx, 1, sz)
  return { x: -sx / len, y: 1 / len, z: -sz / len }
}

function fmt(n: number): string {
  return n.toFixed(6)
}

/**
 * The same wave field in GLSL, generated from `SURFACE_WAVES` so the two
 * mirrors share constants by construction. Inject once per shader:
 * `surfaceWaveHeight(p, t)`, `surfaceWaveSlope(p, t)`,
 * `surfaceWaveNormal(p, t)`, `surfaceWaveFocus(p, t)` — `p` is world XZ,
 * `t` is the shared frozen time in seconds.
 */
export const SURFACE_WAVE_GLSL: string = (() => {
  const heightTerms = DERIVED_WAVES.map(
    wave =>
      `  h += ${fmt(wave.amplitudeM)} * sin(dot(p, vec2(${fmt(wave.dirX)}, ${fmt(wave.dirZ)})) * ${fmt(wave.k)} - ${fmt(wave.omega)} * t + ${fmt(wave.phaseRad)});`,
  ).join('\n')
  const slopeTerms = DERIVED_WAVES.map(
    wave =>
      `  s += ${fmt(wave.amplitudeM * wave.k)} * cos(dot(p, vec2(${fmt(wave.dirX)}, ${fmt(wave.dirZ)})) * ${fmt(wave.k)} - ${fmt(wave.omega)} * t + ${fmt(wave.phaseRad)}) * vec2(${fmt(wave.dirX)}, ${fmt(wave.dirZ)});`,
  ).join('\n')
  const focusTerms = DERIVED_WAVES.map(
    wave =>
      `  f += ${fmt(wave.amplitudeM * wave.k * wave.k)} * sin(dot(p, vec2(${fmt(wave.dirX)}, ${fmt(wave.dirZ)})) * ${fmt(wave.k)} - ${fmt(wave.omega)} * t + ${fmt(wave.phaseRad)});`,
  ).join('\n')
  const rippleSlopeTerms = DERIVED_RIPPLE_WAVES.map(
    wave =>
      `  s += ${fmt(wave.amplitudeM * wave.k)} * cos(dot(p, vec2(${fmt(wave.dirX)}, ${fmt(wave.dirZ)})) * ${fmt(wave.k)} - ${fmt(wave.omega)} * t + ${fmt(wave.phaseRad)}) * vec2(${fmt(wave.dirX)}, ${fmt(wave.dirZ)});`,
  ).join('\n')
  return `// Shared surface wave field (surface-waves.ts): 4 summed sines,
// dispersion-derived frequencies, analytic normals, negative-Laplacian
// focus proxy. Generated from SURFACE_WAVES — keep the TS and GLSL in
// sync by editing the wave table, never this string by hand.
// surfaceRippleSlope / surfaceRippleNormal carry the high-frequency
// ripple octave: normals/glitter only, never height, focus, shafts, or
// caustics.
float surfaceWaveHeight(vec2 p, float t) {
  float h = 0.0;
${heightTerms}
  return h;
}
vec2 surfaceWaveSlope(vec2 p, float t) {
  vec2 s = vec2(0.0);
${slopeTerms}
  return s;
}
vec3 surfaceWaveNormal(vec2 p, float t) {
  vec2 s = surfaceWaveSlope(p, t);
  return normalize(vec3(-s.x, 1.0, -s.y));
}
float surfaceWaveFocus(vec2 p, float t) {
  float f = 0.0;
${focusTerms}
  return f / ${fmt(SURFACE_FOCUS_NORMALISER)};
}
vec2 surfaceRippleSlope(vec2 p, float t) {
  vec2 s = vec2(0.0);
${rippleSlopeTerms}
  return s;
}
vec3 surfaceRippleNormal(vec2 p, float t) {
  vec2 s = surfaceWaveSlope(p, t) + surfaceRippleSlope(p, t);
  return normalize(vec3(-s.x, 1.0, -s.y));
}
`
})()
