export type ReefFish = {
  id: string
  commonName: string
  scientificName: string
  habitat: string
  thumbnail: string
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
]

export function getFishById(id: string) {
  return REEF_FISH.find((fish) => fish.id === id)
}
