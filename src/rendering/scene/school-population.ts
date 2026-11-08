import { sampleFishBehavior } from '../../lib/fish-behavior'
import type { ServiceConfig } from '../../lib/services'
import type { Vec3 } from '../../simulation/habitat-navigation'
import { seedForId } from './motion'

/**
 * Non-link schoolmates (AQ-41/AQ-44/AQ-45; Ryan's 2026-11-08 population
 * decision): when a configured service uses a schooling species, the live
 * scene spawns visual-only schoolmates alongside the service fish so a school
 * visibly coheres. Totals are the midpoints of Ryan's chosen ranges
 * (5–7 chromis, 3–5 anthias) and count the service fish itself.
 */
export const SCHOOL_SPECIES = ['blue-green-chromis', 'lyretail-anthias'] as const
export type SchoolSpeciesId = (typeof SCHOOL_SPECIES)[number]
export const SCHOOL_TOTAL_COUNT: Readonly<Record<SchoolSpeciesId, number>> = Object.freeze({
  'blue-green-chromis': 6,
  'lyretail-anthias': 4,
})

export type SchoolmateDescriptor = Readonly<{
  /** Deterministic id: `<service-id>::schoolmate-<index>`. */
  id: string
  serviceId: string
  speciesId: SchoolSpeciesId
  /** 1-based index among the schoolmates of one service fish. */
  index: number
}>

export function schoolmateId(serviceId: string, index: number): string {
  return `${serviceId}::schoolmate-${index}`
}

export function isSchoolmateId(id: string): boolean {
  return id.includes('::schoolmate-')
}

export function isSchoolSpecies(speciesId: string): speciesId is SchoolSpeciesId {
  return speciesId === 'blue-green-chromis' || speciesId === 'lyretail-anthias'
}

/**
 * The schoolmates to spawn for the current service list: one descriptor per
 * non-link fish. Schoolmates carry no service URL and no anchor — the
 * descriptor has no link fields by construction — and are reconciled with the
 * service list by the caller, so removing or changing a service cannot strand
 * them (AQ-64).
 */
export function resolveSchoolPopulation(services: readonly ServiceConfig[]): SchoolmateDescriptor[] {
  const mates: SchoolmateDescriptor[] = []
  for (const service of services) {
    if (!isSchoolSpecies(service.fishId)) continue
    const total = SCHOOL_TOTAL_COUNT[service.fishId]
    for (let index = 1; index < total; index++) {
      mates.push({ id: schoolmateId(service.id, index), serviceId: service.id, speciesId: service.fishId, index })
    }
  }
  return mates
}

/**
 * Deterministic spawn offset around the lead (service) fish, from the
 * species profile's own per-instance variation: the sampled
 * `homeOffsetTankWidths` (chromis 0.012–0.06, anthias 0.02–0.078 tank widths)
 * scaled by the tank width, in a direction from the sampled
 * `phaseOffsetRadians`. Mates are additionally spread evenly around the lead
 * by mate index (`mateIndex` of `mateCount`), so two mates can never share a
 * spawn direction even when their sampled phases coincide — the school does
 * not read as clones. Mates therefore start clustered near their lead fish
 * — close enough for Boids cohesion (neighbour radius 2.2 / 2.0) to hold the
 * school together — but visibly distinct. No `schoolCenter` habitat anchor
 * is used: the runtime habitat emits only `grazingSurface` anchors, so
 * inventing a centre would be a fabrication; the lead fish is the cluster
 * centre instead.
 */
export function schoolmateSpawnOffset(
  schoolmateIdValue: string,
  speciesId: SchoolSpeciesId,
  tankWidth: number,
  mateIndex: number,
  mateCount: number,
): Vec3 {
  const variation = sampleFishBehavior(speciesId, seedForId(schoolmateIdValue))
  const radius = variation.homeOffsetTankWidths * tankWidth
  const phase = variation.phaseOffsetRadians + ((mateIndex - 1) * Math.PI * 2) / Math.max(1, mateCount)
  return {
    x: Math.cos(phase) * radius,
    y: Math.sin(phase * 2) * radius * 0.5,
    z: Math.sin(phase) * radius,
  }
}
