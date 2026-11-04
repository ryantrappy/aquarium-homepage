/** Every scene consumer advances the same bounded simulation time. */
export const SIMULATION_STEP_SECONDS = 1 / 60
export const MAX_FRAME_SECONDS = .1
const EPSILON = 1e-9
export type FrameClock = { previousTimestamp?: number; accumulatorSeconds: number }
export const createFrameClock = (): FrameClock => ({ accumulatorSeconds: 0 })

export function boundedSimulationSeconds(elapsed: number) {
  return Number.isFinite(elapsed) && elapsed > 0 ? Math.min(MAX_FRAME_SECONDS, elapsed) : 0
}

/** Preserve simulation state/fraction; discard only the suspended wall-clock gap. */
export function suspendFrameClock(clock: FrameClock) { clock.previousTimestamp = undefined }

export function consumeFrameSteps(clock: FrameClock, timestamp: number): number {
  if (!Number.isFinite(timestamp)) return 0
  const previous = clock.previousTimestamp
  if (previous === undefined) { clock.previousTimestamp = timestamp; return 0 }
  // rAF can carry an earlier timestamp than a synchronous performance.now()
  // read. Use only its own monotonic samples; manual draws never touch this.
  if (timestamp <= previous) return 0
  clock.previousTimestamp = timestamp
  clock.accumulatorSeconds += boundedSimulationSeconds((timestamp - previous) / 1000)
  const steps = Math.min(6, Math.floor((clock.accumulatorSeconds + EPSILON) / SIMULATION_STEP_SECONDS))
  clock.accumulatorSeconds = Math.max(0, clock.accumulatorSeconds - steps * SIMULATION_STEP_SECONDS)
  return steps
}

/** Also bound direct callers of the pure motion adapter, not just the renderer. */
export function simulationSubsteps(elapsed: number): number[] {
  let remaining = boundedSimulationSeconds(elapsed)
  const steps: number[] = []
  while (remaining > EPSILON) { const step = Math.min(SIMULATION_STEP_SECONDS, remaining); steps.push(step); remaining -= step }
  return steps
}
