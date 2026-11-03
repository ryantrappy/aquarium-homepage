import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function SearchIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.3 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}

export function ServicesIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="7" cy="6.5" r="1" fill="currentColor"/><circle cx="7" cy="12" r="1" fill="currentColor"/><circle cx="7" cy="17.5" r="1" fill="currentColor"/></svg>
}

export function SettingsIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" stroke="currentColor" strokeWidth="1.7"/><path d="m19.5 13.9 1-1.9-1-1.9-2.1-.4a5.6 5.6 0 0 0-.7-1.2l.5-2-1.9-1.1-1.7 1.2a5.7 5.7 0 0 0-1.4-.1L10.7 5 8.8 6.1l.2 2.1a5.5 5.5 0 0 0-1 1l-2.1-.1-1 1.9 1.1 1.8a5.8 5.8 0 0 0 .1 1.4l-1.2 1.7 1.1 1.9 2.1-.2a5.5 5.5 0 0 0 1 .9l-.1 2.1 1.9 1 1.8-1.1a5.7 5.7 0 0 0 1.4-.1l1.7 1.2 1.9-1.1-.2-2.1a5.5 5.5 0 0 0 .9-1l2.1.1 1-1.9-1.1-1.8a5.8 5.8 0 0 0 .1-1.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" transform="translate(-2 -2) scale(1.08)"/></svg>
}

export function CloseIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}

export function PauseIcon({ paused, ...props }: IconProps & { paused: boolean }) {
  return paused ? <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m9 6 9 6-9 6V6Z" fill="currentColor"/></svg> : <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M8 6v12M16 6v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
}
