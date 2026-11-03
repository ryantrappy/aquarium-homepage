import { z } from 'zod'
import { REEF_FISH } from './fish'

/**
 * Engine-independent species tuning. Speed is expressed as tank widths per
 * second; depth is normalized from the water surface (0) to the sand (1).
 * Numeric values are artistic scene-tuning ranges, not measured field speeds.
 */
export const SPECIES_BEHAVIOR_IDS = [
  'ocellaris-clownfish',
  'yellow-tang',
  'royal-gramma',
  'blue-tang',
  'banggai-cardinalfish',
  'blue-green-chromis',
  'firefish',
  'yellow-watchman-goby',
  'mandarin-dragonet',
  'tailspot-blenny',
  'six-line-wrasse',
  'mccoskers-flasher-wrasse',
  'lyretail-anthias',
  'flame-angelfish',
  'copperband-butterflyfish',
] as const

export type SpeciesBehaviorId = typeof SPECIES_BEHAVIOR_IDS[number]
export type HabitatAnchor =
  | 'hostAnemone'
  | 'grazingSurface'
  | 'branchingCoralRefuge'
  | 'branchingCoralShelter'
  | 'rockCrevice'
  | 'rockPerch'
  | 'sandBurrowEntrance'
  | 'seagrassEdge'
  | 'foragingPatch'
  | 'reefSlopeRubble'
  | 'coralOutcrop'
  | 'schoolCenter'

export type BehaviorState = 'idle' | 'swim' | 'forage' | 'retreat' | 'display' | 'burst'
export type BehaviorTrigger =
  | 'idle-window-complete'
  | 'swim-segment-complete'
  | 'foraging-opportunity'
  | 'foraging-window-complete'
  | 'threat-cue'
  | 'refuge-reached'
  | 'display-opportunity'
  | 'display-window-complete'
  | 'high-effort-cue'
  | 'effort-window-complete'

type NumericRange = readonly [minimum: number, maximum: number]

export type BehaviorStateConfig = {
  cue: string
  durationSeconds: NumericRange
  anchor?: HabitatAnchor
  speedMultiplier: number
}

export type BehaviorTransition = {
  from: BehaviorState
  to: BehaviorState
  trigger: BehaviorTrigger
  /** A visual tuning weight for the shared engine, not a biological probability. */
  selectionWeight: number
}

export type SpeciesBehaviorProfile = {
  speciesId: SpeciesBehaviorId
  habitatMode:
    | 'host-associated'
    | 'sheltered-reef'
    | 'open-reef-cruise'
    | 'schooling-over-reef'
    | 'burrow-associated'
    | 'substrate-foraging'
    | 'near-cover-search'
    | 'midwater-display'
  preferredZone: 'upper-reef' | 'midwater' | 'reef-edge' | 'lower-reef' | 'substrate'
  /** Normalized top-to-bottom tank depth, selected for scene composition. */
  depthRange: NumericRange
  anchors: readonly HabitatAnchor[]
  locomotion: {
    gait:
      | 'pectoral-cruise'
      | 'body-caudal-undulation'
      | 'fin-hover'
      | 'school-hover'
      | 'sand-burrow-hover'
      | 'substrate-stop-start'
      | 'near-rock-darts'
      | 'sinuous-cover-search'
      | 'reef-slope-patrol'
      | 'loose-group-cruise'
      | 'compact-reef-orbit'
      | 'crevice-inspection'
    speedTankWidthsPerSecond: NumericRange
    turnDegreesPerSecond: NumericRange
    /** The profile identifies a primary gait; higher-effort gait changes are explicit here. */
    higherEffortGaits?: readonly ('body-caudal-undulation' | 'burst-and-coast' | 'short-refuge-dart')[]
  }
  states: {
    idle: BehaviorStateConfig
    swim: BehaviorStateConfig
    forage?: BehaviorStateConfig
    retreat?: BehaviorStateConfig & { destination: HabitatAnchor; eligibility?: 'juvenile-or-subadult' }
    display?: BehaviorStateConfig
    burst?: BehaviorStateConfig
  }
  transitions: readonly BehaviorTransition[]
  individuality: {
    phaseOffsetRadians: NumericRange
    homeOffsetTankWidths: NumericRange
  }
  evidence: {
    kind: 'documented-behavior' | 'morphology-inference' | 'habitat-staging-inference'
    summary: string
    sourceRefs: readonly string[]
  }
}

type DeepReadonly<T> = T extends readonly unknown[]
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T

const rangeSchema = z.tuple([z.number().finite(), z.number().finite()]).refine(([min, max]) => min >= 0 && min < max)
const durationRangeSchema = rangeSchema.refine(([, max]) => max <= 30)
const speedRangeSchema = z.tuple([z.number().finite().positive(), z.number().finite().positive()])
  .refine(([min, max]) => min < max && max <= 0.5)
const turnRangeSchema = z.tuple([z.number().finite().positive(), z.number().finite().positive()])
  .refine(([min, max]) => min < max && max <= 180)
const anchorSchema = z.enum([
  'hostAnemone', 'grazingSurface', 'branchingCoralRefuge', 'branchingCoralShelter', 'rockCrevice',
  'rockPerch', 'sandBurrowEntrance', 'seagrassEdge', 'foragingPatch', 'reefSlopeRubble', 'coralOutcrop', 'schoolCenter',
])
const stateConfigSchema = z.object({
  cue: z.string().min(4),
  durationSeconds: durationRangeSchema,
  anchor: anchorSchema.optional(),
  speedMultiplier: z.number().finite().positive().max(4),
}).strict()
const stateSchema = z.enum(['idle', 'swim', 'forage', 'retreat', 'display', 'burst'])
const triggerSchema = z.enum([
  'idle-window-complete', 'swim-segment-complete', 'foraging-opportunity', 'foraging-window-complete',
  'threat-cue', 'refuge-reached', 'display-opportunity', 'display-window-complete', 'high-effort-cue', 'effort-window-complete',
])
const profileSchema = z.object({
  speciesId: z.enum(SPECIES_BEHAVIOR_IDS),
  habitatMode: z.enum([
    'host-associated', 'sheltered-reef', 'open-reef-cruise', 'schooling-over-reef', 'burrow-associated',
    'substrate-foraging', 'near-cover-search', 'midwater-display',
  ]),
  preferredZone: z.enum(['upper-reef', 'midwater', 'reef-edge', 'lower-reef', 'substrate']),
  depthRange: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).refine(([min, max]) => min < max),
  anchors: z.array(anchorSchema).min(1),
  locomotion: z.object({
    gait: z.enum([
      'pectoral-cruise', 'body-caudal-undulation', 'fin-hover', 'school-hover', 'sand-burrow-hover',
      'substrate-stop-start', 'near-rock-darts', 'sinuous-cover-search', 'reef-slope-patrol',
      'loose-group-cruise', 'compact-reef-orbit', 'crevice-inspection',
    ]),
    speedTankWidthsPerSecond: speedRangeSchema,
    turnDegreesPerSecond: turnRangeSchema,
    higherEffortGaits: z.array(z.enum(['body-caudal-undulation', 'burst-and-coast', 'short-refuge-dart'])).optional(),
  }).strict(),
  states: z.object({
    idle: stateConfigSchema,
    swim: stateConfigSchema,
    forage: stateConfigSchema.optional(),
    retreat: stateConfigSchema.extend({ destination: anchorSchema, eligibility: z.literal('juvenile-or-subadult').optional() }).optional(),
    display: stateConfigSchema.optional(),
    burst: stateConfigSchema.optional(),
  }).strict(),
  transitions: z.array(z.object({
    from: stateSchema,
    to: stateSchema,
    trigger: triggerSchema,
    selectionWeight: z.number().finite().positive().max(1),
  }).strict()).min(1),
  individuality: z.object({
    phaseOffsetRadians: z.tuple([z.number().min(0), z.number().max(Math.PI * 2)])
      .refine(([min, max]) => min < max),
    homeOffsetTankWidths: z.tuple([z.number().min(0), z.number().max(0.25)])
      .refine(([min, max]) => min < max),
  }).strict(),
  evidence: z.object({
    kind: z.enum(['documented-behavior', 'morphology-inference', 'habitat-staging-inference']),
    summary: z.string().min(12),
    sourceRefs: z.array(z.string().url()).min(1),
  }).strict(),
}).strict()

const commonTransitions = [
  { from: 'idle', to: 'swim', trigger: 'idle-window-complete', selectionWeight: 0.65 },
  { from: 'swim', to: 'idle', trigger: 'swim-segment-complete', selectionWeight: 0.8 },
] as const satisfies readonly BehaviorTransition[]

function transitionsFor(
  extras: readonly BehaviorTransition[] = [],
): readonly BehaviorTransition[] {
  return [...commonTransitions, ...extras]
}

const profiles = {
  'ocellaris-clownfish': {
    speciesId: 'ocellaris-clownfish', habitatMode: 'host-associated', preferredZone: 'upper-reef', depthRange: [0.18, 0.48],
    anchors: ['hostAnemone'],
    locomotion: { gait: 'fin-hover', speedTankWidthsPerSecond: [0.012, 0.045], turnDegreesPerSecond: [28, 72] },
    states: {
      idle: { cue: 'Hold and bob within the host tentacles.', durationSeconds: [2.2, 6.5], anchor: 'hostAnemone', speedMultiplier: 0.25 },
      swim: { cue: 'Make a short station-keeping loop around the same host.', durationSeconds: [1.8, 4.2], anchor: 'hostAnemone', speedMultiplier: 0.85 },
      retreat: { cue: 'Return into the host when a threat cue occurs.', durationSeconds: [0.35, 0.9], anchor: 'hostAnemone', destination: 'hostAnemone', speedMultiplier: 1.8 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'retreat', trigger: 'threat-cue', selectionWeight: 1 },
      { from: 'retreat', to: 'idle', trigger: 'refuge-reached', selectionWeight: 1 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.006, 0.025] },
    evidence: { kind: 'documented-behavior', summary: 'Host-anemone association is documented; tight station-keeping is an animation interpretation, not a fixed tether distance.', sourceRefs: ['https://www.aquariumofpacific.org/onlinelearningcenter/species/clown_anemonefish', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6850181/'] },
  },
  'yellow-tang': {
    speciesId: 'yellow-tang', habitatMode: 'open-reef-cruise', preferredZone: 'reef-edge', depthRange: [0.22, 0.7],
    anchors: ['grazingSurface'],
    locomotion: { gait: 'pectoral-cruise', speedTankWidthsPerSecond: [0.045, 0.12], turnDegreesPerSecond: [34, 82], higherEffortGaits: ['body-caudal-undulation', 'burst-and-coast'] },
    states: {
      idle: { cue: 'Pause in a steady hover near reef structure.', durationSeconds: [1.2, 3.8], speedMultiplier: 0.15 },
      swim: { cue: 'Cruise steadily with pectoral-driven fin beats.', durationSeconds: [3.5, 8.5], speedMultiplier: 1 },
      forage: { cue: 'Make brief algae-grazing pecks at a rock surface.', durationSeconds: [1.4, 4.5], anchor: 'grazingSurface', speedMultiplier: 0.35 },
      burst: { cue: 'Use a brief high-effort burst-and-coast, then return to cruise.', durationSeconds: [0.4, 1.1], speedMultiplier: 2.4 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'forage', trigger: 'foraging-opportunity', selectionWeight: 0.42 },
      { from: 'forage', to: 'swim', trigger: 'foraging-window-complete', selectionWeight: 0.9 },
      { from: 'swim', to: 'burst', trigger: 'high-effort-cue', selectionWeight: 0.08 },
      { from: 'burst', to: 'swim', trigger: 'effort-window-complete', selectionWeight: 1 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.025, 0.085] },
    evidence: { kind: 'documented-behavior', summary: 'Algae grazing and pectoral cruise with higher-effort body-caudal transition are documented; numeric ranges are visual tuning.', sourceRefs: ['https://aquarium.org/animals/yellow-tang/', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12602642/'] },
  },
  'royal-gramma': {
    speciesId: 'royal-gramma', habitatMode: 'sheltered-reef', preferredZone: 'lower-reef', depthRange: [0.48, 0.88],
    anchors: ['rockCrevice', 'foragingPatch'],
    locomotion: { gait: 'fin-hover', speedTankWidthsPerSecond: [0.018, 0.058], turnDegreesPerSecond: [38, 92] },
    states: {
      idle: { cue: 'Hover at the mouth of a cave, matching the nearby rock plane.', durationSeconds: [1.8, 5.2], anchor: 'rockCrevice', speedMultiplier: 0.22 },
      swim: { cue: 'Inspect a compact path and return to the same overhang.', durationSeconds: [2.4, 5.5], anchor: 'rockCrevice', speedMultiplier: 0.82 },
      forage: { cue: 'Pick small planktonic or benthic crustaceans near the shelter.', durationSeconds: [1.2, 3.8], anchor: 'foragingPatch', speedMultiplier: 0.42 },
      retreat: { cue: 'Slip back to the cave when a threat cue occurs.', durationSeconds: [0.45, 1.1], anchor: 'rockCrevice', destination: 'rockCrevice', speedMultiplier: 1.5 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'retreat', trigger: 'threat-cue', selectionWeight: 0.8 },
      { from: 'retreat', to: 'idle', trigger: 'refuge-reached', selectionWeight: 1 },
      { from: 'swim', to: 'forage', trigger: 'foraging-opportunity', selectionWeight: 0.35 },
      { from: 'forage', to: 'swim', trigger: 'foraging-window-complete', selectionWeight: 0.9 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.008, 0.035] },
    evidence: { kind: 'documented-behavior', summary: 'Shelter-close behavior, upside-down swimming beneath overhangs, and crustacean diet are documented; turn values and compact paths are visual tuning.', sourceRefs: ['https://www.aquarium-larochelle.com/en/species-encyclopedia/royal-gramma/'] },
  },
  'blue-tang': {
    speciesId: 'blue-tang', habitatMode: 'open-reef-cruise', preferredZone: 'midwater', depthRange: [0.22, 0.62],
    anchors: ['schoolCenter', 'branchingCoralRefuge'],
    locomotion: { gait: 'pectoral-cruise', speedTankWidthsPerSecond: [0.055, 0.14], turnDegreesPerSecond: [58, 118], higherEffortGaits: ['body-caudal-undulation'] },
    states: {
      idle: { cue: 'Hold loosely above the reef with small fin corrections.', durationSeconds: [1.2, 3.6], anchor: 'schoolCenter', speedMultiplier: 0.2 },
      swim: { cue: 'Cruise above the reef in open water.', durationSeconds: [3.4, 8.2], speedMultiplier: 1 },
      retreat: { cue: 'Juvenile or subadult darts into branching coral cover.', durationSeconds: [0.3, 0.85], anchor: 'branchingCoralRefuge', destination: 'branchingCoralRefuge', eligibility: 'juvenile-or-subadult', speedMultiplier: 2.1 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'retreat', trigger: 'threat-cue', selectionWeight: 0.45 },
      { from: 'retreat', to: 'idle', trigger: 'refuge-reached', selectionWeight: 1 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.025, 0.095] },
    evidence: { kind: 'morphology-inference', summary: 'Open-reef aggregation and stage-specific juvenile branch refuge are documented; adult pectoral-driven cruise is inferred from acanthurid morphology.', sourceRefs: ['https://www.marinespecies.org/aphia.php?id=219676&p=taxdetails', 'https://australian.museum/learn/animals/fishes/blue-tang-paracanthurus-hepatus/', 'https://academic.oup.com/evolut/article/80/7/1542/8675045'] },
  },
  'banggai-cardinalfish': {
    speciesId: 'banggai-cardinalfish', habitatMode: 'sheltered-reef', preferredZone: 'upper-reef', depthRange: [0.2, 0.58],
    anchors: ['branchingCoralShelter', 'seagrassEdge', 'foragingPatch'],
    locomotion: { gait: 'fin-hover', speedTankWidthsPerSecond: [0.012, 0.04], turnDegreesPerSecond: [22, 56] },
    states: {
      idle: { cue: 'Hover in sheltered water among vertical structure.', durationSeconds: [2.8, 7.2], anchor: 'branchingCoralShelter', speedMultiplier: 0.18 },
      swim: { cue: 'Make a small, gentle repositioning move within shelter.', durationSeconds: [1.8, 4.4], anchor: 'seagrassEdge', speedMultiplier: 0.58 },
      forage: { cue: 'Pick copepods and plankton near shelter.', durationSeconds: [1.2, 3.2], anchor: 'foragingPatch', speedMultiplier: 0.3 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'forage', trigger: 'foraging-opportunity', selectionWeight: 0.3 },
      { from: 'forage', to: 'swim', trigger: 'foraging-window-complete', selectionWeight: 0.86 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.006, 0.028] },
    evidence: { kind: 'habitat-staging-inference', summary: 'Sheltered habitat, copepod/plankton diet, and long fin rays are described; hover and repositioning are staging choices, not a sourced locomotion pattern.', sourceRefs: ['https://aquarium.org/animals/banggai-cardinalfish/'] },
  },
  'blue-green-chromis': {
    speciesId: 'blue-green-chromis', habitatMode: 'schooling-over-reef', preferredZone: 'upper-reef', depthRange: [0.18, 0.55],
    anchors: ['schoolCenter', 'branchingCoralRefuge'],
    locomotion: { gait: 'school-hover', speedTankWidthsPerSecond: [0.028, 0.09], turnDegreesPerSecond: [45, 105] },
    states: {
      idle: { cue: 'Hover as a loose coordinated school above branching coral.', durationSeconds: [2.4, 6.4], anchor: 'schoolCenter', speedMultiplier: 0.28 },
      swim: { cue: 'Make short coordinated passes with small independent offsets.', durationSeconds: [3.1, 7.8], anchor: 'schoolCenter', speedMultiplier: 0.9 },
      retreat: { cue: 'Contract and retreat into branches on a shared threat cue.', durationSeconds: [0.45, 1.25], anchor: 'branchingCoralRefuge', destination: 'branchingCoralRefuge', speedMultiplier: 1.7 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'retreat', trigger: 'threat-cue', selectionWeight: 0.62 },
      { from: 'retreat', to: 'idle', trigger: 'refuge-reached', selectionWeight: 1 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.012, 0.06] },
    evidence: { kind: 'documented-behavior', summary: 'Groups shelter among branching Acropora and retreat into branches on disturbance; individual spacing is scene tuning.', sourceRefs: ['https://aquarium.org/animals/blue-green-chromis/'] },
  },
  'firefish': {
    speciesId: 'firefish', habitatMode: 'burrow-associated', preferredZone: 'lower-reef', depthRange: [0.48, 0.82],
    anchors: ['sandBurrowEntrance'],
    locomotion: { gait: 'sand-burrow-hover', speedTankWidthsPerSecond: [0.018, 0.065], turnDegreesPerSecond: [52, 120], higherEffortGaits: ['short-refuge-dart'] },
    states: {
      idle: { cue: 'Suspend above the entrance with small corrective movements.', durationSeconds: [2.6, 6.6], anchor: 'sandBurrowEntrance', speedMultiplier: 0.24 },
      swim: { cue: 'Hover and make a short cautious excursion around the entrance.', durationSeconds: [1.8, 4.8], anchor: 'sandBurrowEntrance', speedMultiplier: 0.72 },
      retreat: { cue: 'Dart directly into the sand burrow when frightened.', durationSeconds: [0.25, 0.72], anchor: 'sandBurrowEntrance', destination: 'sandBurrowEntrance', speedMultiplier: 2.5 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'retreat', trigger: 'threat-cue', selectionWeight: 1 },
      { from: 'retreat', to: 'idle', trigger: 'refuge-reached', selectionWeight: 1 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.004, 0.02] },
    evidence: { kind: 'documented-behavior', summary: 'Hovers over a burrow and quickly retreats into it when frightened; hover offsets are visual tuning.', sourceRefs: ['https://www.fao.org/fishery/docs/CDrom/bobp/cd1/Bobp/Publns/MAG/021.pdf'] },
  },
  'yellow-watchman-goby': {
    speciesId: 'yellow-watchman-goby', habitatMode: 'burrow-associated', preferredZone: 'substrate', depthRange: [0.76, 0.98],
    anchors: ['sandBurrowEntrance'],
    locomotion: { gait: 'sand-burrow-hover', speedTankWidthsPerSecond: [0.006, 0.028], turnDegreesPerSecond: [18, 48], higherEffortGaits: ['short-refuge-dart'] },
    states: {
      idle: { cue: 'Keep lookout at the burrow mouth with eye and head tracking.', durationSeconds: [3, 8], anchor: 'sandBurrowEntrance', speedMultiplier: 0.12 },
      swim: { cue: 'Make a low, short move and return to the same entrance.', durationSeconds: [1.1, 3.2], anchor: 'sandBurrowEntrance', speedMultiplier: 0.55 },
      retreat: { cue: 'Back quickly into the shared burrow on a threat cue.', durationSeconds: [0.25, 0.75], anchor: 'sandBurrowEntrance', destination: 'sandBurrowEntrance', speedMultiplier: 2.2 },
    },
    transitions: transitionsFor([
      { from: 'idle', to: 'retreat', trigger: 'threat-cue', selectionWeight: 0.9 },
      { from: 'retreat', to: 'idle', trigger: 'refuge-reached', selectionWeight: 1 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.002, 0.012] },
    evidence: { kind: 'documented-behavior', summary: 'Keeps lookout at a burrow shared with alpheid shrimp; low station-keeping and backward retreat are visual staging of that behavior.', sourceRefs: ['https://australian.museum/learn/animals/fishes/yellow-shrimpgoby-cryptocentrus-cinctus/', 'https://lifg.australian.museum/Group.html?groupId=BDBaE9qK&hierarchyId=CEJQQmVx'] },
  },
  'mandarin-dragonet': {
    speciesId: 'mandarin-dragonet', habitatMode: 'substrate-foraging', preferredZone: 'substrate', depthRange: [0.65, 0.96],
    anchors: ['foragingPatch', 'rockCrevice'],
    locomotion: { gait: 'substrate-stop-start', speedTankWidthsPerSecond: [0.008, 0.038], turnDegreesPerSecond: [42, 96] },
    states: {
      idle: { cue: 'Pause close to rubble between short foraging moves.', durationSeconds: [1.8, 5.2], anchor: 'foragingPatch', speedMultiplier: 0.08 },
      swim: { cue: 'Use stop-start advances along sand, rubble, and rock.', durationSeconds: [1.2, 3.8], anchor: 'foragingPatch', speedMultiplier: 0.72 },
      forage: { cue: 'Inspect a small prey-search patch with brief pecks.', durationSeconds: [1.5, 4.6], anchor: 'foragingPatch', speedMultiplier: 0.28 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'forage', trigger: 'foraging-opportunity', selectionWeight: 0.72 },
      { from: 'forage', to: 'swim', trigger: 'foraging-window-complete', selectionWeight: 0.85 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.006, 0.032] },
    evidence: { kind: 'documented-behavior', summary: 'Forages around sand, rubble, and crevices with stop-start moves; courtship is excluded from this baseline profile.', sourceRefs: ['https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-marine-fish/how-to-look-after-dragonets-mandarin-fish/', 'https://aquarium.org/animals/mandarin-goby/'] },
  },
  'tailspot-blenny': {
    speciesId: 'tailspot-blenny', habitatMode: 'near-cover-search', preferredZone: 'lower-reef', depthRange: [0.48, 0.86],
    anchors: ['rockPerch', 'rockCrevice'],
    locomotion: { gait: 'near-rock-darts', speedTankWidthsPerSecond: [0.012, 0.055], turnDegreesPerSecond: [48, 112] },
    states: {
      idle: { cue: 'Perch close to a rock hole and make alert head turns.', durationSeconds: [2.4, 7], anchor: 'rockPerch', speedMultiplier: 0.1 },
      swim: { cue: 'Dart a short distance between nearby rock holds.', durationSeconds: [0.9, 2.8], anchor: 'rockPerch', speedMultiplier: 0.82 },
    },
    transitions: transitionsFor(),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.004, 0.024] },
    evidence: { kind: 'habitat-staging-inference', summary: 'Near-rock perching and brief darts are a staging choice based on small sheltered-reef form; the source describes shy, often solitary behavior.', sourceRefs: ['https://baliwildlife.com/encyclopedia/marine-life/ray-finned-fishes/blennies/tailspot-blenny-ecsenius-stigmatura/', 'https://nrm-fishbaselinux01.nrm.se/Ecology/Ecsenius_stigmatura'] },
  },
  'six-line-wrasse': {
    speciesId: 'six-line-wrasse', habitatMode: 'near-cover-search', preferredZone: 'reef-edge', depthRange: [0.35, 0.78],
    anchors: ['rockCrevice', 'branchingCoralShelter', 'foragingPatch'],
    locomotion: { gait: 'sinuous-cover-search', speedTankWidthsPerSecond: [0.032, 0.105], turnDegreesPerSecond: [70, 145] },
    states: {
      idle: { cue: 'Pause within coral cover and inspect a nearby crevice.', durationSeconds: [0.8, 2.8], anchor: 'rockCrevice', speedMultiplier: 0.18 },
      swim: { cue: 'Weave quickly between cover and nearby search points.', durationSeconds: [2.2, 5.7], anchor: 'branchingCoralShelter', speedMultiplier: 1 },
      forage: { cue: 'Inspect small prey opportunities around a crevice.', durationSeconds: [1.1, 3.5], anchor: 'foragingPatch', speedMultiplier: 0.48 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'forage', trigger: 'foraging-opportunity', selectionWeight: 0.55 },
      { from: 'forage', to: 'swim', trigger: 'foraging-window-complete', selectionWeight: 0.9 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.012, 0.055] },
    evidence: { kind: 'documented-behavior', summary: 'Secretive close-cover behavior and small-crustacean diet support the crevice-search profile; path speed and turns are visual tuning.', sourceRefs: ['https://reeflifesurvey.com/species/pseudocheilinus-hexataenia/', 'https://www.fishbase.se/summary/Pseudocheilinus-hexataenia'] },
  },
  'mccoskers-flasher-wrasse': {
    speciesId: 'mccoskers-flasher-wrasse', habitatMode: 'midwater-display', preferredZone: 'midwater', depthRange: [0.36, 0.74],
    anchors: ['reefSlopeRubble', 'schoolCenter'],
    locomotion: { gait: 'reef-slope-patrol', speedTankWidthsPerSecond: [0.038, 0.11], turnDegreesPerSecond: [56, 122] },
    states: {
      idle: { cue: 'Hold above reef-slope rubble between patrol passes.', durationSeconds: [1.4, 4.2], anchor: 'reefSlopeRubble', speedMultiplier: 0.18 },
      swim: { cue: 'Patrol in lively short passes over rubble.', durationSeconds: [2.8, 6.4], anchor: 'reefSlopeRubble', speedMultiplier: 1 },
      display: { cue: 'Make an occasional brief ascent with fins flared.', durationSeconds: [0.8, 2.2], anchor: 'reefSlopeRubble', speedMultiplier: 1.3 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'display', trigger: 'display-opportunity', selectionWeight: 0.12 },
      { from: 'display', to: 'swim', trigger: 'display-window-complete', selectionWeight: 1 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.018, 0.065] },
    evidence: { kind: 'documented-behavior', summary: 'Male fin-flashing displays and aggregations over reef-slope rubble are documented; display timing is scene pacing.', sourceRefs: ['https://www.mrc.gov.mv/assets/Uploads/fishes-of-the-maldives.pdf'] },
  },
  'lyretail-anthias': {
    speciesId: 'lyretail-anthias', habitatMode: 'schooling-over-reef', preferredZone: 'midwater', depthRange: [0.26, 0.66],
    anchors: ['coralOutcrop', 'schoolCenter', 'foragingPatch'],
    locomotion: { gait: 'loose-group-cruise', speedTankWidthsPerSecond: [0.035, 0.1], turnDegreesPerSecond: [48, 108] },
    states: {
      idle: { cue: 'Hold in a loose group near the home coral outcrop.', durationSeconds: [1.5, 4.4], anchor: 'coralOutcrop', speedMultiplier: 0.22 },
      swim: { cue: 'Make flowing short passes and return to the same vertical zone.', durationSeconds: [3, 7.2], anchor: 'schoolCenter', speedMultiplier: 0.95 },
      forage: { cue: 'Feed in brief midwater passes over the outcrop.', durationSeconds: [1.6, 4.5], anchor: 'foragingPatch', speedMultiplier: 0.7 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'forage', trigger: 'foraging-opportunity', selectionWeight: 0.48 },
      { from: 'forage', to: 'swim', trigger: 'foraging-window-complete', selectionWeight: 0.9 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.02, 0.078] },
    evidence: { kind: 'documented-behavior', summary: 'Group/harem living near a coral outcrop and zooplankton feeding inform the loose-group passes; spacing is per-fish visual tuning.', sourceRefs: ['https://aquarium.org/animals/lyretail-anthias/'] },
  },
  'flame-angelfish': {
    speciesId: 'flame-angelfish', habitatMode: 'sheltered-reef', preferredZone: 'reef-edge', depthRange: [0.4, 0.82],
    anchors: ['rockCrevice', 'grazingSurface'],
    locomotion: { gait: 'compact-reef-orbit', speedTankWidthsPerSecond: [0.024, 0.075], turnDegreesPerSecond: [42, 96] },
    states: {
      idle: { cue: 'Pause near shelter before resuming a compact loop.', durationSeconds: [1.2, 3.6], anchor: 'rockCrevice', speedMultiplier: 0.18 },
      swim: { cue: 'Make a confident compact loop tied to nearby shelter.', durationSeconds: [2.6, 6.1], anchor: 'rockCrevice', speedMultiplier: 0.95 },
      forage: { cue: 'Make brief grazing pecks at algae or detritus surfaces.', durationSeconds: [1.4, 4.1], anchor: 'grazingSurface', speedMultiplier: 0.42 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'forage', trigger: 'foraging-opportunity', selectionWeight: 0.44 },
      { from: 'forage', to: 'swim', trigger: 'foraging-window-complete', selectionWeight: 0.88 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.01, 0.043] },
    evidence: { kind: 'documented-behavior', summary: 'Secretive shelter-close behavior and benthic algae/detritus feeding support compact loops and grazing; turn and speed ranges are visual tuning.', sourceRefs: ['https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=2591'] },
  },
  'copperband-butterflyfish': {
    speciesId: 'copperband-butterflyfish', habitatMode: 'near-cover-search', preferredZone: 'reef-edge', depthRange: [0.4, 0.84],
    anchors: ['rockCrevice', 'foragingPatch'],
    locomotion: { gait: 'crevice-inspection', speedTankWidthsPerSecond: [0.022, 0.068], turnDegreesPerSecond: [30, 74] },
    states: {
      idle: { cue: 'Hold near structure before inspecting another crevice.', durationSeconds: [1.3, 4.2], anchor: 'rockCrevice', speedMultiplier: 0.16 },
      swim: { cue: 'Make a deliberate smooth patrol along reef structure.', durationSeconds: [3, 7.3], anchor: 'rockCrevice', speedMultiplier: 0.88 },
      forage: { cue: 'Angle the elongated snout into a crevice to inspect prey.', durationSeconds: [1.5, 4.2], anchor: 'foragingPatch', speedMultiplier: 0.32 },
    },
    transitions: transitionsFor([
      { from: 'swim', to: 'forage', trigger: 'foraging-opportunity', selectionWeight: 0.56 },
      { from: 'forage', to: 'swim', trigger: 'foraging-window-complete', selectionWeight: 0.9 },
    ]),
    individuality: { phaseOffsetRadians: [0, Math.PI * 2], homeOffsetTankWidths: [0.008, 0.04] },
    evidence: { kind: 'documented-behavior', summary: 'Solitary/paired crevice prey search with its long snout is documented; patrol cadence and turning values are scene tuning.', sourceRefs: ['https://dwazoo.com/animal/copperband-butterflyfish/', 'https://zoo.ch/en/conservation/animal-and-plant-encyclopedia/copperband-butterflyfish'] },
  },
} as const satisfies Record<SpeciesBehaviorId, SpeciesBehaviorProfile>

export const SPECIES_BEHAVIOR_PROFILES: DeepReadonly<Record<SpeciesBehaviorId, SpeciesBehaviorProfile>> = profiles

export type FishBehaviorSample = {
  cruiseSpeedTankWidthsPerSecond: number
  turnDegreesPerSecond: number
  phaseOffsetRadians: number
  homeOffsetTankWidths: number
}

export type ProfileValidation = { success: true } | { success: false; errors: string[] }

export function validateSpeciesBehaviorProfiles(value: unknown = SPECIES_BEHAVIOR_PROFILES): ProfileValidation {
  const parsed = z.record(z.string(), profileSchema).safeParse(value)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) }
  }

  const errors: string[] = []
  const record = parsed.data
  const expected = [...SPECIES_BEHAVIOR_IDS].sort()
  const actual = Object.keys(record).sort()
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
    errors.push('Profile keys must exactly match the 15 stable species IDs.')
  }

  const fullProfiles = new Set<string>()
  const forageAnchors: readonly HabitatAnchor[] = ['grazingSurface', 'foragingPatch']
  const refugeAnchors: readonly HabitatAnchor[] = ['hostAnemone', 'branchingCoralRefuge', 'rockCrevice', 'sandBurrowEntrance']
  for (const [key, profile] of Object.entries(record)) {
    if (key !== profile.speciesId) errors.push(`${key}: profile speciesId must match its stable-ID key.`)
    if (new Set(profile.anchors).size !== profile.anchors.length) errors.push(`${key}: habitat anchors must not contain duplicates.`)
    const states = profile.states as Record<BehaviorState, BehaviorStateConfig | undefined>
    for (const [stateName, state] of Object.entries(states)) {
      if (!state) continue
      if (state.anchor && !profile.anchors.includes(state.anchor)) errors.push(`${key}: ${stateName} references an incompatible habitat anchor.`)
      if (state.durationSeconds[0] >= state.durationSeconds[1]) errors.push(`${key}: ${stateName} duration range must increase.`)
    }
    if (profile.states.retreat && !profile.anchors.includes(profile.states.retreat.destination)) {
      errors.push(`${key}: retreat destination must be a compatible habitat anchor.`)
    }
    if (profile.states.retreat && !refugeAnchors.includes(profile.states.retreat.destination)) {
      errors.push(`${key}: retreat destination must be a typed refuge anchor.`)
    }
    if (profile.states.forage?.anchor && !forageAnchors.includes(profile.states.forage.anchor)) {
      errors.push(`${key}: forage state must target a grazing surface or foraging patch.`)
    }
    if (profile.habitatMode === 'host-associated' && !profile.anchors.includes('hostAnemone')) {
      errors.push(`${key}: host-associated profile must include a host anemone anchor.`)
    }
    if (profile.habitatMode === 'burrow-associated' && !profile.anchors.includes('sandBurrowEntrance')) {
      errors.push(`${key}: burrow-associated profile must include a sand-burrow entrance.`)
    }
    if (profile.habitatMode === 'schooling-over-reef' && !profile.anchors.includes('schoolCenter')) {
      errors.push(`${key}: schooling profile must include a school-center anchor.`)
    }
    if (!profile.states.forage && profile.transitions.some((transition) => transition.from === 'forage' || transition.to === 'forage')) {
      errors.push(`${key}: transitions reference an unsupported forage state.`)
    }
    if (!profile.states.retreat && profile.transitions.some((transition) => transition.from === 'retreat' || transition.to === 'retreat')) {
      errors.push(`${key}: transitions reference an unsupported retreat state.`)
    }
    if (!profile.states.display && profile.transitions.some((transition) => transition.from === 'display' || transition.to === 'display')) {
      errors.push(`${key}: transitions reference an unsupported display state.`)
    }
    if (!profile.states.burst && profile.transitions.some((transition) => transition.from === 'burst' || transition.to === 'burst')) {
      errors.push(`${key}: transitions reference an unsupported burst state.`)
    }
    for (const transition of profile.transitions) {
      const compatible =
        (transition.trigger === 'idle-window-complete' && transition.from === 'idle' && transition.to === 'swim') ||
        (transition.trigger === 'swim-segment-complete' && transition.from === 'swim' && transition.to === 'idle') ||
        (transition.trigger === 'foraging-opportunity' && transition.from === 'swim' && transition.to === 'forage') ||
        (transition.trigger === 'foraging-window-complete' && transition.from === 'forage' && transition.to === 'swim') ||
        (transition.trigger === 'threat-cue' && ['idle', 'swim'].includes(transition.from) && transition.to === 'retreat') ||
        (transition.trigger === 'refuge-reached' && transition.from === 'retreat' && transition.to === 'idle') ||
        (transition.trigger === 'display-opportunity' && transition.from === 'swim' && transition.to === 'display') ||
        (transition.trigger === 'display-window-complete' && transition.from === 'display' && transition.to === 'swim') ||
        (transition.trigger === 'high-effort-cue' && transition.from === 'swim' && transition.to === 'burst') ||
        (transition.trigger === 'effort-window-complete' && transition.from === 'burst' && transition.to === 'swim')
      if (!compatible) errors.push(`${key}: ${transition.trigger} is incompatible with ${transition.from} -> ${transition.to}.`)
    }
    // Identity and evidence describe the species record, not its behavior.
    // Exclude them so two species cannot pass merely by carrying different IDs.
    const behaviorContent = Object.fromEntries(
      Object.entries(profile).filter(([field]) => field !== 'speciesId' && field !== 'evidence'),
    )
    const signature = JSON.stringify(behaviorContent)
    if (fullProfiles.has(signature)) errors.push(`${key}: species profile must be distinct.`)
    fullProfiles.add(signature)
  }

  const catalogIds = REEF_FISH.map((fish) => fish.id).sort()
  if (catalogIds.length !== expected.length || catalogIds.some((id, index) => id !== expected[index])) {
    errors.push('Profile keys must match the reef fish catalog stable IDs.')
  }
  return errors.length ? { success: false, errors } : { success: true }
}

const validation = validateSpeciesBehaviorProfiles()
if (!validation.success) throw new Error(`Invalid reef fish behavior profiles: ${validation.errors.join('; ')}`)

export function getSpeciesBehaviorProfile(speciesId: string): DeepReadonly<SpeciesBehaviorProfile> | undefined {
  return SPECIES_BEHAVIOR_IDS.includes(speciesId as SpeciesBehaviorId)
    ? SPECIES_BEHAVIOR_PROFILES[speciesId as SpeciesBehaviorId]
    : undefined
}

function seededUnit(seed: number) {
  let value = seed >>> 0
  value += 0x6d2b79f5
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

function between(range: NumericRange, unit: number) {
  return range[0] + (range[1] - range[0]) * unit
}

/** Deterministic, per-instance visual variation; state timing remains AQ-44 runtime work. */
export function sampleFishBehavior(speciesId: string, instanceSeed: number): FishBehaviorSample {
  const profile = getSpeciesBehaviorProfile(speciesId)
  if (!profile) throw new RangeError(`No reef behavior profile exists for species ID: ${speciesId}`)
  if (!Number.isSafeInteger(instanceSeed) || instanceSeed < 0) throw new RangeError('Fish instance seed must be a non-negative safe integer.')

  return {
    cruiseSpeedTankWidthsPerSecond: between(profile.locomotion.speedTankWidthsPerSecond, seededUnit(instanceSeed ^ 0x16a09e66)),
    turnDegreesPerSecond: between(profile.locomotion.turnDegreesPerSecond, seededUnit(instanceSeed ^ 0xbb67ae85)),
    phaseOffsetRadians: between(profile.individuality.phaseOffsetRadians, seededUnit(instanceSeed ^ 0x3c6ef372)),
    homeOffsetTankWidths: between(profile.individuality.homeOffsetTankWidths, seededUnit(instanceSeed ^ 0xa54ff53a)),
  }
}
