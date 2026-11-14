import * as THREE from 'three'
import { glassEnclosureLayout } from './glass-enclosure'
import { SUN_DIRECTION } from './underwater-optics'
import { SURFACE_WAVE_GLSL } from './surface-waves'

const WATER_SURFACE_WIDTH_SEGMENTS = 96
const WATER_SURFACE_DEPTH_SEGMENTS = 48

type WaterSurfaceLayout = ReturnType<typeof glassEnclosureLayout>

type WaterSurfaceUniforms = {
  uTime: { value: number }
  uSunDir: { value: THREE.Vector3 }
  uFrontZ: { value: number }
  uBackZ: { value: number }
  uHalfWidth: { value: number }
}

function geometryFor(layout: WaterSurfaceLayout): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(
    layout.halfWidth * 2,
    layout.frontZ - layout.backZ,
    WATER_SURFACE_WIDTH_SEGMENTS,
    WATER_SURFACE_DEPTH_SEGMENTS,
  )
}

export function createWaterSurface(initialLayout: WaterSurfaceLayout) {
  const uniforms: WaterSurfaceUniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(SUN_DIRECTION.x, SUN_DIRECTION.y, SUN_DIRECTION.z) },
    uFrontZ: { value: initialLayout.frontZ },
    uBackZ: { value: initialLayout.backZ },
    uHalfWidth: { value: initialLayout.halfWidth },
  }
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uFrontZ;
      varying vec3 vSurfaceWorldPos;
      ${SURFACE_WAVE_GLSL}
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        float frontCalm = 1.0 - smoothstep(uFrontZ - 0.64, uFrontZ, worldPos.z);
        vec3 displaced = position;
        // Local -z maps to world +y on this horizontal underside-facing plane.
        displaced.z -= surfaceWaveHeight(worldPos.xz, uTime) * 1.15 * frontCalm;
        vec4 displacedWorldPos = modelMatrix * vec4(displaced, 1.0);
        vSurfaceWorldPos = displacedWorldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * displacedWorldPos;
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform float uFrontZ;
      uniform float uBackZ;
      uniform float uHalfWidth;
      varying vec3 vSurfaceWorldPos;
      ${SURFACE_WAVE_GLSL}

      // Continuous, smooth return-pump capillary waves; no cellular dots or stripes.
      vec2 capillarySlope(vec2 p, float t) {
        vec2 uv1 = p * vec2(1.35, 1.85) + vec2(t * 0.42, -t * 0.31);
        vec2 uv2 = p * vec2(2.40, 3.10) + vec2(-t * 0.55, t * 0.48);
        vec2 uv3 = p * vec2(0.75, 1.10) + vec2(t * 0.22, t * 0.29);

        vec2 s1 = vec2(
          cos(uv1.x + 0.65 * sin(uv1.y)),
          cos(uv1.y + 0.65 * sin(uv1.x))
        ) * 0.06;
        vec2 s2 = vec2(
          sin(uv2.x - 0.55 * cos(uv2.y)),
          cos(uv2.y + 0.55 * sin(uv2.x))
        ) * 0.03;
        vec2 s3 = vec2(
          cos(uv3.x + uv3.y * 0.5),
          sin(uv3.y - uv3.x * 0.5)
        ) * 0.045;

        return s1 + s2 + s3;
      }

      void main() {
        vec2 p = vSurfaceWorldPos.xz;
        float distToCam = length(cameraPosition - vSurfaceWorldPos);

        // Boost canonical macro slopes and filter capillary detail before it aliases at distance.
        float detailFade = 1.0 - smoothstep(5.5, 15.5, distToCam);
        vec2 macroSlope = surfaceWaveSlope(p, uTime) * 2.6 * mix(0.28, 1.0, detailFade);
        vec2 ripSlope = capillarySlope(p, uTime) * detailFade;
        vec2 totalSlope = macroSlope + ripSlope;

        // The underside normal points down into the aquarium water column.
        vec3 N = normalize(vec3(totalSlope.x, -1.0, totalSlope.y));
        vec3 V = normalize(cameraPosition - vSurfaceWorldPos);
        float NoV = clamp(dot(N, V), 0.0, 1.0);

        // A softened transition centered around the underwater critical-angle cosine (~0.66).
        float focus = surfaceWaveFocus(p, uTime);
        float snellWindow = smoothstep(0.53, 0.76, NoV + max(focus, 0.0) * 0.07);
        float tirFactor = 1.0 - snellWindow;

        // Restrained liquid-mirror color with blurred coral bounce only in the rear/mid TIR zone.
        vec2 refXz = p + totalSlope * 2.2;
        vec3 deepWaterMirror = vec3(0.005, 0.024, 0.068);
        vec3 midCyanMirror = vec3(0.016, 0.088, 0.210);
        float waveLuminance = clamp(0.5 + totalSlope.y * 1.8 + totalSlope.x * 0.9, 0.0, 1.0);
        vec3 tirBase = mix(deepWaterMirror, midCyanMirror, waveLuminance);

        float coralZoneZ = exp(-pow((p.y + 1.8) / 2.2, 2.0));
        float violetLeft = exp(-pow((refXz.x + 2.6) / 1.9, 2.0));
        float violetRight = exp(-pow((refXz.x - 2.3) / 1.9, 2.0));
        float greenGlow = exp(-pow((refXz.x + 1.8) / 1.2, 2.0))
                        + exp(-pow((refXz.x - 1.2) / 1.2, 2.0));
        vec3 coralBounce = vec3(0.11, 0.04, 0.22) * clamp(violetLeft + violetRight, 0.0, 1.0)
                         + vec3(0.04, 0.14, 0.10) * clamp(greenGlow, 0.0, 1.0);
        tirBase += coralBounce * coralZoneZ * tirFactor * 0.45;

        // Overhead reef fixture: confined footprint, broad transmission, and restrained glints.
        float fixtureFootprint = exp(-pow(p.x / max(uHalfWidth * 0.88, 0.1), 2.0))
                               * exp(-pow((p.y + 1.1) / 3.4, 2.0));
        vec3 lightDir = normalize(vec3(uSunDir.x, -uSunDir.y, uSunDir.z));
        vec3 halfVector = V - lightDir;
        vec3 H = halfVector / max(length(halfVector), 0.0001);
        float NdotH = clamp(dot(N, H), 0.0, 1.0);
        float broadGlow = pow(NdotH, 12.0) * (0.4 + 0.6 * fixtureFootprint);
        float crispGlint = pow(NdotH, 48.0) * fixtureFootprint;
        float ridgeCaustic = smoothstep(0.15, 0.85, focus) * 0.14;
        vec3 transmitted = vec3(0.06, 0.26, 0.54) * (0.45 + 0.55 * fixtureFootprint)
                         + vec3(0.22, 0.64, 0.95) * (broadGlow + ridgeCaustic)
                         + vec3(0.82, 0.96, 1.00) * crispGlint * 0.24;

        vec3 col = mix(tirBase, transmitted, snellWindow);
        float troughCrease = 1.0 - smoothstep(0.02, 0.22, abs(totalSlope.y + 0.08));
        col = mix(col, vec3(0.003, 0.015, 0.045), troughCrease * tirFactor * 0.38);

        // Thin silver-cyan meniscus is inside the front-glass plane and within the side bounds.
        float meniscusSides = 1.0 - smoothstep(uHalfWidth - 0.14, uHalfWidth, abs(p.x));
        float frontMeniscus = exp(-pow((p.y - (uFrontZ - 0.015)) / 0.018, 2.0)) * meniscusSides;
        col = mix(col, vec3(0.48, 0.80, 0.98), frontMeniscus * 0.72);

        float rearFade = smoothstep(uBackZ, uBackZ + 1.95, p.y);
        float frontClip = 1.0 - smoothstep(uFrontZ - 0.02, uFrontZ, p.y);
        float sideFade = 1.0 - smoothstep(uHalfWidth - 0.12, uHalfWidth, abs(p.x));
        // Match the top of aquarium.ts's rear-water backdrop gradient (cTop).
        col = mix(vec3(0.015, 0.056, 0.145), col, rearFade);

        float baseAlpha = mix(0.78, 0.52, snellWindow);
        float alpha = clamp(baseAlpha * rearFade * frontClip * sideFade + frontMeniscus * 0.85, 0.0, 0.88);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })

  const mesh = new THREE.Mesh(geometryFor(initialLayout), material)
  mesh.name = 'AquariumWaterSurface'
  mesh.rotation.x = Math.PI / 2
  mesh.position.set(0, initialLayout.surfaceY, (initialLayout.frontZ + initialLayout.backZ) / 2)
  mesh.raycast = () => {}

  let currentLayout = initialLayout
  let disposed = false

  return {
    mesh,
    uniforms,
    updateTime(timeSeconds: number) {
      uniforms.uTime.value = Number.isFinite(timeSeconds) ? timeSeconds : 0
    },
    setLayout(layout: WaterSurfaceLayout) {
      if (disposed) return
      if (layout.halfWidth !== currentLayout.halfWidth
        || layout.frontZ !== currentLayout.frontZ
        || layout.backZ !== currentLayout.backZ) {
        const previousGeometry = mesh.geometry
        mesh.geometry = geometryFor(layout)
        previousGeometry.dispose()
      }
      uniforms.uFrontZ.value = layout.frontZ
      uniforms.uBackZ.value = layout.backZ
      uniforms.uHalfWidth.value = layout.halfWidth
      mesh.position.set(0, layout.surfaceY, (layout.frontZ + layout.backZ) / 2)
      currentLayout = layout
    },
    dispose() {
      if (disposed) return
      disposed = true
      mesh.geometry.dispose()
      material.dispose()
    },
  }
}