// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { FPS_COUNTER_STORAGE_KEY, readFpsCounterEnabled, writeFpsCounterEnabled } from './debug-settings'

afterEach(() => { window.localStorage.removeItem(FPS_COUNTER_STORAGE_KEY) })

describe('FPS counter debug setting (AQ-83 AC #1)', () => {
  it('defaults to off when nothing is stored', () => {
    expect(readFpsCounterEnabled()).toBe(false)
  })

  it('persists an enabled choice across reads', () => {
    writeFpsCounterEnabled(true)
    expect(window.localStorage.getItem(FPS_COUNTER_STORAGE_KEY)).toBe('1')
    expect(readFpsCounterEnabled()).toBe(true)
  })

  it('persists a disabled choice', () => {
    writeFpsCounterEnabled(true)
    writeFpsCounterEnabled(false)
    expect(window.localStorage.getItem(FPS_COUNTER_STORAGE_KEY)).toBe('0')
    expect(readFpsCounterEnabled()).toBe(false)
  })

  it('treats a corrupt stored value as off', () => {
    window.localStorage.setItem(FPS_COUNTER_STORAGE_KEY, 'yes')
    expect(readFpsCounterEnabled()).toBe(false)
  })

  it('reads as off and writes silently when storage throws', () => {
    const original = window.localStorage
    const throwing = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    }
    Object.defineProperty(window, 'localStorage', { configurable: true, value: throwing })
    try {
      expect(readFpsCounterEnabled()).toBe(false)
      expect(() => writeFpsCounterEnabled(true)).not.toThrow()
    } finally {
      Object.defineProperty(window, 'localStorage', { configurable: true, value: original })
    }
  })
})
