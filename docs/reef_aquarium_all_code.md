# Photorealistic Reef Aquarium — Source Code

> From the final consolidated Gemini response. Code is unverified. Earlier revisions are not duplicated.

## src/shaders/aquariumOptics.js

```javascript
import * as THREE from 'three/webgpu';
import {
  Fn, uniform, float, vec2, vec3,
  positionWorld, normalWorld, cameraPosition, time, texture,
  exp, max, min, dot, normalize, length, clamp, smoothstep, refract
} from 'three/tsl';

export const aquariumUniforms = {
  // Inner water volume bounds in meters (3.0m wide x 1.2m tall x 1.5m deep tank)
  tankMin: uniform(new THREE.Vector3(-1.5, 0.0, -0.75)),
  tankMax: uniform(new THREE.Vector3(1.5, 1.2, 0.75)),

  // Normalized direction toward the overhead 14,000K-20,000K Reef LED array
  lightDir: uniform(new THREE.Vector3(0.15, 0.98, 0.12).normalize()),

  // Spectral Extinction Coefficients (Red, Green, Blue) in m^-1
  sigmaExtinction: uniform(new THREE.Vector3(0.45, 0.075, 0.02)),

  // Optical density multiplier for aquarium scale
  opticalDensityScale: uniform(2.2),

  // Volumetric in-scattering color (Actinic Royal Blue / Cyan water veil)
  scatterColor: uniform(new THREE.Color(0x063852)),

  // Caustics tuning
  causticIntensity: uniform(2.4),
  causticScale: uniform(0.35),
  causticSpeed: uniform(0.8),
  dispersionStrength: uniform(0.012)
};

/**
 * Ray-AABB slab intersection: computes the exact distance a camera ray
 * travels INSIDE the aquarium water volume [tankMin, tankMax].
 */
export const getWaterViewDistance = Fn(() => {
  const rayVec = positionWorld.sub(cameraPosition);
  const totalDist = length(rayVec);
  const rayDir = rayVec.div(max(totalDist, 0.0001));

  const invDir = vec3(1.0).div(rayDir);
  const t0 = aquariumUniforms.tankMin.sub(cameraPosition).mul(invDir);
  const t1 = aquariumUniforms.tankMax.sub(cameraPosition).mul(invDir);

  const tNearVec = min(t0, t1);
  const tFarVec = max(t0, t1);

  const tEnter = max(
    float(0.0),
    max(tNearVec.x, max(tNearVec.y, tNearVec.z))
  );

  const tExit = min(
    totalDist,
    min(tFarVec.x, min(tFarVec.y, tFarVec.z))
  );

  return max(float(0.0), tExit.sub(tEnter));
});

/**
 * Projects chromatically dispersed, normal-masked surface caustics
 * attenuated along the downwelling water path.
 */
export const computeAquariumCaustics = Fn(([causticTex, waveNormalTex]) => {
  const {
    tankMin, tankMax, lightDir, sigmaExtinction, opticalDensityScale,
    causticIntensity, causticScale, dispersionStrength
  } = aquariumUniforms;

  const waterDepth = max(float(0.0), tankMax.y.sub(positionWorld.y));
  const downwellingDist = waterDepth.div(max(lightDir.y, 0.15));

  const surfaceHitXZ = positionWorld.xz.add(lightDir.xz.mul(downwellingDist));

  const tankSizeXZ = tankMax.xz.sub(tankMin.xz);
  const surfaceUV = surfaceHitXZ.sub(tankMin.xz).div(tankSizeXZ).mul(causticScale);

  const waveSample = texture(waveNormalTex, surfaceUV);
  const surfaceNormal = normalize(vec3(waveSample.xy, 1.0).xzy);

  const incident = lightDir.negate();
  const refractR = refract(incident, surfaceNormal, float(1.0 / 1.331));
  const refractG = refract(incident, surfaceNormal, float(1.0 / 1.334));
  const refractB = refract(incident, surfaceNormal, float(1.0 / 1.338));

  const depthFactor = clamp(waterDepth.mul(0.45), 0.02, 1.5);

  const uvR = surfaceUV.add(refractR.xz.mul(depthFactor).add(dispersionStrength));
  const uvG = surfaceUV.add(refractG.xz.mul(depthFactor));
  const uvB = surfaceUV.add(refractB.xz.mul(depthFactor).sub(dispersionStrength));

  const cR = texture(causticTex, uvR).r;
  const cG = texture(causticTex, uvG).g;
  const cB = texture(causticTex, uvB).b;

  const rawCaustics = vec3(cR, cG, cB).mul(causticIntensity);

  const ndotl = dot(normalWorld, lightDir);
  const overhangMask = smoothstep(0.0, 0.3, ndotl);
  const focusRamp = smoothstep(0.0, 0.1, waterDepth);

  const downwellingTransmittance = exp(
    sigmaExtinction.negate().mul(downwellingDist).mul(opticalDensityScale)
  );

  return rawCaustics
    .mul(overhangMask)
    .mul(focusRamp)
    .mul(downwellingTransmittance);
});

/**
 * Wraps any MeshPhysicalNodeMaterial with Dual-Path Beer-Lambert absorption,
 * projected caustics, actinic GFP/RFP coral fluorescence, and volumetric water veil.
 */
export function applyAquariumOptics(material, {
  baseColorNode,
  fluorescenceColorNode = vec3(0.0),
  causticTex,
  waveNormalTex
}) {
  const {
    tankMax, lightDir, sigmaExtinction, opticalDensityScale, scatterColor
  } = aquariumUniforms;

  const waterDepth = max(float(0.0), tankMax.y.sub(positionWorld.y));
  const downwellingDist = waterDepth.div(max(lightDir.y, 0.15));
  const T_down = exp(
    sigmaExtinction.negate().mul(downwellingDist).mul(opticalDensityScale)
  );

  const viewWaterDist = getWaterViewDistance();
  const T_view = exp(
    sigmaExtinction.negate().mul(viewWaterDist).mul(opticalDensityScale)
  );

  material.colorNode = baseColorNode.mul(T_down).mul(T_view);

  const caustics = computeAquariumCaustics(causticTex, waveNormalTex);
  const excitedFluorescence = fluorescenceColorNode.mul(T_down.b).mul(T_view);

  const localScatterLight = scatterColor.mul(
    exp(sigmaExtinction.negate().mul(waterDepth).mul(opticalDensityScale * 0.5))
  );
  const inScatteredVeil = localScatterLight.mul(vec3(1.0).sub(T_view));

  material.emissiveNode = baseColorNode
    .mul(caustics)
    .mul(T_view)
    .add(excitedFluorescence)
    .add(inScatteredVeil);

  return material;
}
```

## src/shaders/causticCompute.js

```javascript
import {
  Fn, uniform, float, int, ivec2, vec2, vec3, vec4,
  instanceIndex, textureStore, textureLoad, time,
  sin, cos, max, min, abs, clamp, normalize, refract, length
} from 'three/tsl';

export class AquariumSurfaceSimulator {
  constructor(renderer, resolution = 512) {
    this.renderer = renderer;
    this.res = resolution;

    this.waveStateA = this.createStorageTexture();
    this.waveStateB = this.createStorageTexture();
    this.waveNormalTex = this.createStorageTexture();
    this.causticTex = this.createStorageTexture();

    this.pingPong = false;

    this.params = {
      waveSpeed: uniform(0.18),
      damping: uniform(0.994),
      wavemakerAmp: uniform(0.0085),
      refProjectionDepth: uniform(0.45),
      lightDir: uniform(new THREE.Vector3(0.15, 0.98, 0.12).normalize())
    };

    this.initComputeNodes();
  }

  createStorageTexture() {
    const tex = new THREE.StorageTexture(this.res, this.res);
    tex.type = THREE.HalfFloatType;
    tex.format = THREE.RGBAFormat;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  initComputeNodes() {
    const resInt = int(this.res);
    const resFloat = float(this.res);

    const buildWaveStep = (readTex, writeTex) => Fn(() => {
      const idx = int(instanceIndex);
      const x = idx.mod(resInt);
      const y = idx.div(resInt);
      const coord = ivec2(x, y);

      const xLeft  = max(int(0), x.sub(1));
      const xRight = min(resInt.sub(1), x.add(1));
      const yDown  = max(int(0), y.sub(1));
      const yUp    = min(resInt.sub(1), y.add(1));

      const center = textureLoad(readTex, coord);
      const hCurr  = center.r;
      const hPrev  = center.g;

      const hL = textureLoad(readTex, ivec2(xLeft, y)).r;
      const hR = textureLoad(readTex, ivec2(xRight, y)).r;
      const hD = textureLoad(readTex, ivec2(x, yDown)).r;
      const hU = textureLoad(readTex, ivec2(x, yUp)).r;

      const laplacian = hL.add(hR).add(hD).add(hU).sub(hCurr.mul(4.0));

      const uv = vec2(float(x), float(y)).div(resFloat);
      const t = time;

      const d1 = length(uv.sub(vec2(0.08, 0.35)));
      const source1 = sin(d1.mul(85.0).sub(t.mul(9.5)))
        .mul( cos(uv.y.mul(40.0).add(t.mul(3.2))) )
        .mul( max(float(0.0), float(1.0).sub(d1.mul(5.5))) );

      const d2 = length(uv.sub(vec2(0.92, 0.68)));
      const source2 = sin(d2.mul(110.0).sub(t.mul(12.0)))
        .mul( sin(uv.x.mul(50.0).sub(t.mul(4.1))) )
        .mul( max(float(0.0), float(1.0).sub(d2.mul(6.0))) );

      const forcing = source1.add(source2).mul(this.params.wavemakerAmp);

      const hNext = hCurr.mul(2.0)
        .sub(hPrev)
        .add(laplacian.mul(this.params.waveSpeed))
        .add(forcing)
        .mul(this.params.damping);

      const dhdu = hR.sub(hL).mul(0.5).mul(resFloat);
      const dhdv = hU.sub(hD).mul(0.5).mul(resFloat);

      textureStore(writeTex, coord, vec4(hNext, hCurr, dhdu, dhdv));
      textureStore(this.waveNormalTex, coord, vec4(dhdu.negate(), dhdv.negate(), hNext, 1.0));
    })().compute(this.res * this.res);

    this.computeWaveAtoB = buildWaveStep(this.waveStateA, this.waveStateB);
    this.computeWaveBtoA = buildWaveStep(this.waveStateB, this.waveStateA);

    const HelperProjectRay = Fn(([normSample, iorRatio]) => {
      const n = normalize(vec3(normSample.x, 1.0, normSample.y));
      const incident = this.params.lightDir.negate();
      const refracted = refract(incident, n, iorRatio);
      return refracted.xz.div(max(abs(refracted.y), 0.1)).mul(this.params.refProjectionDepth);
    });

    this.computeJacobianNode = Fn(() => {
      const idx = int(instanceIndex);
      const x = idx.mod(resInt);
      const y = idx.div(resInt);
      const coord = ivec2(x, y);

      const xLeft  = max(int(0), x.sub(1));
      const xRight = min(resInt.sub(1), x.add(1));
      const yDown  = max(int(0), y.sub(1));
      const yUp    = min(resInt.sub(1), y.add(1));

      const nL = textureLoad(this.waveNormalTex, ivec2(xLeft, y));
      const nR = textureLoad(this.waveNormalTex, ivec2(xRight, y));
      const nD = textureLoad(this.waveNormalTex, ivec2(x, yDown));
      const nU = textureLoad(this.waveNormalTex, ivec2(x, yUp));

      const cellStep = float(2.0).div(resFloat);

      const evalChannelCaustic = (iorRatio) => {
        const dispL = HelperProjectRay(nL, iorRatio);
        const dispR = HelperProjectRay(nR, iorRatio);
        const dispD = HelperProjectRay(nD, iorRatio);
        const dispU = HelperProjectRay(nU, iorRatio);

        const dPx_du = float(1.0).add(dispR.x.sub(dispL.x).div(cellStep));
        const dPz_du = dispR.y.sub(dispL.y).div(cellStep);

        const dPx_dv = dispU.x.sub(dispD.x).div(cellStep);
        const dPz_dv = float(1.0).add(dispU.y.sub(dispD.y).div(cellStep));

        const detJ = dPx_du.mul(dPz_dv).sub(dPx_dv.mul(dPz_du));
        const flux = float(1.0).div(max(abs(detJ), 0.065));

        return clamp(flux.sub(0.85), 0.0, 6.0).pow(1.45);
      };

      const causticR = evalChannelCaustic(float(1.0 / 1.331));
      const causticG = evalChannelCaustic(float(1.0 / 1.334));
      const causticB = evalChannelCaustic(float(1.0 / 1.338));

      textureStore(this.causticTex, coord, vec4(causticR, causticG, causticB, 1.0));
    })().compute(this.res * this.res);
  }

  update() {
    const waveStep = this.pingPong ? this.computeWaveBtoA : this.computeWaveAtoB;
    this.pingPong = !this.pingPong;
    this.renderer.compute([waveStep, this.computeJacobianNode]);
  }
}
```

## src/shaders/fishBiomechanics.js

```javascript
import {
  Fn, uniform, attribute, float, vec2, vec3,
  positionLocal, normalLocal, uv, time, texture,
  sin, cos, max, min, clamp, mix, smoothstep, normalize, dot, cross
} from 'three/tsl';
import { applyAquariumOptics } from './aquariumOptics.js';

export const SWIMMING_GUILDS = {
  CARANGIFORM: {
    envelope: new THREE.Vector4(0.01, -0.08, 0.18, 0.32),
    waveNumber: 5.2,
    pectoralAmplitude: 0.15,
    dorsalRibbonAmplitude: 0.08
  },
  LABRIFORM: {
    envelope: new THREE.Vector4(0.005, -0.02, 0.06, 0.12),
    waveNumber: 4.5,
    pectoralAmplitude: 0.65,
    dorsalRibbonAmplitude: 0.05
  },
  BALISTIFORM: {
    envelope: new THREE.Vector4(0.0, 0.0, 0.0, 0.08),
    waveNumber: 9.5,
    pectoralAmplitude: 0.25,
    dorsalRibbonAmplitude: 0.42
  }
};

export function createReefFishMaterial({
  guild = SWIMMING_GUILDS.CARANGIFORM,
  bodyLength = 0.18,
  albedoMap,
  scaleNormalMap,
  opticalMaskMap,
  causticTex,
  waveNormalTex
}) {
  const uSwimSpeed       = uniform(14.0);
  const uStrideAmplitude = uniform(0.045);
  const uTurnCurvature   = uniform(0.0);
  const uBurstFactor     = uniform(0.25);
  const uEnvelopeCoeffs  = uniform(guild.envelope.clone());
  const uWaveNumber      = uniform(guild.waveNumber);
  const uPectoralAmp     = uniform(guild.pectoralAmplitude);
  const uDorsalRibbonAmp = uniform(guild.dorsalRibbonAmplitude);

  const vMask = attribute('color', 'vec3');
  const halfLen = float(bodyLength * 0.5);
  const s = clamp(halfLen.sub(positionLocal.x).div(bodyLength), 0.0, 1.0);

  const s2 = s.mul(s);
  const s3 = s2.mul(s);
  const baseEnvelope = uEnvelopeCoeffs.x
    .add(uEnvelopeCoeffs.y.mul(s))
    .add(uEnvelopeCoeffs.z.mul(s2))
    .add(uEnvelopeCoeffs.w.mul(s3));

  const activeAxialEnvelope = baseEnvelope.mul(mix(float(0.35), float(1.4), uBurstFactor));
  const dAds = uEnvelopeCoeffs.y
    .add(uEnvelopeCoeffs.z.mul(s).mul(2.0))
    .add(uEnvelopeCoeffs.w.mul(s2).mul(3.0))
    .mul(mix(float(0.35), float(1.4), uBurstFactor));

  const phase = uWaveNumber.mul(s).sub(time.mul(uSwimSpeed));
  const waveSin = sin(phase);
  const waveCos = cos(phase);

  const centeredX = positionLocal.x;
  const turnBendZ = uTurnCurvature.mul(centeredX.mul(centeredX)).mul(0.5);
  const dTurn_dx  = uTurnCurvature.mul(centeredX);

  const axialDispZ = activeAxialEnvelope.mul(uStrideAmplitude).mul(waveSin).add(turnBendZ);

  const ds_dx = float(-1.0 / bodyLength);
  const dWave_ds = dAds.mul(waveSin).add(activeAxialEnvelope.mul(uWaveNumber).mul(waveCos)).mul(uStrideAmplitude);
  const spineSlopeZ = dWave_ds.mul(ds_dx).add(dTurn_dx);

  const scullPhase = time.mul(uSwimSpeed.mul(1.15));
  const activePectoral = pectoralMask = vMask.r; // handled via expression
  const pecAbductZ  = sin(scullPhase).mul(vMask.r.mul(uPectoralAmp).mul(float(1.0).sub(uBurstFactor.mul(0.75)))).mul(0.025);
  const pecFeatherY = cos(scullPhase.sub(1.1)).mul(vMask.r.mul(uPectoralAmp).mul(float(1.0).sub(uBurstFactor.mul(0.75)))).mul(0.015);

  const ribbonWaveZ = sin(s.mul(12.0).sub(time.mul(uSwimSpeed.mul(1.4))))
    .mul(vMask.g)
    .mul(uDorsalRibbonAmp)
    .mul(0.018);

  const deformedPositionNode = Fn(() => {
    const pos = positionLocal.toVar();
    const foreshortening = spineSlopeZ.mul(spineSlopeZ).mul(0.25).mul(s);
    pos.x.addAssign(foreshortening);
    pos.y.addAssign(pecFeatherY);
    pos.z.addAssign(axialDispZ.add(pecAbductZ).add(ribbonWaveZ));
    return pos;
  })();

  const deformedNormalNode = Fn(() => {
    const n = normalLocal.toVar();
    const nx = n.x.sub(n.z.mul(spineSlopeZ));
    const nz = n.z.add(n.x.mul(spineSlopeZ));
    return normalize(vec3(nx, n.y, nz));
  })();

  const fishMaterial = new THREE.MeshPhysicalNodeMaterial({
    roughness: 0.28,
    metalness: 0.05,
    ior: 1.46
  });

  fishMaterial.positionNode = deformedPositionNode;
  fishMaterial.normalNode = deformedNormalNode;

  const uvCoord = uv();
  const basePigment = texture(albedoMap, uvCoord).rgb;
  const opticalMasks = texture(opticalMaskMap, uvCoord);
  const microScaleNormal = texture(scaleNormalMap, uvCoord).xyz.mul(2.0).sub(1.0);

  const iridophoreMask = max(vMask.b, opticalMasks.b);
  fishMaterial.iridescenceNode = clamp(iridophoreMask.mul(1.15), 0.0, 1.0);
  fishMaterial.iridescenceIORNode = float(1.83);
  fishMaterial.iridescenceThicknessNode = mix(float(175.0), float(365.0), opticalMasks.b);

  fishMaterial.clearcoatNode = float(0.85);
  fishMaterial.clearcoatRoughnessNode = float(0.06);
  fishMaterial.roughnessNode = clamp(opticalMasks.r.mul(0.45), 0.12, 0.65);

  const finTranslucency = max(vMask.g, opticalMasks.g);
  fishMaterial.transmissionNode = clamp(finTranslucency.mul(0.75), 0.0, 0.85);
  fishMaterial.thicknessNode = mix(float(0.015), float(0.0015), finTranslucency);
  fishMaterial.attenuationColorNode = basePigment.pow(0.75);
  fishMaterial.attenuationDistanceNode = float(0.025);

  applyAquariumOptics(fishMaterial, {
    baseColorNode: basePigment,
    fluorescenceColorNode: vec3(0.0),
    causticTex,
    waveNormalTex
  });

  fishMaterial.userData.locomotionUniforms = {
    uSwimSpeed,
    uStrideAmplitude,
    uTurnCurvature,
    uBurstFactor
  };

  return fishMaterial;
}
```

## src/shaders/fishSchoolCompute.js

```javascript
import {
  Fn, uniform, instancedArray, float, int, uint, ivec3, vec3, vec4,
  instanceIndex, texture3D, deltaTime,
  min, max, clamp, mix, smoothstep, length, normalize, dot, cross,
  If, Loop, atomicAdd, atomicStore, sin, cos
} from 'three/tsl';
import { aquariumUniforms } from './aquariumOptics.js';

export class ReefSchoolSimulator {
  constructor(renderer, reefSdfTexture, count = 1024) {
    this.renderer = renderer;
    this.reefSdfTexture = reefSdfTexture;
    this.count = count;

    this.gridDims = new THREE.Vector3(16, 8, 8);
    this.totalCells = this.gridDims.x * this.gridDims.y * this.gridDims.z;
    this.maxPerCell = 16;

    this.positionAndPhaseBuffer = instancedArray(this.count, 'vec4');
    this.velocityAndBurstBuffer = instancedArray(this.count, 'vec4');
    this.headingAndCurvatureBuffer = instancedArray(this.count, 'vec4');

    this.cellCountsBuffer = instancedArray(this.totalCells, 'uint').toAtomic();
    this.cellEntriesBuffer = instancedArray(this.totalCells * this.maxPerCell, 'uint');

    this.params = {
      cruiseSpeed: uniform(0.28),
      maxBurstSpeed: uniform(1.15),
      minSpeed: uniform(0.08),
      separationRadius: uniform(0.09),
      perceptionRadius: uniform(0.26),
      separationWeight: uniform(2.8),
      alignmentWeight: uniform(1.4),
      cohesionWeight: uniform(1.1),
      sdfSafetyMargin: uniform(0.14),
      sdfAvoidWeight: uniform(6.5),
      lookaheadTime: uniform(0.28),
      baseTailFreq: uniform(11.0),
      burstTailFreq: uniform(24.0),
      maxSpineCurvature: uniform(6.5)
    };

    this.seedInitialSchoolState();
    this.initComputeKernels();
  }

  seedInitialSchoolState() {
    const posArr = this.positionAndPhaseBuffer.value.array;
    const velArr = this.velocityAndBurstBuffer.value.array;
    const headArr = this.headingAndCurvatureBuffer.value.array;

    for (let i = 0; i < this.count; i++) {
      const i4 = i * 4;
      posArr[i4 + 0] = (Math.random() - 0.5) * 2.2;
      posArr[i4 + 1] = 0.45 + Math.random() * 0.55;
      posArr[i4 + 2] = (Math.random() - 0.5) * 1.0;
      posArr[i4 + 3] = Math.random() * Math.PI * 2.0;

      const angle = Math.random() * Math.PI * 2.0;
      velArr[i4 + 0] = Math.cos(angle) * 0.25;
      velArr[i4 + 1] = 0.0;
      velArr[i4 + 2] = Math.sin(angle) * 0.25;
      velArr[i4 + 3] = 0.1;

      headArr[i4 + 0] = Math.cos(angle);
      headArr[i4 + 1] = 0.0;
      headArr[i4 + 2] = Math.sin(angle);
      headArr[i4 + 3] = 0.0;
    }
  }

  initComputeKernels() {
    const { tankMin, tankMax } = aquariumUniforms;
    const gridDimsVec = vec3(this.gridDims.x, this.gridDims.y, this.gridDims.z);
    const gridDimsIVec = ivec3(this.gridDims.x, this.gridDims.y, this.gridDims.z);
    const maxPerCellUint = uint(this.maxPerCell);

    const worldToTankUVW = Fn(([worldPos]) => {
      const tankSize = tankMax.sub(tankMin);
      return clamp(worldPos.sub(tankMin).div(tankSize), 0.001, 0.999);
    });

    const cellCoordToIndex = Fn(([c]) => {
      const clamped = clamp(c, ivec3(0, 0, 0), gridDimsIVec.sub(ivec3(1, 1, 1)));
      return uint(
        clamped.x
          .add(clamped.y.mul(int(this.gridDims.x)))
          .add(clamped.z.mul(int(this.gridDims.x * this.gridDims.y)))
      );
    });

    const sampleReefSDF = Fn(([worldPos]) => {
      const uvw = worldToTankUVW(worldPos);
      const dist = texture3D(this.reefSdfTexture, uvw).r;
      const h = float(0.004);
      const k0 = vec3( 1.0, -1.0, -1.0);
      const k1 = vec3(-1.0, -1.0,  1.0);
      const k2 = vec3(-1.0,  1.0, -1.0);
      const k3 = vec3( 1.0,  1.0,  1.0);

      const d0 = texture3D(this.reefSdfTexture, clamp(uvw.add(k0.mul(h)), 0.0, 1.0)).r;
      const d1 = texture3D(this.reefSdfTexture, clamp(uvw.add(k1.mul(h)), 0.0, 1.0)).r;
      const d2 = texture3D(this.reefSdfTexture, clamp(uvw.add(k2.mul(h)), 0.0, 1.0)).r;
      const d3 = texture3D(this.reefSdfTexture, clamp(uvw.add(k3.mul(h)), 0.0, 1.0)).r;

      const rawGrad = k0.mul(d0).add(k1.mul(d1)).add(k2.mul(d2)).add(k3.mul(d3));
      const unitGrad = normalize(rawGrad.add(vec3(0.0, 0.0001, 0.0)));
      return vec4(unitGrad, dist);
    });

    this.clearGridKernel = Fn(() => {
      atomicStore(this.cellCountsBuffer.element(instanceIndex), uint(0));
    })().compute(this.totalCells);

    this.populateGridKernel = Fn(() => {
      const idx = uint(instanceIndex);
      const pos = this.positionAndPhaseBuffer.element(idx).xyz;
      const uvw = worldToTankUVW(pos);
      const cellCoord = ivec3(uvw.mul(gridDimsVec));
      const cellIdx = cellCoordToIndex(cellCoord);

      const slot = atomicAdd(this.cellCountsBuffer.element(cellIdx), uint(1));
      If(slot.lessThan(maxPerCellUint), () => {
        const bucketOffset = cellIdx.mul(maxPerCellUint).add(slot);
        this.cellEntriesBuffer.element(bucketOffset).assign(idx);
      });
    })().compute(this.count);

    this.steerAndIntegrateKernel = Fn(() => {
      const idx = uint(instanceIndex);
      const dt = min(deltaTime, float(0.033));

      const posPhase = this.positionAndPhaseBuffer.element(idx);
      const velBurst = this.velocityAndBurstBuffer.element(idx);
      const headCurv = this.headingAndCurvatureBuffer.element(idx);

      const pos = posPhase.xyz.toVar();
      const phase = posPhase.w.toVar();
      const vel = velBurst.xyz.toVar();
      const burst = velBurst.w.toVar();
      const heading = headCurv.xyz.toVar();
      const curvature = headCurv.w.toVar();

      const uvw = worldToTankUVW(pos);
      const centerCell = ivec3(uvw.mul(gridDimsVec));

      const sepForce = vec3(0.0).toVar();
      const alignSum = vec3(0.0).toVar();
      const cohesionSum = vec3(0.0).toVar();
      const visualWeightSum = float(0.0).toVar();

      const rSep = this.params.separationRadius;
      const rPerc = this.params.perceptionRadius;

      Loop({ start: int(0), end: int(27), type: 'int', condition: '<' }, ({ i }) => {
        const dz = i.div(9).sub(1);
        const rem = i.mod(9);
        const dy = rem.div(3).sub(1);
        const dx = rem.mod(3).sub(1);

        const neighborCell = centerCell.add(ivec3(dx, dy, dz));
        const cellIdx = cellCoordToIndex(neighborCell);
        const countInCell = min(this.cellCountsBuffer.element(cellIdx), maxPerCellUint);

        Loop({ start: uint(0), end: countInCell, type: 'uint', condition: '<' }, ({ i: slot }) => {
          const otherIdx = this.cellEntriesBuffer.element(cellIdx.mul(maxPerCellUint).add(slot));

          If(otherIdx.notEqual(idx), () => {
            const otherPos = this.positionAndPhaseBuffer.element(otherIdx).xyz;
            const otherVel = this.velocityAndBurstBuffer.element(otherIdx).xyz;
            const offset = otherPos.sub(pos);
            const dist = length(offset);

            If(dist.lessThan(rPerc).and(dist.greaterThan(0.0001)), () => {
              const dirToNeighbor = offset.div(dist);

              If(dist.lessThan(rSep), () => {
                const sepStrength = float(1.0).sub(dist.div(rSep));
                sepForce.subAssign(dirToNeighbor.mul(sepStrength.mul(sepStrength)));
              });

              const cosAngle = dot(heading, dirToNeighbor);
              const fovWeight = smoothstep(float(-0.65), float(-0.15), cosAngle);
              const distWeight = float(1.0).sub(dist.div(rPerc));
              const w = fovWeight.mul(distWeight);

              alignSum.addAssign(otherVel.mul(w));
              cohesionSum.addAssign(otherPos.mul(w));
              visualWeightSum.addAssign(w);
            });
          });
        });
      });

      const steeringAcc = sepForce.mul(this.params.separationWeight).toVar();

      If(visualWeightSum.greaterThan(0.001), () => {
        const avgVel = alignSum.div(visualWeightSum);
        const centerOfMass = cohesionSum.div(visualWeightSum);
        const toCenter = centerOfMass.sub(pos);

        steeringAcc.addAssign(avgVel.sub(vel).mul(this.params.alignmentWeight));
        steeringAcc.addAssign(toCenter.mul(this.params.cohesionWeight));
      });

      const lookaheadPos = pos.add(vel.mul(this.params.lookaheadTime));
      const sdfNow = sampleReefSDF(pos);
      const sdfAhead = sampleReefSDF(lookaheadPos);

      const minSdfDist = min(sdfNow.w, sdfAhead.w);
      const sdfGrad = normalize(mix(sdfAhead.xyz, sdfNow.xyz, float(0.35)));

      If(minSdfDist.lessThan(this.params.sdfSafetyMargin), () => {
        const urgency = smoothstep(this.params.sdfSafetyMargin, float(0.0), minSdfDist);
        const tangentComponent = sdfGrad.sub(heading.mul(dot(sdfGrad, heading)));
        const slipDir = normalize(tangentComponent.add(sdfGrad.mul(0.35)));
        steeringAcc.addAssign(slipDir.mul(urgency.mul(urgency)).mul(this.params.sdfAvoidWeight));
      });

      If(sdfNow.w.lessThan(0.015), () => {
        pos.addAssign(sdfNow.xyz.mul(float(0.015).sub(sdfNow.w)));
      });

      const margin = float(0.16);
      const minBound = tankMin.add(margin);
      const maxBound = tankMax.sub(margin);

      const wallPush = vec3(
        smoothstep(minBound.x, tankMin.x, pos.x).sub(smoothstep(maxBound.x, tankMax.x, pos.x)),
        smoothstep(minBound.y, tankMin.y, pos.y).sub(smoothstep(maxBound.y, tankMax.y, pos.y)),
        smoothstep(minBound.z, tankMin.z, pos.z).sub(smoothstep(maxBound.z, tankMax.z, pos.z))
      );
      steeringAcc.addAssign(wallPush.mul(4.5));
      steeringAcc.y.subAssign(vel.y.mul(1.8));

      vel.addAssign(steeringAcc.mul(dt));
      const rawSpeed = length(vel);
      const clampedSpeed = clamp(rawSpeed, this.params.minSpeed, this.params.maxBurstSpeed);
      const newDir = vel.div(max(rawSpeed, 0.0001));
      vel.assign(newDir.mul(clampedSpeed));

      heading.assign(normalize(mix(heading, newDir, clamp(dt.mul(12.0), 0.0, 1.0))));
      pos.addAssign(vel.mul(dt));

      const upVec = vec3(0.0, 1.0, 0.0);
      const lateralMoment = dot(cross(heading, steeringAcc), upVec);
      const speedSq = max(clampedSpeed.mul(clampedSpeed), float(0.04));
      const targetCurvature = clamp(lateralMoment.div(speedSq), this.params.maxSpineCurvature.negate(), this.params.maxSpineCurvature);
      curvature.assign(mix(curvature, targetCurvature, clamp(dt.mul(10.0), 0.0, 1.0)));

      const speedRatio = clamp(clampedSpeed.sub(this.params.cruiseSpeed).div(this.params.maxBurstSpeed.sub(this.params.cruiseSpeed)), 0.0, 1.0);
      const startleBoost = smoothstep(float(0.08), float(0.0), minSdfDist).mul(0.5);
      const targetBurst = clamp(speedRatio.add(startleBoost), 0.0, 1.0);
      burst.assign(mix(burst, targetBurst, clamp(dt.mul(8.0), 0.0, 1.0)));

      const instOmega = mix(this.params.baseTailFreq, this.params.burstTailFreq, burst);
      phase.assign(phase.add(instOmega.mul(dt)).mod(float(Math.PI * 200.0)));

      this.positionAndPhaseBuffer.element(idx).assign(vec4(pos, phase));
      this.velocityAndBurstBuffer.element(idx).assign(vec4(vel, burst));
      this.headingAndCurvatureBuffer.element(idx).assign(vec4(heading, curvature));
    })().compute(this.count);
  }

  update() {
    this.renderer.compute([
      this.clearGridKernel,
      this.populateGridKernel,
      this.steerAndIntegrateKernel
    ]);
  }
}
```

## src/shaders/coralPolypShader.js

```javascript
import {
  Fn, uniform, attribute, float, vec3,
  positionLocal, normalLocal, uv, time, texture,
  sin, cos, max, mix, smoothstep, normalize, length
} from 'three/tsl';
import { applyAquariumOptics } from './aquariumOptics.js';

const computeCurlNoiseFlow = Fn(([pos, t]) => {
  const p = pos.mul(1.8).add(vec3(0.0, t.mul(0.35), 0.0));
  const n1 = sin(p.yzx.mul(2.2).add(t.mul(0.8))).mul(cos(p.zxy.mul(1.9)));
  const n2 = cos(p.zxy.mul(3.1).sub(t.mul(0.6))).mul(sin(p.yzx.mul(2.5)));
  const flowDir = normalize(n1.sub(n2));
  return flowDir.mul(0.045);
});

export function createCoralPolypMaterial({
  baseAlbedoMap,
  polypNormalMap,
  gfpFluorescenceMap,
  causticTex,
  waveNormalTex
}) {
  const uFlowSpeed = uniform(0.75);
  const uTentacleFlexibility = uniform(1.2);
  const uFluorescenceIntensity = uniform(2.2);

  const vHeight = attribute('color', 'r');
  const vColonyID = attribute('color', 'g');

  const deformedPositionNode = Fn(() => {
    const pos = positionLocal.toVar();
    const t = time.mul(uFlowSpeed).add(vColonyID.mul(6.2831));
    const h = clamp(vHeight, 0.0, 1.0);
    const h2 = h.mul(h);

    const flowOffset = computeCurlNoiseFlow(pos, t);
    const tipFlutter = sin(t.mul(6.0).add(h.mul(12.0))).mul(h2).mul(0.008);

    const displacement = flowOffset.mul(h2).mul(uTentacleFlexibility).add(vec3(tipFlutter, tipFlutter.mul(0.5), tipFlutter));
    pos.addAssign(displacement);
    return pos;
  })();

  const deformedNormalNode = Fn(() => normalize(normalLocal));

  const polypMaterial = new THREE.MeshPhysicalNodeMaterial({
    roughness: 0.22,
    metalness: 0.0,
    ior: 1.40
  });

  polypMaterial.positionNode = deformedPositionNode;
  polypMaterial.normalNode = deformedNormalNode;

  const uvCoord = uv();
  const baseAlbedo = texture(baseAlbedoMap, uvCoord).rgb;
  const gfpMask = texture(gfpFluorescenceMap, uvCoord);

  polypMaterial.transmissionNode = float(0.55);
  polypMaterial.thicknessNode = mix(float(0.002), float(0.0008), vHeight);
  polypMaterial.attenuationColorNode = vec3(0.05, 0.65, 0.42);
  polypMaterial.attenuationDistanceNode = float(0.012);

  const fluorescenceColor = vec3(0.12, 0.95, 0.48).mul(uFluorescenceIntensity);
  const tipGlow = gfpMask.g.mul(vHeight).mul(2.5);
  const totalFluorescence = fluorescenceColor.mul(gfpMask.r.add(tipGlow));

  applyAquariumOptics(polypMaterial, {
    baseColorNode: baseAlbedo,
    fluorescenceColorNode: totalFluorescence,
    causticTex,
    waveNormalTex
  });

  return polypMaterial;
}
```

## src/shaders/aquariumEnvironment.js

```javascript
import {
  Fn, attribute, float, vec3,
  positionLocal, normalLocal, cameraPosition, time,
  sin, abs, mix, smoothstep, normalize, dot, If
} from 'three/tsl';

export function createAquariumGlassMaterial() {
  const glassMaterial = new THREE.MeshPhysicalNodeMaterial({
    roughness: 0.02,
    metalness: 0.05,
    transmission: 0.95,
    thickness: 0.015,
    ior: 1.52,
    transparent: true,
    opacity: 0.92
  });

  const viewDir = normalize(positionLocal.sub(cameraPosition));
  const ndotv = abs(dot(normalLocal, viewDir));
  const criticalAngleCos = float(0.66);

  const tirFactor = smoothstep(0.0, criticalAngleCos, ndotv);
  glassMaterial.reflectivityNode = mix(float(1.0), float(0.15), tirFactor);

  return glassMaterial;
}

export class MarineSnowParticleSystem {
  constructor(renderer, count = 3000) {
    this.renderer = renderer;
    this.count = count;

    const particleGeo = new THREE.PlaneGeometry(0.008, 0.008);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2.8;
      positions[i * 3 + 1] = Math.random() * 1.1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
      speeds[i] = 0.02 + Math.random() * 0.06;
    }

    const instancedGeo = new THREE.InstancedBufferGeometry();
    instancedGeo.index = particleGeo.index;
    instancedGeo.attributes.position = particleGeo.attributes.position;
    instancedGeo.attributes.uv = particleGeo.attributes.uv;
    instancedGeo.setAttribute('instancePos', new THREE.InstancedBufferAttribute(positions, 3));
    instancedGeo.setAttribute('instanceSpeed', new THREE.InstancedBufferAttribute(speeds, 1));

    this.geometry = instancedGeo;
    this.material = new THREE.MeshBasicNodeMaterial({
      color: 0xcceeff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.initParticleVertexShader();
  }

  initParticleVertexShader() {
    const basePos = attribute('instancePos', 'vec3');
    const speed = attribute('instanceSpeed', 'float');

    const advectedPositionNode = Fn(() => {
      const t = time.mul(0.4);
      const pos = basePos.toVar();
      const driftY = t.mul(speed).mod(1.2);
      pos.y.addAssign(driftY);

      If(pos.y.greaterThan(1.15), () => {
        pos.y.subAssign(1.15);
      });

      const wiggle = sin(t.mul(2.0).add(pos.x.mul(5.0))).mul(0.015);
      pos.x.addAssign(wiggle);

      return positionLocal.add(pos);
    })();

    this.material.positionNode = advectedPositionNode;
  }
}
```

## src/utils/sdfBaker.js

```javascript
import {
  Fn, uniform, int, ivec3, vec3, vec4, instanceIndex,
  textureLoad, textureStore,
  min, length, float, If
} from 'three/tsl';

export class WebGPUSDFBaker {
  constructor(renderer, resolution = 128) {
    this.renderer = renderer;
    this.res = resolution;

    this.jfaTexA = this.create3DStorageTexture();
    this.jfaTexB = this.create3DStorageTexture();
    this.outputSdfTex = new THREE.Data3DTexture(
      new Float32Array(this.res * this.res * this.res),
      this.res, this.res, this.res
    );
    this.outputSdfTex.format = THREE.RedFormat;
    this.outputSdfTex.type = THREE.FloatType;
    this.outputSdfTex.needsUpdate = true;

    this.initPipelines();
  }

  create3DStorageTexture() {
    const tex = new THREE.StorageTexture(this.res, this.res, this.res);
    tex.type = THREE.HalfFloatType;
    tex.format = THREE.RGBAFormat;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  initPipelines() {
    const resInt = int(this.res);
    const uStepWidth = uniform(1);

    const jfaStepKernel = Fn(([readTex, writeTex]) => {
      const idx = uint(instanceIndex);
      const x = idx.mod(resInt);
      const y = idx.div(resInt).mod(resInt);
      const z = idx.div(resInt * resInt);
      const coord = ivec3(x, y, z);

      const stepVal = uStepWidth.value;
      const myPos = vec3(float(x), float(y), float(z));

      const bestSeed = vec3(-1.0).toVar();
      const minDist = float(1e6).toVar();

      for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;

            const sampleCoord = coord.add(ivec3(dx, dy, dz).mul(stepVal));
            If(sampleCoord.x.greaterThanEqual(0).and(sampleCoord.x.lessThan(resInt))
              .and(sampleCoord.y.greaterThanEqual(0).and(sampleCoord.y.lessThan(resInt))
              .and(sampleCoord.z.greaterThanEqual(0).and(sampleCoord.z.lessThan(resInt)))), () => {
              
              const neighborData = textureLoad(readTex, sampleCoord);
              If(neighborData.w.greaterThanEqual(0.0), () => {
                const seedPos = neighborData.xyz;
                const d = length(seedPos.sub(myPos));
                If(d.lessThan(minDist), () => {
                  minDist.assign(d);
                  bestSeed.assign(seedPos);
                });
              });
            });
          }
        }
      }

      If(minDist.lessThan(1e5), () => {
        textureStore(writeTex, coord, vec4(bestSeed, minDist));
      }, () => {
        textureStore(writeTex, coord, vec4(-1.0, -1.0, -1.0, -1.0));
      });
    });

    this.stepKernelA = jfaStepKernel(this.jfaTexA, this.jfaTexB).compute(this.res * this.res * this.res);
    this.stepKernelB = jfaStepKernel(this.jfaTexB, this.jfaTexA).compute(this.res * this.res * this.res);
    this.uStepWidth = uStepWidth;
  }

  async bake() {
    const totalSteps = Math.log2(this.res);
    let step = Math.pow(2, Math.floor(Math.log2(this.res) - 1));

    let ping = true;
    for (let i = 0; i < totalSteps; i++) {
      this.uStepWidth.value = step;
      this.renderer.compute([ping ? this.stepKernelA : this.stepKernelB]);
      ping = !ping;
      step = Math.floor(step / 2);
      if (step < 1) step = 1;
    }
    return this.outputSdfTex;
  }
}
```

## scripts/optimizeAssets.sh

```bash
#!/bin/bash
# scripts/optimizeAssets.sh
# Requires: gltfpack (meshoptimizer), toktx (KTX-Software)

echo "Starting Open-Source Reef Asset Optimization Pipeline..."

mkdir -p public/models public/textures

for file in assets_raw/models/*.gltf; do
    filename=$(basename -- "$file")
    name="${filename%.*}"
    echo "Optimizing mesh: $name..."
    gltfpack -i "assets_raw/models/$filename" -o "public/models/$name.glb" -cc -tc -qi 10
done

for img in assets_raw/textures/*.png; do
    filename=$(basename -- "$img")
    name="${filename%.*}"
    echo "Compressing texture to KTX2: $name..."
    
    if [[ "$name" == *"normal"* ]] \vert{}\vert{} [[ "$name" == *"mask"* ]]; then
        toktx --t2 --uastc --genmipmap "public/textures/$name.ktx2" "$img"
    else
        toktx --t2 --genmipmap "public/textures/$name.ktx2" "$img"
    fi
done

echo "Asset Optimization Complete. Ready for WebGPU Three.js deployment."
```
