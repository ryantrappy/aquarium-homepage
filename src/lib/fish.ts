export type ReefFish = {
  id: string
  commonName: string
  scientificName: string
  habitat: string
  thumbnail: string
  /** Species with one authored fixed residence can serve only one service. */
  uniqueService?: boolean
}

export const SNOWFLAKE_MORAY_EEL_ID = 'snowflake-moray-eel'

export const INVERTEBRATE_SPECIES_IDS = [
  'banded-trochus-snail',
  'scarlet-reef-hermit-crab',
  'emerald-mithrax-crab',
  'scarlet-skunk-cleaner-shrimp',
] as const

export type InvertebrateSpeciesId = typeof INVERTEBRATE_SPECIES_IDS[number]

const INVERTEBRATE_SPECIES_SET: ReadonlySet<string> = new Set(INVERTEBRATE_SPECIES_IDS)

/** Returns true when `id` identifies a substrate clean-up-crew invertebrate species (`AQ-109`). */
export function isInvertebrateSpecies(id: string): id is InvertebrateSpeciesId {
  return INVERTEBRATE_SPECIES_SET.has(id)
}

export const REEF_FISH: ReefFish[] = [
  {
    id: 'ocellaris-clownfish',
    commonName: 'Ocellaris clownfish',
    scientificName: 'Amphiprion ocellaris',
    habitat: 'Sheltered Indo-West Pacific lagoons and reef slopes, among host anemones.',
    thumbnail: '/fish/ocellaris-clownfish.webp',
  },
  {
    id: 'yellow-tang',
    commonName: 'Yellow tang',
    scientificName: 'Zebrasoma flavescens',
    habitat: 'Shallow inshore coral reefs and protected central Pacific bays.',
    thumbnail: '/fish/yellow-tang.webp',
  },
  {
    id: 'royal-gramma',
    commonName: 'Royal gramma',
    scientificName: 'Gramma loreto',
    habitat: 'Caribbean reefs, close to caves and ledges.',
    thumbnail: '/fish/royal-gramma.webp',
  },
  {
    id: 'blue-tang',
    commonName: 'Blue tang',
    scientificName: 'Paracanthurus hepatus',
    habitat: 'Clear outer reef terraces and slopes of the Indo-Pacific.',
    thumbnail: '/fish/blue-tang.webp',
  },
  {
    id: 'banggai-cardinalfish',
    commonName: 'Banggai cardinalfish',
    scientificName: 'Pterapogon kauderni',
    habitat: 'Sheltered shallow reef and seagrass edges around Indonesia’s Banggai Islands.',
    thumbnail: '/fish/banggai-cardinalfish.webp',
  },
  {
    id: 'blue-green-chromis',
    commonName: 'Blue-green chromis',
    scientificName: 'Chromis viridis',
    habitat: 'Above branching Acropora coral in lagoons and reef flats.',
    thumbnail: '/fish/blue-green-chromis.webp',
  },
  {
    id: 'firefish',
    commonName: 'Firefish',
    scientificName: 'Nemateleotris magnifica',
    habitat: 'Reef slopes above sandy burrows.',
    thumbnail: '/fish/firefish.webp',
  },
  {
    id: 'yellow-watchman-goby',
    commonName: 'Yellow watchman goby',
    scientificName: 'Cryptocentrus cinctus',
    habitat: 'Sandy reef floor at the entrance to a shared burrow.',
    thumbnail: '/fish/yellow-watchman-goby.webp',
  },
  {
    id: 'mandarin-dragonet',
    commonName: 'Mandarin dragonet',
    scientificName: 'Synchiropus splendidus',
    habitat: 'Shallow coral reefs among sand, rubble, and rock crevices.',
    thumbnail: '/fish/mandarin-dragonet.webp',
  },
  {
    id: 'tailspot-blenny',
    commonName: 'Tailspot blenny',
    scientificName: 'Ecsenius stigmatura',
    habitat: 'Coral-rich lagoons and outer reefs close to rock holes.',
    thumbnail: '/fish/tailspot-blenny.webp',
  },
  {
    id: 'six-line-wrasse',
    commonName: 'Six-line wrasse',
    scientificName: 'Pseudocheilinus hexataenia',
    habitat: 'Shallow coral branches and crevices close to cover.',
    thumbnail: '/fish/six-line-wrasse.webp',
  },
  {
    id: 'mccoskers-flasher-wrasse',
    commonName: 'McCosker’s flasher wrasse',
    scientificName: 'Paracheilinus mccoskeri',
    habitat: 'Open water just above reef-slope rubble and coral.',
    thumbnail: '/fish/mccoskers-flasher-wrasse.webp',
  },
  {
    id: 'lyretail-anthias',
    commonName: 'Lyretail anthias',
    scientificName: 'Pseudanthias squamipinnis',
    habitat: 'Water above coral outcrops on lagoons and outer reef slopes.',
    thumbnail: '/fish/lyretail-anthias.webp',
  },
  {
    id: 'flame-angelfish',
    commonName: 'Flame angelfish',
    scientificName: 'Centropyge loricula',
    habitat: 'Sheltered coral areas with nearby reef structure.',
    thumbnail: '/fish/flame-angelfish.webp',
  },
  {
    id: 'copperband-butterflyfish',
    commonName: 'Copperband butterflyfish',
    scientificName: 'Chelmon rostratus',
    habitat: 'Rocky shores, sheltered reefs, and sandy inner-reef areas.',
    thumbnail: '/fish/copperband-butterflyfish.webp',
  },
  {
    id: 'desjardins-sailfin-tang',
    commonName: 'Desjardins’ sailfin tang',
    scientificName: 'Zebrasoma desjardinii',
    habitat: 'Reef slopes and lagoons of the Indo-Pacific, grazing algae over rock and coral.',
    thumbnail: '/fish/desjardins-sailfin-tang.webp',
  },
  {
    id: SNOWFLAKE_MORAY_EEL_ID,
    commonName: 'Snowflake moray eel',
    scientificName: 'Echidna nebulosa',
    habitat: 'Solitary reef-dweller that shelters among rock and coral crevices.',
    thumbnail: '/fish/snowflake-moray-eel.webp',
    uniqueService: true,
  },
  {
    id: 'banded-trochus-snail',
    commonName: 'Banded trochus snail',
    scientificName: 'Trochus histrio',
    habitat: 'Algae-grazing reef snail gliding over live rock and aragonite sand.',
    thumbnail: '/fish/banded-trochus-snail.webp',
  },
  {
    id: 'scarlet-reef-hermit-crab',
    commonName: 'Scarlet reef hermit crab',
    scientificName: 'Paguristes cadenati',
    habitat: 'Reef hermit crab scavenging detritus and algae across sand and rubble.',
    thumbnail: '/fish/scarlet-reef-hermit-crab.webp',
  },
  {
    id: 'emerald-mithrax-crab',
    commonName: 'Emerald mithrax crab',
    scientificName: 'Mithraculus sculptus',
    habitat: 'Herbivorous reef clinging crab foraging along live rock ledges and sand edges.',
    thumbnail: '/fish/emerald-mithrax-crab.webp',
  },
  {
    id: 'scarlet-skunk-cleaner-shrimp',
    commonName: 'Scarlet skunk cleaner shrimp',
    scientificName: 'Lysmata amboinensis',
    habitat: 'Cleaner shrimp perched near reef crevices and sandy overhangs.',
    thumbnail: '/fish/scarlet-skunk-cleaner-shrimp.webp',
  },
]

export function getFishById(id: string) {
  return REEF_FISH.find((fish) => fish.id === id)
}
