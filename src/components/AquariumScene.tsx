import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ServiceConfig } from '../lib/services'
import { getFishById } from '../lib/fish'
import { FishFigure } from './FishFigure'

type FishMotion = { x: number; y: number; dx: number; dy: number; duration: number; delay: number; flip: number; width: number; imageHeight: number }

function makeMotion(count: number, sceneWidth: number, sceneHeight: number): FishMotion[] {
  if (!count || !sceneWidth || !sceneHeight) return []
  const narrow = sceneWidth < 600
  const xMin = Math.max(16, sceneWidth * 0.08)
  const xMax = sceneWidth * 0.92
  const yMin = Math.max(60, sceneHeight * 0.1)
  const yMax = sceneHeight * (narrow ? 0.64 : 0.68)
  const xSpan = xMax - xMin
  const ySpan = yMax - yMin
  const maxWidth = narrow ? Math.min(180, sceneWidth * 0.33) : Math.min(180, sceneWidth * 0.14)
  let chosen = { columns: count, width: 1, cellWidth: xSpan / count, cellHeight: ySpan, score: -1 }

  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns)
    const cellWidth = xSpan / columns
    const cellHeight = ySpan / rows
    const width = Math.min(maxWidth, cellWidth * 0.78)
    const imageHeight = width * (narrow ? 0.58 : 0.56)
    const anchorHeight = imageHeight + (narrow ? 34 : 26)
    if (anchorHeight > cellHeight) continue
    const score = width + (columns === 2 ? 10 : 0)
    if (score > chosen.score) chosen = { columns, width, cellWidth, cellHeight, score }
  }

  return Array.from({ length: count }, (_, index) => {
    const column = index % chosen.columns
    const row = Math.floor(index / chosen.columns)
    const imageHeight = chosen.width * (narrow ? 0.58 : 0.56)
    const anchorHeight = imageHeight + (narrow ? 34 : 26)
    const slackX = Math.max(0, (chosen.cellWidth - chosen.width) / 2 - 5)
    const slackY = Math.max(0, (chosen.cellHeight - anchorHeight) / 2 - 4)
    const jitterX = (Math.random() - 0.5) * Math.min(16, slackX)
    const jitterY = (Math.random() - 0.5) * Math.min(14, slackY)
    return {
      x: xMin + column * chosen.cellWidth + (chosen.cellWidth - chosen.width) / 2 + jitterX,
      y: yMin + row * chosen.cellHeight + (chosen.cellHeight - anchorHeight) / 2 + jitterY,
      dx: (Math.random() - 0.5) * 2 * Math.min(22, Math.max(0, slackX - Math.abs(jitterX))),
      dy: (Math.random() - 0.5) * 2 * Math.min(15, Math.max(0, slackY - Math.abs(jitterY))),
      duration: 24 + Math.random() * 22,
      delay: -Math.random() * 32,
      flip: Math.random() > 0.5 ? -1 : 1,
      width: chosen.width,
      imageHeight,
    }
  })
}

type AquariumSceneProps = { services: ServiceConfig[]; paused: boolean }

export function AquariumScene({ services, paused }: AquariumSceneProps) {
  const [motion, setMotion] = useState<FishMotion[]>([])
  const sceneRef = useRef<HTMLElement>(null)
  const serviceKeys = services.map((service) => service.id).join('|')

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const refresh = () => setMotion(makeMotion(services.length, scene.clientWidth, scene.clientHeight))
    refresh()
    const observer = new ResizeObserver(refresh)
    observer.observe(scene)
    return () => observer.disconnect()
  }, [services.length, serviceKeys])

  return (
    <section ref={sceneRef} className={`aquarium-scene${paused ? ' is-paused' : ''}`} aria-label="Aquarium with clickable service fish">
      <div className="fish-school">
        {services.map((service, index) => {
          const fish = getFishById(service.fishId)
          const placement = motion[index]
          if (!fish || !placement) return null
          const style = {
            left: `${placement.x}px`, top: `${placement.y}px`, width: `${placement.width}px`,
            '--fish-image-height': `${placement.imageHeight}px`,
            '--fish-label-size': placement.width < 70 ? '8px' : placement.width < 90 ? '9px' : '11px',
            '--swim-duration': `${placement.duration}s`, '--swim-delay': `${placement.delay}s`,
            '--swim-x': `${placement.dx}px`, '--swim-y': `${placement.dy}px`,
            '--fish-direction': placement.flip,
          } as CSSProperties
          return (
            <a
              key={service.id}
              className="swimming-fish"
              href={service.url}
              target="_blank"
              rel="noreferrer"
              style={style}
              aria-label={`Open ${service.name} in a new tab`}
              title={`${service.name} · ${fish.commonName}`}
            >
              <FishFigure fish={fish} />
              <span className="fish-name"><span>{service.name}</span>{service.isExample && <small>example</small>}</span>
            </a>
          )
        })}
      </div>
    </section>
  )
}
