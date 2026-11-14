import { useEffect, useState } from 'react'
import {
  DEFAULT_CPU_TEMPERATURE_SENSOR_ID,
  DEFAULT_THERMOMETER_PLACEMENT,
  formatThermometerLcd,
  startCpuTemperaturePolling,
  type CpuTemperatureReading,
  type SegmentGlyph,
  type ThermometerPlacement,
} from '../lib/thermometer-settings'

type SegmentKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'

const SEGMENT_POLYGONS: Record<SegmentKey, string> = {
  a: '4.2,1.5 21.8,1.5 19.6,5.5 6.4,5.5',
  b: '22.6,2.5 25.0,4.9 24.4,20.6 22.0,22.0 19.8,19.6 20.3,6.2',
  c: '22.0,22.8 24.3,24.4 23.7,40.0 21.2,42.3 19.2,39.0 19.7,25.0',
  d: '5.6,39.0 18.6,39.0 20.6,43.0 3.4,43.0',
  e: '2.2,24.3 4.6,22.8 6.6,25.1 6.0,38.4 3.0,41.8 1.6,39.5',
  f: '3.1,4.8 5.4,2.5 7.5,6.2 6.9,19.5 4.6,21.9 2.3,20.3',
  g: '5.2,22.2 7.4,20.1 18.8,20.1 21.0,22.2 18.8,24.4 7.4,24.4',
}

const SEGMENT_KEYS: readonly SegmentKey[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
const UNIT_C_SEGMENTS = new Set<SegmentKey>(['a', 'd', 'e', 'f'])

const GLYPH_SEGMENTS: Record<SegmentGlyph, ReadonlySet<SegmentKey>> = {
  '0': new Set<SegmentKey>(['a', 'b', 'c', 'd', 'e', 'f']),
  '1': new Set<SegmentKey>(['b', 'c']),
  '2': new Set<SegmentKey>(['a', 'b', 'd', 'e', 'g']),
  '3': new Set<SegmentKey>(['a', 'b', 'c', 'd', 'g']),
  '4': new Set<SegmentKey>(['b', 'c', 'f', 'g']),
  '5': new Set<SegmentKey>(['a', 'c', 'd', 'f', 'g']),
  '6': new Set<SegmentKey>(['a', 'c', 'd', 'e', 'f', 'g']),
  '7': new Set<SegmentKey>(['a', 'b', 'c']),
  '8': new Set<SegmentKey>(['a', 'b', 'c', 'd', 'e', 'f', 'g']),
  '9': new Set<SegmentKey>(['a', 'b', 'c', 'd', 'f', 'g']),
  '-': new Set<SegmentKey>(['g']),
  ' ': new Set<SegmentKey>(),
}

const DIGIT_X_OFFSETS: readonly [number, number, number] = [9, 40, 77]

export type AquariumThermometerProps = {
  placement?: ThermometerPlacement
  sensorId?: string
  reading?: CpuTemperatureReading
  pollWhenUncontrolled?: boolean
}

function SevenSegmentDigit({
  glyph,
  x,
}: {
  glyph: SegmentGlyph
  x: number
}) {
  const active = GLYPH_SEGMENTS[glyph]
  return (
    <g transform={`translate(${x}, 2) skewX(-8)`}>
      {SEGMENT_KEYS.map((seg) => (
        <polygon
          key={seg}
          points={SEGMENT_POLYGONS[seg]}
          className={active.has(seg) ? 'lcd-segment is-lit' : 'lcd-segment is-ghost'}
        />
      ))}
    </g>
  )
}

export function AquariumThermometer({
  placement = DEFAULT_THERMOMETER_PLACEMENT,
  sensorId = DEFAULT_CPU_TEMPERATURE_SENSOR_ID,
  reading: controlledReading,
  pollWhenUncontrolled = false,
}: AquariumThermometerProps) {
  const [polledReading, setPolledReading] = useState<CpuTemperatureReading | undefined>(undefined)

  useEffect(() => {
    if (controlledReading !== undefined || !pollWhenUncontrolled || placement === 'hidden') {
      return
    }
    return startCpuTemperaturePolling({
      sensorId,
      onTelemetry: (telemetry) => setPolledReading(telemetry.reading),
    })
  }, [controlledReading, placement, pollWhenUncontrolled, sensorId])

  if (placement === 'hidden') {
    return null
  }

  const effectiveReading = controlledReading ?? polledReading
  const lcd = formatThermometerLcd(effectiveReading, sensorId)

  return (
    <section
      className={`aquarium-thermometer aquarium-thermometer--${placement} is-${lcd.status}`}
      data-placement={placement}
      data-status={lcd.status}
      aria-label="Aquarium CPU thermometer"
    >
      <span className="sr-only">{lcd.ariaText}</span>

      <div className="thermometer-acrylic-shell" aria-hidden="true">
        <div className="thermometer-top-latch">
          <span className="thermometer-latch-notch" />
          <span className="thermometer-latch-notch" />
        </div>

        <div className="thermometer-inner-tray">
          <div className="thermometer-lcd-pane">
            <svg
              className="thermometer-lcd-svg"
              viewBox="0 0 128 48"
              focusable="false"
            >
              {lcd.cells.map((glyph, index) => (
                <SevenSegmentDigit
                  key={index}
                  glyph={glyph}
                  x={DIGIT_X_OFFSETS[index as 0 | 1 | 2]}
                />
              ))}

              <circle
                cx="65.5"
                cy="41.5"
                r="2.7"
                className={lcd.showDecimal ? 'lcd-segment is-lit' : 'lcd-segment is-ghost'}
              />

              <circle
                cx="107.2"
                cy="12.2"
                r="2.9"
                className="lcd-degree-ring is-lit"
              />

              <g transform="translate(111, 15.5) skewX(-8) scale(0.64)">
                {SEGMENT_KEYS.map((seg) => (
                  <polygon
                    key={seg}
                    points={SEGMENT_POLYGONS[seg]}
                    className={
                      UNIT_C_SEGMENTS.has(seg) ? 'lcd-segment is-lit' : 'lcd-segment is-ghost'
                    }
                  />
                ))}
              </g>
            </svg>

            <div className="thermometer-lcd-footer">
              <span className="thermometer-sensor-tag">{lcd.sensorText}</span>
              {lcd.status !== 'fresh' && (
                <span className={`thermometer-status-annunciator is-${lcd.status}`}>
                  {lcd.statusText}
                </span>
              )}
            </div>
          </div>

          <div className="thermometer-gasket-seam" />

          <div className="thermometer-metal-block">
            <span className="thermometer-metal-sheen" />
          </div>
        </div>
      </div>
    </section>
  )
}
