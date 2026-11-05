import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DEFAULT_LEFT_ISLAND_MOUNTS,
  DEFAULT_RIGHT_ISLAND_MOUNTS,
  assembleCoralsOnRockSockets,
  inferSocketArchetype,
} from './reef-assembly'

function buildRockFixtureFromSocketReport(reportFile: string): THREE.Group {
  const report = JSON.parse(
    readFileSync(new URL(`../assets/corals/${reportFile}`, import.meta.url), 'utf8'),
  )
  const root = new THREE.Group()
  for (const socket of report.supportedSockets) {
    const node = new THREE.Object3D()
    node.name = socket.name
    node.position.set(socket.positionM[0], socket.positionM[1], socket.positionM[2])
    node.quaternion.set(socket.rotation[0], socket.rotation[1], socket.rotation[2], socket.rotation[3])
    root.add(node)
  }
  return root
}

function buildMockCoralTemplates(): Map<string, THREE.Object3D> {
  const templates = new Map<string, THREE.Object3D>()
  const coralSpecs: Array<[string, Array<[string, 'coral-soft' | 'coral-rigid']>]> = [
    ['coral-euphyllia-torch', [['euphyllia_polyp_crown', 'coral-soft'], ['euphyllia_skeleton', 'coral-rigid']]],
    ['coral-euphyllia-hammer', [['euphyllia_hammer_polyp_crown', 'coral-soft'], ['euphyllia_hammer_skeleton', 'coral-rigid']]],
    ['coral-anemone-bta', [['anemone_column_disc', 'coral-soft'], ['anemone_tentacle_crown', 'coral-soft']]],
    ['coral-acropora-table', [['acropora_table_colony', 'coral-rigid']]],
    ['coral-acropora-staghorn', [['acropora_staghorn_colony', 'coral-rigid']]],
    ['coral-montipora-plate', [['montipora_plate_colony', 'coral-rigid']]],
    ['coral-brain-diploria', [['diploria_brain_colony', 'coral-soft']]],
    ['coral-zoanthid-mat', [['zoanthid_button_cluster', 'coral-soft']]],
  ]

  for (const [id, primitives] of coralSpecs) {
    const group = new THREE.Group()
    group.name = id
    for (const [primId, role] of primitives) {
      const mesh = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshStandardMaterial({ vertexColors: true }),
      )
      mesh.name = primId
      mesh.userData = { reefPrimitive: { id: primId, role } }
      group.add(mesh)
    }
    templates.set(id, group)
  }
  return templates
}

describe('modular coral socket assembly on live-rock foundations (AQ-14.4)', () => {
  it('mounts all 12 left-island and 11 right-island sockets with verified archetypes and raw-mask material bindings', () => {
    const templates = buildMockCoralTemplates()
    const leftRock = buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json')
    const rightRock = buildRockFixtureFromSocketReport('live-rock-island-right-socket-report.json')

    const leftAssembly = assembleCoralsOnRockSockets(leftRock, templates, DEFAULT_LEFT_ISLAND_MOUNTS)
    const rightAssembly = assembleCoralsOnRockSockets(rightRock, templates, DEFAULT_RIGHT_ISLAND_MOUNTS)

    expect(leftAssembly.mountedCorals).toHaveLength(12)
    expect(rightAssembly.mountedCorals).toHaveLength(11)

    for (const mounted of [...leftAssembly.mountedCorals, ...rightAssembly.mountedCorals]) {
      expect(mounted.materialControllers.length).toBeGreaterThan(0)
      for (const ctrl of mounted.materialControllers) {
        expect(ctrl.material.vertexColors).toBe(false)
        expect(ctrl.material.transparent).toBe(false)
      }
    }

    // Verify pause / reduced-motion gating updates uMotionScale across all mounted soft colonies
    leftAssembly.update(3.2, true, false)
    for (const mounted of leftAssembly.mountedCorals) {
      for (const ctrl of mounted.materialControllers) {
        expect(ctrl.uniforms.uMotionScale.value).toBe(0)
      }
    }

    leftAssembly.update(3.2, false, false)
    const softControllers = leftAssembly.mountedCorals
      .flatMap(m => m.materialControllers)
      .filter(c => c.uniforms.uRoleIsSoft.value === 1)
    expect(softControllers.length).toBeGreaterThan(0)
    for (const ctrl of softControllers) {
      expect(ctrl.uniforms.uMotionScale.value).toBe(1)
    }
  })

  it('rejects mismatched socket archetypes', () => {
    const templates = buildMockCoralTemplates()
    const leftRock = buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json')
    expect(inferSocketArchetype('socket_sps_crest_01')).toBe('branching-sps')
    expect(() =>
      assembleCoralsOnRockSockets(leftRock, templates, [
        {
          socketName: 'socket_sps_crest_01',
          coralAssetId: 'coral-anemone-bta',
          archetype: 'host-anemone',
          yawRad: 0,
          scale: 1,
        },
      ]),
    ).toThrow(/archetype.*does not match/)
  })
})
