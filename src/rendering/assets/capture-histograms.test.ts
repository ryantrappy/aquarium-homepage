import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// @ts-expect-error Exercise the plain .mjs script exports directly.
import { computeCausticSpatialMetrics, measure } from '../../../scripts/measure-capture-histograms.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')

describe('photorealism rubric histogram & caustic spatial-frequency analyzer (AQ-70.1)', () => {
  it('measures zero caustic frequency on a uniform luminance grid and detects periodic caustic ridges', () => {
    const cols = 120
    const rows = 16
    const flat = new Float32Array(cols * rows).fill(0.35)
    expect(computeCausticSpatialMetrics(flat, cols, rows, 1)).toEqual({
      cyclesPer1000Px: 0,
      meanCellSpacingPx: 0,
      localRmsContrast: 0,
    })

    // Synthetic 25 px period caustic ridge pattern -> ~40 cycles / 1000 px
    const periodic = new Float32Array(cols * rows)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        periodic[r * cols + c] = 0.35 + 0.12 * Math.sin((2 * Math.PI * c) / 25)
      }
    }
    const metrics = computeCausticSpatialMetrics(periodic, cols, rows, 1)
    expect(metrics.cyclesPer1000Px).toBeGreaterThanOrEqual(32)
    expect(metrics.cyclesPer1000Px).toBeLessThanOrEqual(48)
    expect(metrics.meanCellSpacingPx).toBeGreaterThanOrEqual(20)
    expect(metrics.meanCellSpacingPx).toBeLessThanOrEqual(32)
    expect(metrics.localRmsContrast).toBeGreaterThan(0.05)
  })

  it('reproducibly scores the committed AQ-70.2 laptop baseline and goal visual sand crop', () => {
    const baselinePath = path.join(REPO_ROOT, 'docs/asset-evidence/aq70-2/baseline-before/laptop-full-scene-run1.png')
    const baseStats = measure(baselinePath, null, 2)
    expect(baseStats.image).toEqual({ width: 1440, height: 900 })
    expect(baseStats.luminance.mean).toBeCloseTo(0.231, 2)
    expect(baseStats.luminance.p10).toBeCloseTo(0.05, 2)
    expect(baseStats.saturation.mean).toBeCloseTo(0.623, 2)
    expect(baseStats.caustics.cyclesPer1000Px).toBeGreaterThan(10)

    const goalPath = path.join(REPO_ROOT, 'docs/more-realistic-reef-guide.png')
    const goalSand = measure(goalPath, [520, 440, 560, 160], 1)
    expect(goalSand.caustics.cyclesPer1000Px).toBeCloseTo(40.01, 1)
    expect(goalSand.caustics.localRmsContrast).toBeCloseTo(0.0864, 3)
  })
})
