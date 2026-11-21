import { useMemo, useState } from 'react'
import { hasServiceUrl, type ServiceConfig } from '../lib/services'
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
      const linkText = hasServiceUrl(service) ? service.url : 'no link display fish'
      return `${service.name} ${linkText} ${fish?.commonName ?? ''}`.toLocaleLowerCase().includes(term)
    })
  }, [query, services])

  return (
    <nav className="service-dock" aria-label="Services">
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
            const linked = hasServiceUrl(service)
            if (!linked) {
              return <li key={service.id}><div className="service-link is-unlinked" aria-label={`${service.name} (${fish.commonName}, no link)`}>
                <span className={`dock-fish dock-${fish.id}`} aria-hidden="true"><img src={fish.thumbnail} alt="" /></span>
                <span className="service-text"><span className="service-name">{service.name}<small className="no-link-badge">no link</small>{service.isExample && <small>example</small>}</span><span className="service-species">{fish.commonName} · Display only</span></span>
                <span className="service-open is-unlinked" aria-hidden="true">—</span>
              </div></li>
            }
            return <li key={service.id}><a className="service-link" href={service.url} target="_blank" rel="noreferrer">
              <span className={`dock-fish dock-${fish.id}`} aria-hidden="true"><img src={fish.thumbnail} alt="" /></span>
              <span className="service-text"><span className="service-name">{service.name}{service.isExample && <small>example</small>}</span><span className="service-species">{fish.commonName}</span></span>
              <span className="service-open" aria-hidden="true">↗</span>
            </a></li>
          })}
        </ul>
      ) : <p className="empty-search">No services match “{query}”. Try another name.</p>}
      <p className="dock-footnote">Links open in a new tab.</p>
    </nav>
  )
}
