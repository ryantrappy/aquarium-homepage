import { SPECIES_BEHAVIOR_IDS, type BehaviorState, type SpeciesBehaviorId } from '../../lib/fish-behavior'
import {
  MAX_EXTENSION_PLAYBACK_RATE,
  type FishAnimationExtension,
  type FishBehaviorExtension,
  type FishBehaviorIntent,
  type FishExtensionConfig,
  type FishExtensionLayer,
  type FishExtensionSnapshot,
} from '../../simulation/fish-extensions'

export type SpeciesLocomotionSignature = Readonly<{
  speciesId: SpeciesBehaviorId
  basePlaybackByState: Readonly<Record<BehaviorState, number>>
  pulseAmplitude: number
  pulseFrequencyHz: number
  speedPlaybackGain: number
  opportunityTrigger?: 'foraging-opportunity' | 'display-opportunity'
  opportunityIntervalSeconds: number
}>

export const SPECIES_LOCOMOTION_SIGNATURES: Readonly<
  Record<SpeciesBehaviorId, SpeciesLocomotionSignature>
> = Object.freeze({
  'ocellaris-clownfish': {
    speciesId: 'ocellaris-clownfish',
    basePlaybackByState: { idle: 0.92, swim: 1.18, forage: 1.12, display: 1.32, burst: 1.55, retreat: 1.65 },
    pulseAmplitude: 0.14,
    pulseFrequencyHz: 1.6,
    speedPlaybackGain: 0.18,
    opportunityTrigger: 'display-opportunity',
    opportunityIntervalSeconds: 7.5,
  },
  'yellow-tang': {
    speciesId: 'yellow-tang',
    basePlaybackByState: { idle: 0.78, swim: 1.12, forage: 1.24, display: 1.28, burst: 1.6, retreat: 1.72 },
    pulseAmplitude: 0.08,
    pulseFrequencyHz: 1.1,
    speedPlaybackGain: 0.22,
    opportunityTrigger: 'foraging-opportunity',
    opportunityIntervalSeconds: 6.0,
  },
  'blue-tang': {
    speciesId: 'blue-tang',
    basePlaybackByState: { idle: 0.82, swim: 1.18, forage: 1.22, display: 1.3, burst: 1.65, retreat: 1.78 },
    pulseAmplitude: 0.09,
    pulseFrequencyHz: 1.25,
    speedPlaybackGain: 0.24,
    opportunityTrigger: 'foraging-opportunity',
    opportunityIntervalSeconds: 6.5,
  },
  'royal-gramma': {
    speciesId: 'royal-gramma',
    basePlaybackByState: { idle: 0.68, swim: 1.06, forage: 1.08, display: 1.26, burst: 1.52, retreat: 1.68 },
    pulseAmplitude: 0.07,
    pulseFrequencyHz: 0.95,
    speedPlaybackGain: 0.16,
    opportunityTrigger: 'display-opportunity',
    opportunityIntervalSeconds: 8.5,
  },
  'banggai-cardinalfish': {
    speciesId: 'banggai-cardinalfish',
    basePlaybackByState: { idle: 0.52, swim: 0.88, forage: 0.94, display: 0.98, burst: 1.35, retreat: 1.45 },
    pulseAmplitude: 0.04,
    pulseFrequencyHz: 0.65,
    speedPlaybackGain: 0.12,
    opportunityTrigger: 'display-opportunity',
    opportunityIntervalSeconds: 10.0,
  },
  'blue-green-chromis': {
    speciesId: 'blue-green-chromis',
    basePlaybackByState: { idle: 0.95, swim: 1.26, forage: 1.28, display: 1.34, burst: 1.62, retreat: 1.75 },
    pulseAmplitude: 0.11,
    pulseFrequencyHz: 1.85,
    speedPlaybackGain: 0.22,
    opportunityTrigger: 'foraging-opportunity',
    opportunityIntervalSeconds: 6.5,
  },
  firefish: {
    speciesId: 'firefish',
    basePlaybackByState: { idle: 0.72, swim: 1.08, forage: 1.1, display: 1.28, burst: 1.68, retreat: 1.82 },
    pulseAmplitude: 0.16,
    pulseFrequencyHz: 1.45,
    speedPlaybackGain: 0.15,
    opportunityTrigger: 'display-opportunity',
    opportunityIntervalSeconds: 7.0,
  },
  'yellow-watchman-goby': {
    speciesId: 'yellow-watchman-goby',
    basePlaybackByState: { idle: 0.45, swim: 1.22, forage: 1.05, display: 1.18, burst: 1.5, retreat: 1.65 },
    pulseAmplitude: 0.05,
    pulseFrequencyHz: 0.8,
    speedPlaybackGain: 0.2,
    opportunityTrigger: 'display-opportunity',
    opportunityIntervalSeconds: 9.0,
  },
  'mandarin-dragonet': {
    speciesId: 'mandarin-dragonet',
    basePlaybackByState: { idle: 1.18, swim: 1.32, forage: 1.48, display: 1.52, burst: 1.58, retreat: 1.65 },
    pulseAmplitude: 0.09,
    pulseFrequencyHz: 2.4,
    speedPlaybackGain: 0.1,
    opportunityTrigger: 'foraging-opportunity',
    opportunityIntervalSeconds: 5.5,
  },
  'tailspot-blenny': {
    speciesId: 'tailspot-blenny',
    basePlaybackByState: { idle: 0.52, swim: 1.16, forage: 1.24, display: 1.18, burst: 1.52, retreat: 1.68 },
    pulseAmplitude: 0.08,
    pulseFrequencyHz: 1.3,
    speedPlaybackGain: 0.18,
    opportunityTrigger: 'foraging-opportunity',
    opportunityIntervalSeconds: 6.5,
  },
  'six-line-wrasse': {
    speciesId: 'six-line-wrasse',
    basePlaybackByState: { idle: 0.92, swim: 1.24, forage: 1.32, display: 1.35, burst: 1.6, retreat: 1.74 },
    pulseAmplitude: 0.1,
    pulseFrequencyHz: 1.7,
    speedPlaybackGain: 0.2,
    opportunityTrigger: 'foraging-opportunity',
    opportunityIntervalSeconds: 5.8,
  },
  'mccoskers-flasher-wrasse': {
    speciesId: 'mccoskers-flasher-wrasse',
    basePlaybackByState: { idle: 0.94, swim: 1.22, forage: 1.25, display: 1.55, burst: 1.66, retreat: 1.78 },
    pulseAmplitude: 0.14,
    pulseFrequencyHz: 1.9,
    speedPlaybackGain: 0.22,
    opportunityTrigger: 'display-opportunity',
    opportunityIntervalSeconds: 6.2,
  },
  'lyretail-anthias': {
    speciesId: 'lyretail-anthias',
    basePlaybackByState: { idle: 0.96, swim: 1.28, forage: 1.3, display: 1.42, burst: 1.62, retreat: 1.76 },
    pulseAmplitude: 0.12,
    pulseFrequencyHz: 1.8,
    speedPlaybackGain: 0.22,
    opportunityTrigger: 'display-opportunity',
    opportunityIntervalSeconds: 6.8,
  },
  'flame-angelfish': {
    speciesId: 'flame-angelfish',
    basePlaybackByState: { idle: 0.84, swim: 1.14, forage: 1.22, display: 1.26, burst: 1.54, retreat: 1.7 },
    pulseAmplitude: 0.08,
    pulseFrequencyHz: 1.2,
    speedPlaybackGain: 0.18,
    opportunityTrigger: 'foraging-opportunity',
    opportunityIntervalSeconds: 6.4,
  },
  'copperband-butterflyfish': {
    speciesId: 'copperband-butterflyfish',
    basePlaybackByState: { idle: 0.66, swim: 0.94, forage: 1.06, display: 1.08, burst: 1.38, retreat: 1.52 },
    pulseAmplitude: 0.06,
    pulseFrequencyHz: 0.85,
    speedPlaybackGain: 0.14,
    opportunityTrigger: 'foraging-opportunity',
    opportunityIntervalSeconds: 7.2,
  },
})

function clampPlaybackRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1
  return Math.min(MAX_EXTENSION_PLAYBACK_RATE, Math.max(0.25, rate))
}

function createSpeciesAnimationExtension(signature: SpeciesLocomotionSignature): FishAnimationExtension {
  const id = `locomotion-cadence-${signature.speciesId}`
  return {
    kind: 'animation',
    id,
    create(initialSnapshot: FishExtensionSnapshot) {
      let elapsedTotal = (initialSnapshot.instanceId.length * 0.37) % 10
      return {
        step(snapshot: FishExtensionSnapshot, elapsedSeconds: number) {
          elapsedTotal = (elapsedTotal + elapsedSeconds) % 3600
          const base = signature.basePlaybackByState[snapshot.state] ?? 1
          const pulse =
            signature.pulseAmplitude *
            Math.sin(elapsedTotal * Math.PI * 2 * signature.pulseFrequencyHz)
          const speedBoost = Math.min(0.35, snapshot.speed * signature.speedPlaybackGain)
          return {
            playbackRate: clampPlaybackRate(base + pulse + speedBoost),
          }
        },
      }
    },
  }
}

function createSpeciesBehaviorExtension(signature: SpeciesLocomotionSignature): FishBehaviorExtension {
  const id = `reef-opportunity-${signature.speciesId}`
  return {
    kind: 'behavior',
    id,
    create() {
      let timer = 0
      return {
        step(snapshot: FishExtensionSnapshot, elapsedSeconds: number): readonly FishBehaviorIntent[] {
          if (!signature.opportunityTrigger) return []
          if (snapshot.state !== 'swim' && snapshot.state !== 'idle') {
            timer = 0
            return []
          }
          timer += elapsedSeconds
          if (timer >= signature.opportunityIntervalSeconds) {
            timer = 0
            return [
              {
                type: 'behavior-opportunity',
                trigger: signature.opportunityTrigger,
              },
            ]
          }
          return []
        },
      }
    },
  }
}

function buildSpeciesLayer(signature: SpeciesLocomotionSignature): FishExtensionLayer {
  const animExt = createSpeciesAnimationExtension(signature)
  const behExt = createSpeciesBehaviorExtension(signature)
  return Object.freeze({
    [animExt.id]: { operation: 'add' as const, extension: animExt },
    [behExt.id]: { operation: 'add' as const, extension: behExt },
  })
}

/**
 * Complete opt-in `FishExtensionConfig` providing species-specific locomotion cadence
 * modulation and reef opportunity triggers across all 15 supported reef species (AQ-18..AQ-32).
 */
export const SPECIES_LOCOMOTION_EXTENSIONS: FishExtensionConfig = Object.freeze({
  species: Object.freeze(
    Object.fromEntries(
      SPECIES_BEHAVIOR_IDS.map(speciesId => [
        speciesId,
        buildSpeciesLayer(SPECIES_LOCOMOTION_SIGNATURES[speciesId]),
      ]),
    ) as Record<SpeciesBehaviorId, FishExtensionLayer>,
  ),
})
