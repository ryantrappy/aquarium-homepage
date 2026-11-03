import { z } from 'zod'
import { REEF_FISH } from './fish'

export const serviceUrlSchema = z.string().trim().min(1).refine((value) => {
  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}, 'Enter a complete http:// or https:// address without a username or password.')

export const serviceConfigSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  url: serviceUrlSchema,
  fishId: z.string().refine((id) => REEF_FISH.some((fish) => fish.id === id), 'Choose a reef fish from the catalog.'),
  isExample: z.boolean().optional().default(false),
}).strict()

export const serviceListSchema = z.array(serviceConfigSchema).superRefine((services, context) => {
  const seen = new Set<string>()
  services.forEach((service, index) => {
    if (seen.has(service.id)) {
      context.addIssue({ code: 'custom', path: [index, 'id'], message: 'Service IDs must be unique.' })
    }
    seen.add(service.id)
  })
})

export const serviceDraftSchema = serviceConfigSchema.omit({ id: true, isExample: true })
