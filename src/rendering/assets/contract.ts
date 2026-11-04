import { z } from 'zod'

const finite = z.number().finite()
const positive = finite.positive()
const vector = z.tuple([finite, finite, finite])
const quaternion = z.tuple([finite, finite, finite, finite])
const bounds = z.object({ min: vector, max: vector }).strict()
const identifier = z.string().regex(/^[a-z][a-z0-9_-]*$/)
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const provenance = z.object({
  license: z.enum(['CC0', 'CC-BY-4.0', 'original']),
  creator: z.string().min(1), sourceUrl: z.url().optional(), sourceSha256: sha256,
  recipe: z.string().min(1), attribution: z.string().min(1),
}).strict().superRefine((value, context) => {
  if (value.license !== 'original' && !value.sourceUrl) context.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'Imported assets require the exact licensed source URL' })
})

export const coralArchetypes = ['branching-sps', 'plating-sps', 'tentaculate-lps', 'mounded-lps', 'host-anemone', 'zoanthid-mat'] as const
const socketClasses = {
  sps_crest: 'branching-sps', plate_ledge: 'plating-sps', lps_mid: 'tentaculate-lps',
  brain_apron: 'mounded-lps', anemone_crevice: 'host-anemone', soft_mat: 'zoanthid-mat',
} as const
const evidence = z.object({
  method: z.enum(['surface-probes-v1', 'closed-mesh-proxies-v1']),
  geometrySha256: sha256, report: z.string().min(1),
}).strict()

const primitive = z.object({
  id: identifier, role: z.enum(['rock', 'coral-rigid', 'coral-soft', 'fish']),
  vertexCount: z.number().int().positive(), boundsM: bounds,
  material: z.object({
    vertexColors: z.literal(false), vertexAlpha: z.literal(false),
    aoSource: z.enum(['none', 'texture', 'coral-mask-a']),
  }).strict(),
  maskSchema: z.literal('coral-raw-masks-v1').optional(),
  color0: z.object({ itemSize: z.literal(4), values: z.array(finite.min(0).max(1)) }).strict().optional(),
}).strict()

const socket = z.object({
  name: z.string().regex(/^socket_[a-z_]+_\d{2}$/),
  role: z.literal('coral-mount'), parentMesh: identifier,
  archetype: z.enum(coralArchetypes), positionM: vector, normal: vector, rotation: quaternion,
  footprintRadiusM: positive, clearanceRadiusM: positive,
  support: z.object({
    pointM: vector, normal: vector, supportedRadiusM: positive, freeRadiusM: positive,
    evidence,
  }).strict(),
}).strict()

/** Offline inspection data, not a GPU loader and not a proof of visual quality. */
export const assetInspectionSchema = z.object({
  extras: z.object({ reefAsset: z.object({
    schema: z.literal('reef-asset-v1'), id: identifier,
    kind: z.enum(['rock', 'coral', 'fish']), units: z.literal('meter'),
    upAxis: z.literal('+Y'), origin: z.literal('local'), dimensionsM: z.tuple([positive, positive, positive]),
    maskSchema: z.literal('coral-raw-masks-v1').optional(),
    provenance,
  }).strict() }).strict(),
  rootTransform: z.object({ translation: vector, rotation: quaternion, scale: vector }).strict(),
  boundsM: bounds, primitives: z.array(primitive).min(1), sockets: z.array(socket),
  collisionParts: z.array(z.object({
    id: identifier, sourceMesh: identifier, boundsM: bounds, evidence,
  }).strict()).max(32),
}).strict()

export type AssetInspection = z.infer<typeof assetInspectionSchema>
export type AssetMetadata = AssetInspection['extras']['reefAsset']
export type CoralSocket = AssetInspection['sockets'][number]
export type AssetPrimitive = AssetInspection['primitives'][number]
export type ContractIssue = { path: string; message: string }
export type ContractResult = { valid: true; value: AssetInspection } | { valid: false; issues: ContractIssue[] }

const epsilon = 1e-5
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((v, i) => v - b[i]))
const unit = (v: readonly number[]) => Math.abs(Math.hypot(...v) - 1) <= epsilon
const contains = (b: z.infer<typeof bounds>, p: readonly number[]) => p.every((v, i) => v >= b.min[i] - epsilon && v <= b.max[i] + epsilon)

/** Validates declared metadata and measured arrays. Geometry/probe reports must
 * separately establish real support, cave clearance and conservative proxies. */
export function validateAssetContract(input: unknown): ContractResult {
  const parsed = assetInspectionSchema.safeParse(input)
  if (!parsed.success) return { valid: false, issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) }
  const value = parsed.data, issues: ContractIssue[] = []
  const issue = (path: string, message: string) => issues.push({ path, message })
  const checkBounds = (b: z.infer<typeof bounds>, path: string) => {
    if (b.max.some((v, i) => v <= b.min[i])) issue(path, 'Bounds must have positive extent on every axis')
  }
  const meta = value.extras.reefAsset, transform = value.rootTransform
  if ((meta.kind === 'coral') !== Boolean(meta.maskSchema)) issue('extras.reefAsset.maskSchema', 'Only coral assets declare coral-raw-masks-v1; every coral asset must declare it')
  if (distance(transform.translation, [0, 0, 0]) > epsilon) issue('rootTransform.translation', 'Apply root translation; placement belongs to the assembly')
  if (distance(transform.scale, [1, 1, 1]) > epsilon) issue('rootTransform.scale', 'Apply scale; canonical meter assets use identity root scale')
  if (distance(transform.rotation.slice(0, 3), [0, 0, 0]) > epsilon || Math.abs(Math.abs(transform.rotation[3]) - 1) > epsilon) issue('rootTransform.rotation', 'Export Y-up once and apply root rotation')
  checkBounds(value.boundsM, 'boundsM')
  meta.dimensionsM.forEach((dimension, axis) => {
    const measured = value.boundsM.max[axis] - value.boundsM.min[axis]
    if (Math.abs(dimension - measured) > Math.max(epsilon, measured * 1e-4)) issue(`extras.reefAsset.dimensionsM.${axis}`, 'Declared dimensions do not match measured meter bounds')
  })
  const ids = new Set<string>()
  value.primitives.forEach((part, index) => {
    const path = `primitives.${index}`
    if (ids.has(part.id)) issue(`${path}.id`, 'Duplicate primitive id')
    ids.add(part.id)
    checkBounds(part.boundsM, `${path}.boundsM`)
    if (!contains(value.boundsM, part.boundsM.min) || !contains(value.boundsM, part.boundsM.max)) issue(`${path}.boundsM`, 'Primitive lies outside measured asset bounds')
    const coral = part.role.startsWith('coral-')
    if ((meta.kind === 'coral') !== coral || (meta.kind === 'rock' && part.role !== 'rock') || (meta.kind === 'fish' && part.role !== 'fish')) issue(`${path}.role`, 'Primitive role does not match asset kind')
    if (coral) {
      if (!part.maskSchema || !part.color0) issue(path, 'Coral requires COLOR_0 and coral-raw-masks-v1 metadata')
      if (part.material.aoSource !== 'coral-mask-a') issue(`${path}.material.aoSource`, 'Coral contact AO uses raw mask A, never opacity')
      if (part.color0) {
        if (part.color0.values.length !== part.vertexCount * 4) issue(`${path}.color0.values`, 'RGBA mask count must match vertex count')
        if (part.role === 'coral-rigid' && part.color0.values.some((v, i) => i % 4 === 0 && v !== 0)) issue(`${path}.color0.values`, 'Calcified rigid geometry must have flexibility R = 0')
      }
    } else if (part.maskSchema || part.color0 || part.material.aoSource === 'coral-mask-a') issue(path, 'Coral raw masks cannot be reused as rock/fish display color or AO')
  })
  const names = new Set<string>()
  value.sockets.forEach((mount, index) => {
    const path = `sockets.${index}`
    if (meta.kind !== 'rock') issue(path, 'Only rock foundations expose coral mount sockets in v1')
    if (names.has(mount.name)) issue(`${path}.name`, 'Duplicate socket name')
    names.add(mount.name)
    const parent = value.primitives.find(part => part.id === mount.parentMesh)
    if (!parent || parent.role !== 'rock') issue(`${path}.parentMesh`, 'Socket must reference an actual rock primitive')
    else if (!contains(parent.boundsM, mount.positionM) || !contains(parent.boundsM, mount.support.pointM)) issue(`${path}.parentMesh`, 'Mount/support lies outside its referenced rock primitive')
    const category = Object.entries(socketClasses).find(([prefix]) => new RegExp(`^socket_${prefix}_\\d{2}$`).test(mount.name))
    if (!category || category[1] !== mount.archetype) issue(`${path}.archetype`, 'Socket name class and allowed coral archetype do not match')
    if (!contains(value.boundsM, mount.positionM)) issue(`${path}.positionM`, 'Mount must lie on the foundation, not at an invented scene location')
    if (!unit(mount.normal) || !unit(mount.support.normal) || !unit(mount.rotation)) issue(path, 'Socket/support normals and orientation quaternion must be unit length')
    const [x, y, z, w] = mount.rotation
    const up = [2 * (x*y-z*w), 1-2*(x*x+z*z), 2*(y*z+x*w)]
    if (distance(up, mount.normal) > .002 || distance(mount.normal, mount.support.normal) > .002) issue(path, 'Socket local +Y must match the measured support normal')
    if (distance(mount.positionM, mount.support.pointM) > .002) issue(`${path}.support.pointM`, 'Mount origin must be within 2 mm of measured support')
    if (mount.support.supportedRadiusM < mount.footprintRadiusM || mount.support.freeRadiusM < mount.clearanceRadiusM) issue(`${path}.support`, 'Support footprint or clearance is smaller than requested mount')
    if (mount.support.evidence.method !== 'surface-probes-v1') issue(`${path}.support.evidence.method`, 'Mount needs a surface-probe report')
  })
  const collisionIds = new Set<string>()
  value.collisionParts.forEach((part, index) => {
    const path = `collisionParts.${index}`
    if (collisionIds.has(part.id)) issue(`${path}.id`, 'Duplicate collision part id')
    collisionIds.add(part.id)
    if (!ids.has(part.sourceMesh)) issue(`${path}.sourceMesh`, 'Collision part references unknown source geometry')
    checkBounds(part.boundsM, `${path}.boundsM`)
    if (!contains(value.boundsM, part.boundsM.min) || !contains(value.boundsM, part.boundsM.max)) issue(`${path}.boundsM`, 'Proxy lies outside the measured asset envelope')
    if (part.evidence.method !== 'closed-mesh-proxies-v1') issue(`${path}.evidence.method`, 'Collision parts need a closed-mesh proxy review report')
  })
  return issues.length ? { valid: false, issues } : { valid: true, value }
}
