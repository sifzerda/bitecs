// src/renderers/ThrowerRenderer.jsx

import * as THREE from "three"
import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { world } from "../ecs/constants/world.js"
import { useGameStore, SCREEN } from "../../store/gameStore.js"
import { throwerState } from "../ecs/weapons/weaponState/throwerState.js"
import { bossThrowerState } from "../ecs/weapons/weaponState/bossThrowerState.js"
import { startState } from "../state/startState.js"
import { getWeapon } from "../ecs/weapons/config/weapons.js"
import { bossAIQuery } from "../ecs/constants/queries.js"
import { BossAI } from "../ecs/constants/components.js"

const PARTICLE_SIZE = 64

// ============================================================
// SOURCE DATA
// ============================================================

function getPlayerThrowerData() {
  const weapon = getWeapon(startState.currentWeapon)

  return {
    state: throwerState,
    weapon,

    active: weapon?.category === "thrower" && throwerState.active,
  }
}

function getBossThrowerData() {
  const bosses = bossAIQuery()

  // Match the boss system's selection of the first thrower boss,
  // rather than assuming the first boss uses a thrower.
  for (let i = 0; i < bosses.length; i++) {
    const weapon = getWeapon(
      BossAI.weapon[bosses[i]]
    )

    if (weapon?.category === "thrower") {
      return {
        state: bossThrowerState,
        weapon,
        active: bossThrowerState.active,
      }
    }
  }

  return {
    state: bossThrowerState,
    weapon: null,
    active: false,
  }
}

// ============================================================
// SIMULATION SHADERS
// ============================================================

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

  uniform vec2 uOriginA;
  uniform vec2 uOriginB;
  uniform vec2 uDir;

  uniform float uConeAngle;
  uniform float uRange;

  uniform float uDelta;
  uniform float uTime;
  uniform float uEmitting;

  uniform float uTurbulence;
  uniform float uMist;
  uniform float uTravelTime;
  uniform float uSpreadPower;
  uniform float uCoreTightness;

  vec2 curl(vec2 p) {
    float n1 = sin(p.y * 2.4 + uTime * 5.6);
    float n2 = cos(p.x * 2.4 - uTime * 5.6);
    float n3 = sin(p.x * 1.15 + p.y * 1.35 + uTime * 3.0);

    return vec2(n1 + 0.45 * n3, n2 - 0.45 * n3);
  }

  void main() {
    vec4 data = texture2D(uPosTex, vUv);

    vec2 pos = data.xy;
    float life = data.z;
    float seed = data.w;

    float maxLife = uTravelTime * (0.88 + seed * 0.24);

    if (life > 0.0) {
      float age = 1.0 - clamp(life / max(maxLife, 0.001), 0.0, 1.0);

      float spreadT = pow(age, uSpreadPower);
      float coreHold = mix(0.02, 0.12, 1.0 - uCoreTightness);

      float spread = (seed - 0.5) * uConeAngle * (coreHold + (1.0 - coreHold) * spreadT);

      float ca = cos(spread);
      float sa = sin(spread);

      vec2 dir = vec2(uDir.x * ca - uDir.y * sa, uDir.x * sa + uDir.y * ca);

      float speed = uRange / max(uTravelTime, 0.05);
      float turbRamp = pow(age, uSpreadPower * 0.85);
      float turbScale = uTurbulence * turbRamp * mix(1.0, 0.6, uMist);

      vec2 turbulence = curl(pos * 0.55 + seed * 3.8) * turbScale;
      vec2 radial = vec2(-uDir.y, uDir.x) * (seed - 0.5) * spreadT * 1.35;

      pos += (dir * speed + turbulence + radial) * uDelta;

      life -= uDelta;

      if (life <= 0.0) {
        life = -(0.012 + seed * 0.06);
      }
    } else {
      life += uDelta;

      if (life >= 0.0) {
        if (uEmitting > 0.5) {
       
        float j = 0.008 + (1.0 - uCoreTightness) * 0.01;

          vec2 jitter = vec2(sin(seed * 78.233 + uTime * 0.1), cos(seed * 45.164 - uTime * 0.07)) * j;
          vec2 origin = fract(seed * 173.11) < 0.5 ? uOriginA : uOriginB;

          pos = origin + jitter;
          life = maxLife;
        } else {
          life = -(0.02 + seed * 0.97);
        }
      }
    }

    gl_FragColor = vec4(pos, life, seed);
  }
`

// ============================================================
// DISPLAY SHADERS
// ============================================================

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

    vec4 mvPosition = modelViewMatrix * vec4(data.xy, 0.0, 1.0);

    float maxLife = uTravelTime * (0.88 + vSeed * 0.24);
    float age = clamp(1.0 - vLife / max(maxLife, 0.001), 0.0, 1.0);

    float flare = pow(age, uSpreadPower * 0.7);

    float ageGrow = mix(0.40, 1.75, flare);

    gl_PointSize = uSize * uSizeMult * ageGrow * (44.0 / max(-mvPosition.z, 0.001));

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
    if (vLife <= 0.0) {
      discard;
    }

    float d = length(gl_PointCoord - vec2(0.5));

    if (d > 0.5) {
      discard;
    }

    float maxLife = uTravelTime * (0.88 + vSeed * 0.24);
    float t = clamp(vLife / max(maxLife, 0.001), 0.0, 1.0);
    float soft = 1.0 - smoothstep(0.06, 0.5, d);
    float alphaFire = soft * clamp(t * 2.4, 0.0, 1.0) * mix(0.30, 0.98, t);

    float alphaMist = soft * soft * clamp(t * 1.7, 0.0, 1.0) * mix(0.07, 0.44, t);
    float alpha = mix(alphaFire, alphaMist, uMist);

    vec3 color = mix(uColorLow, uColorMid, smoothstep(0.0, 0.28, t));

    color = mix(color, uColorHigh, smoothstep(0.42, 0.90, t));

    float flicker = 1.0 - uFlicker + uFlicker * (0.72 + 0.28 * sin(vSeed * 67.0 + t * 30.0 + vLife * 14.0));

    gl_FragColor = vec4(color * flicker, alpha);
  }
`

// ============================================================
// GPU RESOURCES
// ============================================================

function createInitialPosTexture(size) {
  const data = new Float32Array(
    size * size * 4
  )

  for (let i = 0; i < size * size; i++) {
    const offset = i * 4

    data[offset] = 0
    data[offset + 1] = 0

    // Stagger births to avoid one synchronised burst.
    data[offset + 2] = -Math.random() * 0.5
    data[offset + 3] = Math.random()
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType)

  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter

  texture.generateMipmaps = false
  texture.needsUpdate = true

  return texture
}

function createRenderTarget(size) {
  return new THREE.WebGLRenderTarget(
    size,
    size,
    {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,

      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,

      depthBuffer: false,
      stencilBuffer: false,

      generateMipmaps: false,
    }
  )
}

function createResources() {
  const initialTexture = createInitialPosTexture(PARTICLE_SIZE)
  const targetA = createRenderTarget(PARTICLE_SIZE)
  const targetB = createRenderTarget(PARTICLE_SIZE)

  const simMaterial = new THREE.ShaderMaterial({
    vertexShader: simVertexShader,
    fragmentShader: simFragmentShader,

    // This pass writes particle data, not visible colour.
    blending: THREE.NoBlending,
    transparent: false,

    depthTest: false,
    depthWrite: false,
    toneMapped: false,

    uniforms: {
      uPosTex: { value: initialTexture },

      uOriginA: {
        value: new THREE.Vector2(),
      },

      uOriginB: {
        value: new THREE.Vector2(),
      },

      uDir: {
        value: new THREE.Vector2(0, 1),
      },

      uConeAngle: { value: 0.55 },
      uRange: { value: 6 },

      uDelta: { value: 0 },
      uTime: { value: 0 },
      uEmitting: { value: 0 },

      uTurbulence: { value: 0.35 },
      uMist: { value: 0 },

      uTravelTime: { value: 0.5 },
      uSpreadPower: { value: 2.2 },
      uCoreTightness: { value: 0.85 },
    },
  })

  const renderMaterial = new THREE.ShaderMaterial({
    vertexShader: renderVertexShader,
    fragmentShader: renderFragmentShader,

    transparent: true,

    depthWrite: false,
    depthTest: false,

    blending: THREE.AdditiveBlending,
    toneMapped: false,

    uniforms: {
      uPosTex: { value: initialTexture },

      uSize: { value: 10 },
      uSizeMult: { value: 1 },

      uColorLow: {
        value: new THREE.Color("#0a1a2e"),
      },

      uColorMid: {
        value: new THREE.Color("#1e4a6e"),
      },

      uColorHigh: {
        value: new THREE.Color("#6eb6e8"),
      },

      uFlicker: { value: 0.1 },
      uMist: { value: 0 },

      uTravelTime: { value: 0.5 },
      uSpreadPower: { value: 2.2 },
    },
  })

  const pointsGeometry = new THREE.BufferGeometry()
  const particleCount = PARTICLE_SIZE * PARTICLE_SIZE
  const positions = new Float32Array(particleCount * 3)
  const particleUvs = new Float32Array(particleCount * 2)

  let offset = 0

  for (let y = 0; y < PARTICLE_SIZE; y++) {
    for (let x = 0; x < PARTICLE_SIZE; x++) {

      particleUvs[offset++] = (x + 0.5) / PARTICLE_SIZE
      particleUvs[offset++] = (y + 0.5) / PARTICLE_SIZE
    }
  }

  pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  pointsGeometry.setAttribute("particleUv", new THREE.BufferAttribute(particleUvs, 2))

  const quadGeometry = new THREE.PlaneGeometry(2, 2)
  const quad = new THREE.Mesh(quadGeometry, simMaterial)

  quad.frustumCulled = false

  const scene = new THREE.Scene()
  scene.add(quad)

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  return {
    initialTexture,

    targetA,
    targetB,

    readTexture: initialTexture,
    writeTarget: targetA,
    otherTarget: targetB,

    simMaterial,
    renderMaterial,
    pointsGeometry,

    scene,
    camera,

    time: 0,

    dispose() {
      scene.remove(quad)

      quadGeometry.dispose()
      pointsGeometry.dispose()

      simMaterial.dispose()
      renderMaterial.dispose()

      initialTexture.dispose()
      targetA.dispose()
      targetB.dispose()
    },
  }
}

// ============================================================
// COMPONENT
// ============================================================

export function ThrowerRenderer({
  source = "player",
  size = 10,
}) {
  const { gl } = useThree()

  const pointsRef = useRef(null)
  const resourcesRef = useRef(null)

  const colors = useMemo(() => ({
    blueBase: new THREE.Color("#0a1a2e"),
    temporary: new THREE.Color(),
  }), [])

  // Create and dispose one complete resource set per mount.
  // StrictMode's effect replay gets fresh resources.
  useEffect(() => {
    const resources = createResources()
    const points = pointsRef.current

    resourcesRef.current = resources

    if (points) {
      points.geometry = resources.pointsGeometry
      points.material = resources.renderMaterial
    }

    return () => {
      resourcesRef.current = null

      if (points) {
        points.visible = false
      }

      resources.dispose()
    }
  }, [])

  useFrame((_, frameDelta) => {
    const resources = resourcesRef.current
    const points = pointsRef.current

    if (!resources || !points) return

    const game = useGameStore.getState()

    if (game.screen !== SCREEN.PLAY) {
      points.visible = false
      return
    }

    // Leave the existing particle image frozen while paused.
    if (game.paused) return

    const delta = Math.min(Math.max(frameDelta, 0), 0.05)

    if (delta === 0) return

    resources.time += delta

    const data = source === "boss" ? getBossThrowerData() : getPlayerThrowerData()

    const state = data.state
    const weapon = data.weapon
    const sim = resources.simMaterial.uniforms
    const render = resources.renderMaterial.uniforms

    // Retain the last weapon's appearance while its
    // remaining particles fade after a weapon switch.
    if (weapon?.category === "thrower") {
      const speedMultiplier = Math.max(weapon.particleSpeedMult ?? 1, 0.12)
      const travelTime = 0.5 / speedMultiplier

      sim.uTravelTime.value = travelTime
      render.uTravelTime.value = travelTime
      sim.uTurbulence.value = weapon.particleTurbulence ?? 0.35
      sim.uMist.value = weapon.particleMist ? 1 : 0
      sim.uSpreadPower.value = Math.max(0.1, weapon.particleSpreadPower ?? 2.2)

      sim.uCoreTightness.value = THREE.MathUtils.clamp(weapon.particleCoreTightness ?? 0.85, 0, 1)

      render.uMist.value = sim.uMist.value
      render.uSpreadPower.value = sim.uSpreadPower.value
      render.uSizeMult.value = weapon.particleSizeMult ?? 1
      render.uFlicker.value = weapon.particleFlicker ?? 0.1

      render.uColorLow.value
        .set(weapon.haloColor ?? "#1e4a6e")
        .multiplyScalar(0.55)
        .lerp(colors.blueBase, 0.35)

      render.uColorMid.value.set(weapon.glowColor ?? "#3a7a9e")
      render.uColorHigh.value.set(weapon.color ?? "#6eb6e8")
    }

    render.uSize.value = size

    sim.uPosTex.value = resources.readTexture
    sim.uDelta.value = delta
    sim.uTime.value = resources.time

    // The gameplay system owns whether firing is active.
    // Do not apply a second encounter-phase gate here.
    sim.uEmitting.value = data.active ? 1 : 0

    // Keep the last valid direction/origins while the
    // residual stream finishes after firing stops.
    if (data.active) {
      sim.uOriginA.value.set(state.originAX ?? state.originX ?? 0, state.originAY ?? state.originY ?? 0)
      sim.uOriginB.value.set(state.originBX ?? state.originX ?? 0, state.originBY ?? state.originY ?? 0)

      const dirX = state.dirX ?? 0
      const dirY = state.dirY ?? 1

      if (dirX * dirX + dirY * dirY > 1e-8) {
        sim.uDir.value
          .set(dirX, dirY)
          .normalize()
      }

      sim.uConeAngle.value = (state.coneAngle ?? 0.55) * 0.95
      sim.uRange.value = Math.max(0, state.range ?? state.length ?? 6)
    }

    const previousTarget = gl.getRenderTarget()
    const previousAutoClear = gl.autoClear

    try {
      gl.autoClear = true

      gl.setRenderTarget(resources.writeTarget)
      gl.render(resources.scene, resources.camera)

    } finally {
      gl.setRenderTarget(previousTarget)
      gl.autoClear = previousAutoClear
    }

    resources.readTexture = resources.writeTarget.texture
    render.uPosTex.value = resources.readTexture
    const completedTarget = resources.writeTarget
    resources.writeTarget = resources.otherTarget
    resources.otherTarget = completedTarget

    points.visible = true
  })

  return (
    <points
      ref={pointsRef}
      visible={false}
      frustumCulled={false}
      dispose={null}
    />
  )
}