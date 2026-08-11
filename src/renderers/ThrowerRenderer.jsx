// src/renderers/ThrowerRenderer.jsx
// Shared hose-jet renderer for flamethrower, acidsprayer, cryocannon.
// Shape matches the classic flamethrower photo:
//   narrow coherent stream at the nozzle → long jet → wide flaring plume at the tip.
// All of that is configurable per-weapon; colours stay fully per-weapon.

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { throwerState } from '../ecs/weapons/weaponState/throwerState.js'
import { bossThrowerState } from '../ecs/weapons/weaponState/bossThrowerState.js'
import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/weapons/config/weapons.js'
import { bossAIQuery } from '../ecs/constants/queries.js'
import { BossAI } from '../ecs/constants/components.js'

const PARTICLE_SIZE = 64

// -------------------------
// Source adapters
// -------------------------

function getPlayerThrowerData() {
    const weapon = getWeapon(gameState.currentWeapon)
    const active = weapon?.category === 'thrower' && throwerState.active
    return {
        active,
        originX: throwerState.originX,
        originY: throwerState.originY,
        dirX: throwerState.dirX,
        dirY: throwerState.dirY,
        coneAngle: throwerState.coneAngle,
        range: throwerState.range ?? throwerState.length,
        weapon,
    }
}

function getBossThrowerData() {
    const bosses = bossAIQuery()
    if (bosses.length === 0) return { active: false, weapon: null }

    const weapon = getWeapon(BossAI.weapon[bosses[0]])
    const active = weapon?.category === 'thrower' && bossThrowerState.active

    return {
        active,
        originX: bossThrowerState.originX,
        originY: bossThrowerState.originY,
        dirX: bossThrowerState.dirX,
        dirY: bossThrowerState.dirY,
        coneAngle: bossThrowerState.coneAngle,
        range: bossThrowerState.range ?? bossThrowerState.length,
        weapon,
    }
}

const SOURCE_GETTERS = {
    player: getPlayerThrowerData,
    boss: getBossThrowerData,
}

// -------------------------
// GPGPU shaders
// -------------------------

const simVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const simFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPosTex;
  uniform vec2 uOrigin;
  uniform vec2 uDir;
  uniform float uConeAngle;      // max fan angle (radians)
  uniform float uRange;
  uniform float uDelta;
  uniform float uTime;
  uniform float uEmitting;
  uniform float uTurbulence;
  uniform float uSpeedMult;
  uniform float uMist;
  uniform float uTravelTime;     // seconds to cross full range
  uniform float uSpreadPower;    // >1 = stays narrow longer, then plumes hard (photo look)
  uniform float uCoreTightness;  // 0–1 how tightly the nozzle core is held

  vec2 curl(vec2 p) {
    float n1 = sin(p.y * 2.4 + uTime * 5.6);
    float n2 = cos(p.x * 2.4 - uTime * 5.6);
    float n3 = sin(p.x * 1.15 + p.y * 1.35 + uTime * 3.0);
    return vec2(n1 + 0.45 * n3, n2 - 0.45 * n3);
  }

  void main() {
    vec4 data = texture2D(uPosTex, vUv);
    vec2 pos  = data.xy;
    float life = data.z;
    float seed = data.w;

    // Life scaled so every stream (any speedMult) reaches the full range
    float maxLife = uTravelTime * (0.88 + seed * 0.24);

    if (life > 0.0) {
      float age = 1.0 - clamp(life / max(maxLife, 0.001), 0.0, 1.0);

      // -------------------------------------------------------
      // PHOTO SHAPE: narrow stream → sudden wide plume
      //
      // spreadT uses a power curve. Higher uSpreadPower keeps the
      // jet tight for longer, then opens aggressively near the tip
      // (exactly like the reference flamethrower image).
      // -------------------------------------------------------
      float spreadT = pow(age, uSpreadPower);
      // Core stays almost zero-width for the first portion of the jet
      float coreHold = mix(0.02, 0.12, 1.0 - uCoreTightness);
      float spread  = (seed - 0.5) * uConeAngle * (coreHold + (1.0 - coreHold) * spreadT);

      float ca = cos(spread);
      float sa = sin(spread);
      vec2 dir = vec2(uDir.x * ca - uDir.y * sa, uDir.x * sa + uDir.y * ca);

      // Cross full range in uTravelTime seconds
      float speed = uRange / max(uTravelTime, 0.05);

      // Turbulence almost zero near nozzle, strong only in the plume
      float turbRamp = pow(age, uSpreadPower * 0.85);
      float turbScale = uTurbulence * turbRamp * mix(1.0, 0.6, uMist);
      vec2 turbulence = curl(pos * 0.55 + seed * 3.8) * turbScale;

      // Radial push that also follows the same late-flare curve
      vec2 radial = vec2(-uDir.y, uDir.x) * (seed - 0.5) * spreadT * 1.35;

      pos += (dir * speed + turbulence + radial) * uDelta;

      life -= uDelta;
      if (life <= 0.0) life = -(0.012 + seed * 0.06);
    } else {
      life += uDelta;
      if (life >= 0.0) {
        if (uEmitting > 0.5) {
          // Extremely tight spawn → dense narrow hose core
          float j = 0.008 + (1.0 - uCoreTightness) * 0.01;
          vec2 jitter = vec2(
            sin(seed * 78.233 + uTime * 0.1),
            cos(seed * 45.164 - uTime * 0.07)
          ) * j;
          pos = uOrigin + jitter;
          life = maxLife;
        } else {
          life = -(0.02 + seed * 0.97);
        }
      }
    }

    gl_FragColor = vec4(pos, life, seed);
  }
`

const renderVertexShader = /* glsl */ `
  attribute vec2 particleUv;
  varying float vLife;
  varying float vSeed;
  uniform sampler2D uPosTex;
  uniform float uSize;
  uniform float uSizeMult;
  uniform float uTravelTime;
  uniform float uSpreadPower;

  void main() {
    vec4 data = texture2D(uPosTex, particleUv);
    vLife = data.z;
    vSeed = data.w;
    vec3 pos = vec3(data.xy, 0.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    float maxLife = uTravelTime * (0.88 + vSeed * 0.24);
    float age = clamp(1.0 - vLife / max(maxLife, 0.001), 0.0, 1.0);

    // Particles grow as they enter the plume (matches the photo’s thick tip)
    float flare = pow(age, uSpreadPower * 0.7);
    float ageGrow = mix(0.40, 1.75, flare);

    gl_PointSize = uSize * uSizeMult * ageGrow * (44.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const renderFragmentShader = /* glsl */ `
  precision highp float;
  varying float vLife;
  varying float vSeed;
  uniform vec3 uColorLow;
  uniform vec3 uColorMid;
  uniform vec3 uColorHigh;
  uniform float uFlicker;
  uniform float uMist;
  uniform float uTravelTime;

  void main() {
    if (vLife <= 0.0) discard;

    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float maxLife = uTravelTime * (0.88 + vSeed * 0.24);
    float t = clamp(vLife / max(maxLife, 0.001), 0.0, 1.0);
    float soft = smoothstep(0.5, 0.06, d);

    // Dense core for flame & acid
    float alphaFire = soft * clamp(t * 2.4, 0.0, 1.0) * mix(0.30, 0.98, t);
    // Softer for cryo (same silhouette)
    float alphaMist = soft * soft * clamp(t * 1.7, 0.0, 1.0) * mix(0.07, 0.44, t);

    float alpha = mix(alphaFire, alphaMist, uMist);

    vec3 color = mix(uColorLow, uColorMid, smoothstep(0.0, 0.28, t));
    color = mix(color, uColorHigh, smoothstep(0.42, 0.90, t));

    float flicker = 1.0 - uFlicker + uFlicker * (
      0.72 + 0.28 * sin(vSeed * 67.0 + t * 30.0 + vLife * 14.0)
    );
    color *= flicker;

    gl_FragColor = vec4(color, alpha);
  }
`

function createInitialPosTexture(size) {
  const data = new Float32Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    data[i * 4 + 0] = 0
    data[i * 4 + 1] = 0
    data[i * 4 + 2] = -Math.random() * 0.5
    data[i * 4 + 3] = Math.random()
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType)
  tex.needsUpdate = true
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  return tex
}

function createRenderTarget(size) {
  return new THREE.WebGLRenderTarget(size, size, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

// -------------------------
// Component
// -------------------------

export function ThrowerRenderer({ source = 'player', size = 10 }) {
  const { gl } = useThree()
  const getThrowerData = SOURCE_GETTERS[source]

  const simScene  = useMemo(() => new THREE.Scene(), [])
  const simCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])

  const initialPosTexture = useMemo(() => createInitialPosTexture(PARTICLE_SIZE), [])
  const rtA = useMemo(() => createRenderTarget(PARTICLE_SIZE), [])
  const rtB = useMemo(() => createRenderTarget(PARTICLE_SIZE), [])

  const readTexture  = useRef(initialPosTexture)
  const writeTarget  = useRef(rtA)
  const otherTarget  = useRef(rtB)

  const BLUE_BASE = useMemo(() => new THREE.Color('#0a1a2e'), [])

  const last = useRef({
    low:  new THREE.Color('#0a1a2e'),
    mid:  new THREE.Color('#1e4a6e'),
    high: new THREE.Color('#6eb6e8'),
    flicker: 0.1,
    mist: 0.0,
    sizeMult: 1.0,
    turbulence: 0.35,
    speedMult: 1.0,
    spreadPower: 2.2,      // higher = stays narrow longer, then plumes hard
    coreTightness: 0.85,   // 0–1 how tight the nozzle stream is
    _tmpLow:  new THREE.Color(),
    _tmpMid:  new THREE.Color(),
    _tmpHigh: new THREE.Color(),
  })

  const simMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:        { value: null },
      uOrigin:        { value: new THREE.Vector2() },
      uDir:           { value: new THREE.Vector2(0, 1) },
      uConeAngle:     { value: 0.55 },
      uRange:         { value: 6 },
      uDelta:         { value: 0 },
      uTime:          { value: 0 },
      uEmitting:      { value: 0 },
      uTurbulence:    { value: 0.35 },
      uSpeedMult:     { value: 1.0 },
      uMist:          { value: 0.0 },
      uTravelTime:    { value: 0.50 },
      uSpreadPower:   { value: 2.2 },
      uCoreTightness: { value: 0.85 },
    },
    vertexShader: simVertexShader,
    fragmentShader: simFragmentShader,
  }), [])

  useMemo(() => {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial)
    simScene.add(quad)
  }, [simScene, simMaterial])

  const renderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:      { value: null },
      uSize:        { value: size },
      uSizeMult:    { value: 1.0 },
      uColorLow:    { value: new THREE.Color('#0a1a2e') },
      uColorMid:    { value: new THREE.Color('#1e4a6e') },
      uColorHigh:   { value: new THREE.Color('#6eb6e8') },
      uFlicker:     { value: 0.1 },
      uMist:        { value: 0.0 },
      uTravelTime:  { value: 0.50 },
      uSpreadPower: { value: 2.2 },
    },
    vertexShader: renderVertexShader,
    fragmentShader: renderFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  }), [size])

  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const uv = new Float32Array(PARTICLE_SIZE * PARTICLE_SIZE * 2)
    const positions = new Float32Array(PARTICLE_SIZE * PARTICLE_SIZE * 3)

    let ptr = 0, posPtr = 0
    for (let y = 0; y < PARTICLE_SIZE; y++) {
      for (let x = 0; x < PARTICLE_SIZE; x++) {
        uv[ptr++] = (x + 0.5) / PARTICLE_SIZE
        uv[ptr++] = (y + 0.5) / PARTICLE_SIZE
        positions[posPtr++] = 0
        positions[posPtr++] = 0
        positions[posPtr++] = 0
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('particleUv', new THREE.BufferAttribute(uv, 2))
    return geo
  }, [])

  useFrame((state, delta) => {
    const { active, originX, originY, dirX, dirY, coneAngle, range, weapon } = getThrowerData()

    if (weapon && weapon.category === 'thrower') {
      const c = last.current

      c._tmpLow.set(weapon.haloColor  ?? '#1e4a6e')
      c._tmpMid.set(weapon.glowColor  ?? '#3a7a9e')
      c._tmpHigh.set(weapon.color     ?? '#6eb6e8')

      // Cool blue mixed into the dark base of every stream
      c.low.copy(c._tmpLow).multiplyScalar(0.55).lerp(BLUE_BASE, 0.35)
      c.mid.copy(c._tmpMid)
      c.high.copy(c._tmpHigh)

      c.flicker       = weapon.particleFlicker       ?? 0.1
      c.mist          = weapon.particleMist ? 1.0 : 0.0
      c.sizeMult      = weapon.particleSizeMult      ?? 1.0
      c.turbulence    = weapon.particleTurbulence    ?? 0.35
      c.speedMult     = weapon.particleSpeedMult     ?? 1.0
      // Shape controls (optional on the weapon; defaults give the photo look)
      c.spreadPower   = weapon.particleSpreadPower   ?? 2.2
      c.coreTightness = weapon.particleCoreTightness ?? 0.85
    }

    const c = last.current
    const travelTime = 0.50 / Math.max(c.speedMult, 0.12)

    // --- Simulation ---
    simMaterial.uniforms.uPosTex.value        = readTexture.current
    simMaterial.uniforms.uDelta.value         = Math.min(delta, 0.08)
    simMaterial.uniforms.uTime.value          = state.clock.elapsedTime
    simMaterial.uniforms.uOrigin.value.set(originX ?? 0, originY ?? 0)
    simMaterial.uniforms.uDir.value.set(dirX ?? 0, dirY ?? 1)
    // coneAngle = max width of the final plume
    simMaterial.uniforms.uConeAngle.value     = (coneAngle ?? 0.55) * 0.95
    simMaterial.uniforms.uRange.value         = range ?? 6
    simMaterial.uniforms.uEmitting.value      = active ? 1.0 : 0.0
    simMaterial.uniforms.uTurbulence.value    = c.turbulence
    simMaterial.uniforms.uSpeedMult.value     = c.speedMult
    simMaterial.uniforms.uMist.value          = c.mist
    simMaterial.uniforms.uTravelTime.value    = travelTime
    simMaterial.uniforms.uSpreadPower.value   = c.spreadPower
    simMaterial.uniforms.uCoreTightness.value = c.coreTightness

    // --- Render ---
    renderMaterial.uniforms.uColorLow.value.copy(c.low)
    renderMaterial.uniforms.uColorMid.value.copy(c.mid)
    renderMaterial.uniforms.uColorHigh.value.copy(c.high)
    renderMaterial.uniforms.uFlicker.value     = c.flicker
    renderMaterial.uniforms.uMist.value        = c.mist
    renderMaterial.uniforms.uSizeMult.value    = c.sizeMult
    renderMaterial.uniforms.uTravelTime.value  = travelTime
    renderMaterial.uniforms.uSpreadPower.value = c.spreadPower

    // GPGPU ping-pong
    const prevTarget = gl.getRenderTarget()
    gl.setRenderTarget(writeTarget.current)
    gl.render(simScene, simCamera)
    gl.setRenderTarget(prevTarget)

    readTexture.current = writeTarget.current.texture
    renderMaterial.uniforms.uPosTex.value = readTexture.current

    const tmp = writeTarget.current
    writeTarget.current = otherTarget.current
    otherTarget.current = tmp
  })

  return (
    <points
      geometry={pointsGeometry}
      material={renderMaterial}
      frustumCulled={false}
    />
  )
}