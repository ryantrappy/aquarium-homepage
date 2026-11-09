/** Smoothed FPS / frame-time sampling for the debug counter (AQ-83).
 *
 * A read-only observer of the frame intervals the renderer already computes
 * in `tick()`: it never feeds back into animation rates, LOD, or the tick
 * loop's structure. It mirrors the adaptive-quality controller's rule that
 * hidden / paused / reduced-motion frames do not count as load — those
 * intervals clear the window instead of polluting the average.
 */

export type FrameRateSample = { fps: number; frameTimeMs: number }

/** Frames needed before a sample is reported, so the badge never flashes a
 * single-frame value while warming up. */
export const FRAME_RATE_WARM_UP_FRAMES = 10
/** Cadence at which the renderer pushes samples to the HUD (2–4 Hz, AQ-83
 * AC #2). */
export const FRAME_RATE_PUSH_INTERVAL_MS = 300
/** An interval longer than this is a suspension gap (pause / hidden tab),
 * not a slow frame — it resets the average instead of dragging it down. */
export const FRAME_RATE_MAX_INTERVAL_MS = 1000

export class FrameRateSampler {
  private emaMs: number | undefined
  private frames = 0

  record(intervalMs: number, excluded = false): void {
    if (excluded) {
      this.emaMs = undefined
      this.frames = 0
      return
    }
    if (!Number.isFinite(intervalMs) || intervalMs <= 0 || intervalMs > FRAME_RATE_MAX_INTERVAL_MS) {
      this.emaMs = undefined
      this.frames = 0
      return
    }
    this.emaMs = this.emaMs === undefined ? intervalMs : this.emaMs * 0.9 + intervalMs * 0.1
    this.frames += 1
  }

  sample(): FrameRateSample | null {
    if (this.emaMs === undefined || this.frames < FRAME_RATE_WARM_UP_FRAMES) return null
    const frameTimeMs = Math.round(this.emaMs * 10) / 10
    return { fps: Math.round(1000 / this.emaMs), frameTimeMs }
  }
}

export type FrameRateState = { paused: boolean; hidden: boolean }

/** Badge text for a sample (or for a suspended sampler). The badge itself is
 * updated imperatively by ref, never by React state (AQ-83 AC #2). */
export function formatFrameRate(sample: FrameRateSample | null, state: FrameRateState): string {
  if (sample === null) {
    if (state.paused) return 'Paused'
    if (state.hidden) return 'Suspended'
    return '—'
  }
  return `${sample.fps} FPS · ${sample.frameTimeMs.toFixed(1)} ms`
}
