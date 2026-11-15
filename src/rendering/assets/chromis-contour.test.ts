import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '../../..')
const dir = path.join(root, 'src/rendering/assets/splat-fish')
const digest = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex')
function parse(file: string) {
  const b = fs.readFileSync(path.join(dir, file)), n = b.readUInt32LE(12)
  return { json: JSON.parse(b.subarray(20, 20 + n).toString('utf8')), bin: b.subarray(28 + n), bytes: b }
}
function accessor(model: ReturnType<typeof parse>, id: number) {
  const a = model.json.accessors[id], v = model.json.bufferViews[a.bufferView]
  const width = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[a.type]
  const size = ({ 5121: 1, 5123: 2, 5126: 4 } as Record<number, number>)[a.componentType]
  const start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0)
  return model.bin.subarray(start, start + a.count * width * size)
}
function indices(model: ReturnType<typeof parse>) {
  const p = model.json.meshes[0].primitives[0], data = accessor(model, p.indices)
  return Array.from({ length: data.length / 2 }, (_, i) => data.readUInt16LE(i * 2))
}

describe('chromis contour pipeline', () => {
  it('preserves material, textures, rig and animation while meeting the budget', () => {
    const base = parse('sources/blue-green-chromis-contour-base.glb'), result = parse('blue-green-chromis.glb')
    expect(result.json.materials).toEqual(base.json.materials)
    const images = (model: ReturnType<typeof parse>) => model.json.images.map((image: { bufferView: number }) => {
      const view = model.json.bufferViews[image.bufferView], start = view.byteOffset ?? 0
      return digest(model.bin.subarray(start, start + view.byteLength))
    })
    expect(images(result)).toEqual(images(base))
    expect(result.json.skins[0].joints).toEqual(base.json.skins[0].joints)
    expect(result.json.animations[0].channels).toEqual(base.json.animations[0].channels)
    expect(accessor(result, result.json.skins[0].inverseBindMatrices)).toEqual(accessor(base, base.json.skins[0].inverseBindMatrices))
    for (let i = 0; i < base.json.animations[0].samplers.length; i++) {
      for (const key of ['input', 'output']) {
        expect(accessor(result, result.json.animations[0].samplers[i][key])).toEqual(accessor(base, base.json.animations[0].samplers[i][key]))
      }
    }
    expect(indices(result).length / 3).toBe(24220)
    expect(indices(result).length / 3).toBeLessThanOrEqual(25000)
    expect(result.bytes.length).toBeLessThanOrEqual(4 * 1024 * 1024)
    const prim = result.json.meshes[0].primitives[0], positions = accessor(result, prim.attributes.POSITION)
    const point = (i: number) => [positions.readFloatLE(i * 12), positions.readFloatLE(i * 12 + 4), positions.readFloatLE(i * 12 + 8)]
    const triangles = indices(result)
    for (let i = 0; i < triangles.length; i += 3) {
      const [a, b, c] = triangles.slice(i, i + 3).map(point)
      const u = b.map((v, k) => v - a[k]), v = c.map((x, k) => x - a[k])
      expect(Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])).toBeGreaterThan(1e-11)
    }
  })
  it('fails without creating the missing immutable base or modifying outputs in dry-run', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'chromis-missing-base-'))
    const paths = [
      'public/fish/blue-green-chromis.webp',
      'src/rendering/assets/splat-fish/blue-green-chromis.glb',
      'src/rendering/assets/splat-fish/fish-blue-green-chromis-inspection.json',
      'src/rendering/assets/splat-fish/manifest.json',
    ]
    try {
      for (const name of paths) {
        const dest = path.join(temp, name)
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.copyFileSync(path.join(root, name), dest)
      }
      const before = paths.map(name => digest(fs.readFileSync(path.join(temp, name))))
      expect(() => execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/refine-chromis-contour.mjs', '--root', temp, '--dry-run'], { cwd: root, stdio: 'pipe' })).toThrow(/Missing immutable base GLB/)
      expect(fs.existsSync(path.join(temp, 'src/rendering/assets/splat-fish/sources'))).toBe(false)
      expect(paths.map(name => digest(fs.readFileSync(path.join(temp, name))))).toEqual(before)
      expect(fs.readdirSync(path.join(temp, 'src/rendering/assets/splat-fish')).sort()).toEqual(['blue-green-chromis.glb', 'fish-blue-green-chromis-inspection.json', 'manifest.json'])
    } finally {
      fs.rmSync(temp, { recursive: true, force: true })
    }
  })
  it('reproduces the original base and visually reviewed selected recipe without workspace writes', () => {
    const paths = ['blue-green-chromis.glb', 'fish-blue-green-chromis-inspection.json', 'manifest.json']
    const before = paths.map(file => digest(fs.readFileSync(path.join(dir, file))))
    const text = execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/refine-chromis-contour.mjs', '--dry-run'], { cwd: root, encoding: 'utf8' })
    const result = JSON.parse(text), glb = parse('blue-green-chromis.glb')
    expect(paths.map(file => digest(fs.readFileSync(path.join(dir, file))))).toEqual(before)
    expect(result.rawBaseSha256).toBe(digest(parse('sources/blue-green-chromis-contour-base.glb').bytes))
    expect(result.rawRecipeOutputSha256).toBe('3b59e775e6ad4dcb62974633097d7acbff31bbb8a3a60510305c1615717923b1')
    expect(result.outputSha256).toBe(digest(glb.bytes))
    expect(result.sourceInputs.grid).toEqual([139, 83])
    expect(result.triangles).toBe(24220)
    expect(result.texturesUnchanged).toBe(true)
  }, 30000)
})
