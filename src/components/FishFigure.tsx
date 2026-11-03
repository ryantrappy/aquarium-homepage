import type { ReefFish } from '../lib/fish'

type FishFigureProps = { fish: ReefFish; className?: string }

export function FishFigure({ fish, className = '' }: FishFigureProps) {
  return <img className={`fish-figure fish-${fish.id} ${className}`} src={`/fish/${fish.id}.webp`} alt="" draggable={false} />
}
