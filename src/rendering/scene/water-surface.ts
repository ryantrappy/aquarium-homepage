import * as THREE from 'three'
import { glassEnclosureLayout } from './glass-enclosure'
import { SURFACE_WAVE_GLSL } from './surface-waves'

const WATER_SURFACE_WIDTH_SEGMENTS = 96
const WATER_SURFACE_DEPTH_SEGMENTS = 48
export const WATER_TO_AIR_ETA = 1.3333333
export const TIR_RADIANCE_PROXY_DEPTH = 0.9
export const TIR_RADIANCE_PROXY_MAX_TRAVEL = 2.4

type WaterSurfaceLayout = ReturnType<typeof glassEnclosureLayout>

type WaterSurfaceUniforms = {
  uTime: { value: number }
  uFrontZ: { value: number }
  uBackZ: { value: number }
  uHalfWidth: { value: number }
}

/** GLSL `refract(I, N, eta)` reference; normalizes finite nonzero inputs. */
export function evaluateWaterToAirRefraction(
  incident: THREE.Vector3,
  normal: THREE.Vector3,
): THREE.Vector3 | undefined {
  if (![incident.x, incident.y, incident.z, normal.x, normal.y, normal.z].every(Number.isFinite)
    || incident.lengthSq() < 1e-12 || normal.lengthSq() < 1e-12) return undefined
  const unitIncident = incident.clone().normalize()
  const unitNormal = normal.clone().normalize()
  const cosine = unitNormal.dot(unitIncident)
  const k = 1 - WATER_TO_AIR_ETA * WATER_TO_AIR_ETA * (1 - cosine * cosine)
  if (k < 0) return undefined
  return unitIncident.multiplyScalar(WATER_TO_AIR_ETA)
    .addScaledVector(unitNormal, -(WATER_TO_AIR_ETA * cosine + Math.sqrt(k)))
}

/** Bounded proxy lookup point along a TIR-reflected view ray (legacy units). */
export function projectTirRadianceProbe(
  point: THREE.Vector2,
  reflectedRay: THREE.Vector3,
  layout: WaterSurfaceLayout,
): THREE.Vector2 {
  if (![point.x, point.y, reflectedRay.x, reflectedRay.y, reflectedRay.z,
    layout.halfWidth, layout.backZ, layout.frontZ].every(Number.isFinite)
    || reflectedRay.lengthSq() < 1e-12 || layout.halfWidth <= 0 || layout.backZ >= layout.frontZ) {
    throw new RangeError('TIR radiance probe requires finite point, ray, and layout bounds')
  }
  const ray = reflectedRay.clone().normalize()
  const travel = Math.min(
    TIR_RADIANCE_PROXY_DEPTH / Math.max(-ray.y, 0.2),
    TIR_RADIANCE_PROXY_MAX_TRAVEL,
  )
  const startX = THREE.MathUtils.clamp(point.x, -layout.halfWidth, layout.halfWidth)
  const startZ = THREE.MathUtils.clamp(point.y, layout.backZ, layout.frontZ)
  return new THREE.Vector2(
    startX + ray.x * travel,
    startZ + ray.z * travel,
  )
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
      uniform float uFrontZ;
      uniform float uBackZ;
      uniform float uHalfWidth;
      varying vec3 vSurfaceWorldPos;
      ${SURFACE_WAVE_GLSL}

      // Unresolved, phase-coherent capillary height gradients in legacy scene
      // units. fwidth(phase) suppresses frequencies below the pixel footprint;
      // world distance alone would erase visible detail along the rear waterline.
      vec2 screenFilteredMicrofacetSlope(vec2 p, float t) {
        const float k1 = 13.9626, w1 = 11.7020;
        const float k2 = 18.4800, w2 = 13.4670;
        const float k3 = 25.1327, w3 = 15.7070;
        const float k4 = 33.0694, w4 = 18.0140;
        float macroHeight = surfaceWaveHeight(p, t);
        vec2 macroGradient = surfaceWaveSlope(p, t);
        float warp1 = 10.0, warp2 = -14.0, warp3 = 18.0, warp4 = -22.0;
        float phase1 = dot(p, vec2(1.0, 0.0)) * k1 - w1 * t + 0.4 + warp1 * macroHeight;
        float phase2 = dot(p, vec2(0.6, 0.8)) * k2 - w2 * t + 2.0 + warp2 * macroHeight;
        float phase3 = dot(p, vec2(-0.8, 0.6)) * k3 - w3 * t + 4.1 + warp3 * macroHeight;
        float phase4 = dot(p, vec2(0.0, 1.0)) * k4 - w4 * t + 5.2 + warp4 * macroHeight;
        // These are the analytic gradients of the warped height phases, so
        // each microfacet remains an integrable height-field normal.
        vec2 phaseGradient1 = k1 * vec2(1.0, 0.0) + warp1 * macroGradient;
        vec2 phaseGradient2 = k2 * vec2(0.6, 0.8) + warp2 * macroGradient;
        vec2 phaseGradient3 = k3 * vec2(-0.8, 0.6) + warp3 * macroGradient;
        vec2 phaseGradient4 = k4 * vec2(0.0, 1.0) + warp4 * macroGradient;
        float fade1 = 1.0 - smoothstep(1.0, 2.4, fwidth(phase1));
        float fade2 = 1.0 - smoothstep(1.0, 2.4, fwidth(phase2));
        float fade3 = 1.0 - smoothstep(1.0, 2.4, fwidth(phase3));
        float fade4 = 1.0 - smoothstep(1.0, 2.4, fwidth(phase4));
        vec2 slope = vec2(0.0);
        slope += 0.0035 * cos(phase1) * phaseGradient1 * fade1;
        slope += 0.0028 * cos(phase2) * phaseGradient2 * fade2;
        slope += 0.0019 * cos(phase3) * phaseGradient3 * fade3;
        slope += 0.0012 * cos(phase4) * phaseGradient4 * fade4;
        return slope;
      }

      vec3 lateralRadianceRow(vec3 left, vec3 center, vec3 right, float x01) {
        if (x01 < 0.5) return mix(left, center, smoothstep(0.0, 0.5, x01));
        return mix(center, right, smoothstep(0.5, 1.0, x01));
      }

      void main() {
        vec2 p = vSurfaceWorldPos.xz;
        float distToCam = length(cameraPosition - vSurfaceWorldPos);

        // Boost canonical macro slopes and filter capillary detail before it aliases at distance.
        float detailFade = 1.0 - smoothstep(5.5, 15.5, distToCam);
        vec2 macroSlope = surfaceWaveSlope(p, uTime) * 2.6 * mix(0.28, 1.0, detailFade);
        vec2 ripSlope = screenFilteredMicrofacetSlope(p, uTime);
        vec2 totalSlope = macroSlope + ripSlope;

        // The underside normal points down into the aquarium water column.
        vec3 N = normalize(vec3(totalSlope.x, -1.0, totalSlope.y));
        vec3 V = normalize(cameraPosition - vSurfaceWorldPos);
        float NoV = clamp(dot(N, V), 0.0, 1.0);

        // Reverse-trace the view through water to air. The .53/.76 transition
        // is unchanged, but no fixture energy is used when GLSL refract reports TIR.
        vec3 transmittedRay = refract(-V, N, ${WATER_TO_AIR_ETA.toFixed(7)});
        float transmittedRayLength = length(transmittedRay);
        float refractionValid = step(0.0001, transmittedRayLength);
        vec3 safeTransmittedRay = transmittedRay / max(transmittedRayLength, 0.0001);

        // A softened transition centered around the underwater critical-angle cosine (~0.66).
        float focus = surfaceWaveFocus(p, uTime);
        float snellWindow = smoothstep(0.53, 0.76, NoV + max(focus, 0.0) * 0.07);
        float transmissionWindow = snellWindow * refractionValid;
        float tirFactor = 1.0 - transmissionWindow;

        // TIR returns radiance from within the tank. Project that ray a bounded
        // distance into an analytic broad reef-palette field; this is a visual
        // proxy, not a ray hit against coral or habitat geometry.
        vec3 reflectedRay = normalize(reflect(-V, N));
        float proxyTravel = min(${TIR_RADIANCE_PROXY_DEPTH.toFixed(3)} / max(-reflectedRay.y, 0.2), ${TIR_RADIANCE_PROXY_MAX_TRAVEL.toFixed(3)});
        vec2 proxyPoint = p + reflectedRay.xz * proxyTravel;
        vec3 deepWaterMirror = vec3(0.005, 0.024, 0.068);
        vec3 midCyanMirror = vec3(0.016, 0.088, 0.210);
        float waveLuminance = clamp(0.5 + totalSlope.y * 1.8 + totalSlope.x * 0.9, 0.0, 1.0);
        vec3 tirBase = mix(deepWaterMirror, midCyanMirror, waveLuminance);
        float proxyHalfWidth = uHalfWidth + ${TIR_RADIANCE_PROXY_MAX_TRAVEL.toFixed(3)};
        float lateral = clamp((proxyPoint.x + proxyHalfWidth) / (2.0 * proxyHalfWidth), 0.0, 1.0);
        vec3 deepRow = lateralRadianceRow(vec3(0.008, 0.028, 0.075), vec3(0.008, 0.032, 0.090), vec3(0.012, 0.033, 0.045), lateral);
        vec3 midRow = lateralRadianceRow(vec3(0.055, 0.045, 0.130), vec3(0.130, 0.360, 0.480), vec3(0.100, 0.120, 0.045), lateral);
        vec3 brightRow = lateralRadianceRow(vec3(0.130, 0.070, 0.220), vec3(0.320, 0.580, 0.680), vec3(0.190, 0.180, 0.060), lateral);
        float depth01 = clamp((proxyPoint.y - (uBackZ - ${TIR_RADIANCE_PROXY_MAX_TRAVEL.toFixed(3)}))
                           / (uBackZ + 3.6 - (uBackZ - ${TIR_RADIANCE_PROXY_MAX_TRAVEL.toFixed(3)})), 0.0, 1.0);
        vec3 proxyRadiance = depth01 < 0.5
          ? mix(deepRow, midRow, smoothstep(0.0, 0.5, depth01))
          : mix(midRow, brightRow, smoothstep(0.5, 1.0, depth01));
        tirBase = mix(tirBase, proxyRadiance, 0.78);

        // Trace the view ray back through the interface only when water-to-air
        // refraction is valid. Compare it to the actual key and rear-panel
        // directions; do not paint fixture light into total-internal-reflection.
        vec3 keyRay = normalize(vec3(1.2, 6.8, 4.6) - vSurfaceWorldPos);
        vec3 rearPanelRay = normalize(vec3(0.0, 5.0, -4.0) - vSurfaceWorldPos);
        float keyAlignment = max(dot(safeTransmittedRay, keyRay), 0.0) * refractionValid;
        float rearPanelAlignment = max(dot(safeTransmittedRay, rearPanelRay), 0.0) * refractionValid;
        float broadGlow = pow(keyAlignment, 8.0) * 0.72 + pow(rearPanelAlignment, 8.0) * 0.28;
        float crispGlint = pow(keyAlignment, 24.0) * 0.72 + pow(rearPanelAlignment, 24.0) * 0.28;
        vec3 transmitted = vec3(0.04, 0.18, 0.38) * broadGlow
                         + vec3(0.22, 0.64, 0.95) * broadGlow
                         + vec3(0.82, 0.96, 1.00) * crispGlint * 0.24;

        vec3 col = mix(tirBase, transmitted, transmissionWindow);
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

        float baseAlpha = mix(0.78, 0.52, transmissionWindow);
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
