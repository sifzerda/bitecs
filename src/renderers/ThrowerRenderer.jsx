// src/renderers/ThrowerRenderer.jsx

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

function getPlayerThrowerData() {
    const weapon = getWeapon(gameState.currentWeapon)
    const active = weapon.category === "thrower" && throwerState.active
    return {
        active,
        originX: throwerState.originX,
        originY: throwerState.originY,
        dirX: throwerState.dirX,
        dirY: throwerState.dirY,
        coneAngle: throwerState.coneAngle,
        range: throwerState.range,
        weapon,
    }
}

function getBossThrowerData() {
    const bosses = bossAIQuery()
    if (bosses.length === 0) return { active: false, weapon: null }

    const weapon = getWeapon(BossAI.weapon[bosses[0]])
    const active = weapon.category === "thrower" && bossThrowerState.active

    return {
        active,
        originX: bossThrowerState.originX,
        originY: bossThrowerState.originY,
        dirX: bossThrowerState.dirX,
        dirY: bossThrowerState.dirY,
        coneAngle: bossThrowerState.coneAngle,
        range: bossThrowerState.length,
        weapon,
    }
}

const SOURCE_GETTERS = {
    player: getPlayerThrowerData,
    boss: getBossThrowerData,
}

// -------------------------------------------------------------
// Sim — thin jet → long stream → strong plume-out
// -------------------------------------------------------------

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
  uniform float uConeAngle;
  uniform float uRange;
  uniform float uDelta;
  uniform float uTime;
  uniform float uEmitting;
  uniform float uTurbulence;
  uniform float uSpeedMult;

  vec2 curl(vec2 p) {
    float n1 = sin(p.y * 0.9 + uTime * 3.8);
    float n2 = cos(p.x * 0.9 - uTime * 3.8);
    return vec2(n1, n2);
  }

  void main() {
    vec4 data = texture2D(uPosTex, vUv);

    vec2 pos = data.xy;
    float life = data.z;
    float seed = data.w;

    // longer life so the stream stretches far
    float lifespan = 0.75 + seed * 0.55;   // ~0.75–1.3 s

    if (life > 0.0) {
      life -= uDelta;

      float age = 1.0 - clamp(life / lifespan, 0.0, 1.0);

      // --- thin at the nozzle, wide at the tip ---
      // early age: very small cone
      // late age: strong plume-out
      float baseSpread = (seed - 0.5) * uConeAngle * 0.35;          // tight start
      float plume = baseSpread * (1.0 + age * age * 6.5);           // expands hard later

      float ca = cos(plume);
      float sa = sin(plume);
      vec2 dir = vec2(
        uDir.x * ca - uDir.y * sa,
        uDir.x * sa + uDir.y * ca
      );

      // fast forward speed so the jet is long
      float speed = (uRange / 0.38) * uSpeedMult * (1.25 - age * 0.4);

      // turbulence mostly at the tip (plume breakup)
      vec2 turbulence = curl(pos * 0.55 + seed * 2.5)
                      * uTurbulence
                      * (0.15 + age * age * 1.8);

      // lateral spray that only kicks in mid→late
      vec2 right = vec2(-uDir.y, uDir.x);
      float lateralAmt = (seed - 0.5) * age * age * 3.8;
      vec2 lateral = right * lateralAmt;

      pos += (dir * speed + turbulence + lateral) * uDelta;

      if (life <= 0.0) {
        life = -(0.02 + seed * 0.12);
      }
    } else {
      life += uDelta;

      if (life >= 0.0) {
        if (uEmitting > 0.5) {
          // very tight spawn at the nozzle
          vec2 jitter = vec2(
            sin(seed * 78.233),
            cos(seed * 45.164)
          ) * 0.018;

          pos = uOrigin + jitter;
          life = lifespan;
        } else {
          life = -(0.02 + seed * 0.99);
        }
      }
    }

    gl_FragColor = vec4(pos, life, seed);
  }
`

// -------------------------------------------------------------
// Render — small near nozzle, large soft plume at the tip
// -------------------------------------------------------------

const renderVertexShader = /* glsl */ `
  attribute vec2 particleUv;
  varying float vLife;
  varying float vSeed;
  varying float vAge;

  uniform sampler2D uPosTex;
  uniform float uSize;
  uniform float uSizeMult;

  void main() {
    vec4 data = texture2D(uPosTex, particleUv);

    vLife = data.z;
    vSeed = data.w;

    float lifespan = 0.75 + vSeed * 0.55;
    float lifeFrac = clamp(vLife / lifespan, 0.0, 1.0);
    vAge = 1.0 - lifeFrac;

    vec3 pos = vec3(data.xy, 0.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // thin near emission, big soft puffs at the plume
    float ageGrow = mix(0.35, 2.6, vAge * vAge);
    float sizeVar = mix(0.85, 1.2, fract(vSeed * 17.3));

    gl_PointSize = uSize * uSizeMult * ageGrow * sizeVar * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const renderFragmentShader = /* glsl */ `
  precision highp float;

  varying float vLife;
  varying float vSeed;
  varying float vAge;

  uniform vec3 uColorLow;
  uniform vec3 uColorMid;
  uniform vec3 uColorHigh;
  uniform float uFlicker;
  uniform float uMist;

  void main() {
    if (vLife <= 0.0) discard;

    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float soft = smoothstep(0.5, 0.0, d);

    // bright dense core near nozzle → softer billowy tip
    float nearBoost = mix(1.15, 0.25, vAge);

    float alphaFire = soft * nearBoost * mix(0.85, 0.18, vAge);
    float alphaMist = soft * nearBoost * mix(0.45, 0.1, vAge) * soft;
    float alpha = mix(alphaFire, alphaMist, uMist);

    // white-hot near nozzle → orange → deep red/black at the tip
    vec3 color = mix(uColorHigh, uColorMid, smoothstep(0.0, 0.3, vAge));
    color = mix(color, uColorLow, smoothstep(0.45, 1.0, vAge));

    float flicker = 1.0 - uFlicker + uFlicker * (
      0.88 + 0.12 * sin(vSeed * 53.0 + vAge * 16.0)
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

export function ThrowerRenderer({ source = 'player', size = 10 }) {
  const { gl } = useThree()
  const getThrowerData = SOURCE_GETTERS[source]

  const simScene = useMemo(() => new THREE.Scene(), [])
  const simCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])

  const initialPosTexture = useMemo(() => createInitialPosTexture(PARTICLE_SIZE), [])
  const rtA = useMemo(() => createRenderTarget(PARTICLE_SIZE), [])
  const rtB = useMemo(() => createRenderTarget(PARTICLE_SIZE), [])

  const readTexture = useRef(initialPosTexture)
  const writeTarget = useRef(rtA)
  const otherTarget = useRef(rtB)

  const simMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex: { value: null },
      uOrigin: { value: new THREE.Vector2() },
      uDir: { value: new THREE.Vector2(0, 1) },
      uConeAngle: { value: 0.6 },
      uRange: { value: 6 },
      uDelta: { value: 0 },
      uTime: { value: 0 },
      uEmitting: { value: 0 },
      uTurbulence: { value: 0.35 },
      uSpeedMult: { value: 1.0 },
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
      uPosTex: { value: null },
      uSize: { value: size },
      uSizeMult: { value: 1.0 },
      uColorLow: { value: new THREE.Color('#25100a') },
      uColorMid: { value: new THREE.Color('#ff6600') },
      uColorHigh: { value: new THREE.Color('#ffe895') },
      uFlicker: { value: 0.15 },
      uMist: { value: 0.0 },
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

    let ptr = 0
    let posPtr = 0
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

    simMaterial.uniforms.uPosTex.value = readTexture.current
    simMaterial.uniforms.uDelta.value = Math.min(delta, 0.1)
    simMaterial.uniforms.uTime.value = state.clock.elapsedTime
    simMaterial.uniforms.uOrigin.value.set(originX ?? 0, originY ?? 0)
    simMaterial.uniforms.uDir.value.set(dirX ?? 0, dirY ?? 1)
    simMaterial.uniforms.uConeAngle.value = coneAngle ?? 0.6
    simMaterial.uniforms.uRange.value = range ?? 6
    simMaterial.uniforms.uEmitting.value = active ? 1 : 0
    simMaterial.uniforms.uTurbulence.value = weapon?.particleTurbulence ?? 0.35
    simMaterial.uniforms.uSpeedMult.value = weapon?.particleSpeedMult ?? 1.0

    renderMaterial.uniforms.uColorLow.value.set(weapon?.haloColor ?? '#331100').multiplyScalar(0.6)
    renderMaterial.uniforms.uColorMid.value.set(weapon?.glowColor ?? '#ff6600')
    renderMaterial.uniforms.uColorHigh.value.set(weapon?.color ?? '#ffe895')
    renderMaterial.uniforms.uFlicker.value = weapon?.particleFlicker ?? 0.15
    renderMaterial.uniforms.uMist.value = weapon?.particleMist ? 1.0 : 0.0
    renderMaterial.uniforms.uSizeMult.value = weapon?.particleSizeMult ?? 1.0

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
    <points geometry={pointsGeometry} material={renderMaterial} frustumCulled={false} />
  )
}