export type ReefFish = {
  id: string
  commonName: string
  scientificName: string
  habitat: string
}

export const REEF_FISH: ReefFish[] = [
  {
    id: 'ocellaris-clownfish',
    commonName: 'Ocellaris clownfish',
    scientificName: 'Amphiprion ocellaris',
    habitat: 'Sheltered lagoons and outer reef slopes of the Indo-Pacific.',
  },
  {
    id: 'yellow-tang',
    commonName: 'Yellow tang',
    scientificName: 'Zebrasoma flavescens',
    habitat: 'Shallow coral reefs and rocky shorelines across the central Pacific.',
  },
  {
    id: 'royal-gramma',
    commonName: 'Royal gramma',
    scientificName: 'Gramma loreto',
    habitat: 'Caves and crevices on Caribbean coral reefs.',
  },
  {
    id: 'blue-tang',
    commonName: 'Blue tang',
    scientificName: 'Paracanthurus hepatus',
    habitat: 'Clear outer reef slopes and drop-offs of the Indo-Pacific.',
  },
  {
    id: 'banggai-cardinalfish',
    commonName: 'Banggai cardinalfish',
    scientificName: 'Pterapogon kauderni',
    habitat: 'Sheltered shallow reefs and seagrass beds around Indonesia’s Banggai Islands.',
  },
]

export function getFishById(id: string) {
  return REEF_FISH.find((fish) => fish.id === id)
}
