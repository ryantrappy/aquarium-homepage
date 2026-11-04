import { useMemo, useState } from 'react'
import type { ServiceConfig } from '../lib/services'
import { getFishById } from '../lib/fish'
import { SearchIcon } from './Icons'

type ServiceDockProps = { services: ServiceConfig[] }

export function ServiceDock({ services }: ServiceDockProps) {
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return services
    return services.filter((service) => {
      const fish = getFishById(service.fishId)
      return `${service.name} ${service.url} ${fish?.commonName ?? ''}`.toLocaleLowerCase().includes(term)
    })
  }, [query, services])

  return (
    <nav className="service-dock" aria-label="Homelab services">
      <label className="search-field">
        <SearchIcon className="search-icon" />
        <span className="sr-only">Search services</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a service" />
        {query && <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
      </label>
      {matches.length ? (
        <ul className="service-list">
          {matches.map((service) => {
            const fish = getFishById(service.fishId)
            if (!fish) return null
            return <li key={service.id}><a className="service-link" href={service.url} target="_blank" rel="noreferrer">
              <span className={`dock-fish dock-${fish.id}`} aria-hidden="true"><img src={fish.thumbnail} alt="" /></span>
              <span className="service-text"><span className="service-name">{service.name}{service.isExample && <small>example</small>}</span><span className="service-species">{fish.commonName}</span></span>
              <span className="service-open" aria-hidden="true">↗</span>
            </a></li>
          })}
        </ul>
      ) : <p className="empty-search">No services match “{query}”. Try another name.</p>}
      <p className="dock-footnote">Links open on <span>trappserv.er</span> or wherever you point them.</p>
    </nav>
  )
}
