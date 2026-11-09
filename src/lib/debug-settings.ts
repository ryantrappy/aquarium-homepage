/** Local persistence for debug settings (AQ-83). The FPS counter is an
 * opt-in, client-only preference: it is stored in localStorage, never
 * synced to the shared service config. */

export const FPS_COUNTER_STORAGE_KEY = 'reef-control:debug-fps-counter'

/** The counter defaults to off. Anything that is not an explicit opt-in —
 * missing, corrupt, or unreadable storage — reads as off. */
export function readFpsCounterEnabled(): boolean {
  try {
    return window.localStorage.getItem(FPS_COUNTER_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeFpsCounterEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(FPS_COUNTER_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // Private-mode / disabled storage must not break the settings modal.
  }
}
