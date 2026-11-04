// Same test GLBs and animation clips in each engine. Candidate files are local-only.
export const assets = ['./candidate-clown.glb', './candidate-tang.glb']
// Bounds measured once from the same skinned GLBs in the initial test pose.
// Calibrations are specific to these local control assets, never species metadata.
export const calibration = [
  { yaw: 0, center: [-.3899466, .3883604, .6601969], width: .4435435 },
  { yaw: Math.PI / 2, center: [-.1872192, .7103285, -1.0799119], width: .4191675 },
] as const
export const canvas = document.querySelector<HTMLCanvasElement>('canvas')!
export const info = document.querySelector<HTMLElement>('#metrics')!
export const selected = new URLSearchParams(location.search).get('engine') ?? 'three'
let frames = 0, sum = 0, previous = performance.now()
export function sample() {
  const now = performance.now(), dt = now - previous; previous = now
  if (dt < 250) { frames++; sum += dt }
  if (frames >= 120) { info.textContent = `${selected} · local frame interval ${(sum / frames).toFixed(1)} ms (browser only)`; frames = 0; sum = 0 }
}
export const wide = () => innerWidth >= 600
export const xPosition = (i: number) => wide() ? (i ? 1.45 : -1.45) : 0
export const yPosition = (i: number) => wide() ? 0 : (i ? -.8 : .8)

