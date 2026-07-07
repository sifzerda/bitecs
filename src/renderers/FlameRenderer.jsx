// src/renderers/FlameRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { flameState } from '../state/flameState.js'
import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/constants/weapons.js'

const PARTICLE_SIZE = 64 // 64x64 = 4,096 particles — plenty for a flame stream

// ---------------------------------------------------------------------------
// GPGPU shaders
// ---------------------------------------------------------------------------

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

  vec2 curl(vec2 p) {
    float n1 = sin(p.y * 1.5 + uTime * 6.0);
    float n2 = cos(p.x * 1.5 - uTime * 6.0);
    return vec2(n1, n2);
  }

  void main() {
    vec4 data = texture2D(uPosTex, vUv);

    vec2 pos = data.xy;
    float life = data.z; // > 0: actively flying. <= 0: dormant, counting up toward 0.
    float seed = data.w;

    if (life > 0.0) {
      // active — age it and push it outward along its own fixed spread angle
      life -= uDelta;

      float spread = (seed - 0.5) * uConeAngle;
      float ca = cos(spread);
      float sa = sin(spread);
      vec2 dir = vec2(uDir.x * ca - uDir.y * sa, uDir.x * sa + uDir.y * ca);

      float speed = uRange / 0.5; // matches average spawn lifetime below
      vec2 turbulence = curl(pos) * 0.35;

      pos += (dir * speed + turbulence) * uDelta;

      if (life <= 0.0) {
        life = -(0.02 + seed * 0.10); // short stagger before it's eligible again
      }
    } else {
      // dormant — count up toward zero
      life += uDelta;

      if (life >= 0.0) {
        if (uEmitting > 0.5) {
          vec2 jitter = vec2(sin(seed * 78.233), cos(seed * 45.164)) * 0.04;
          pos = uOrigin + jitter;
          life = 0.35 + seed * 0.35; // ~0.35–0.70s outward lifetime
        } else {
          life = -(0.02 + seed * 0.15);
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

  void main() {
    vec4 data = texture2D(uPosTex, particleUv);

    vLife = data.z;
    vSeed = data.w;

    vec3 pos = vec3(data.xy, 0.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // grows slightly as it ages (young = tight ember, old = puffy dissipating smoke)
    float ageGrow = mix(0.6, 1.4, clamp(1.0 - vLife / 0.7, 0.0, 1.0));

    gl_PointSize = uSize * ageGrow * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const renderFragmentShader = /* glsl */ `
  precision highp float;
  varying float vLife;
  varying float vSeed;

  void main() {
    if (vLife <= 0.0) discard;

    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float t = clamp(vLife / 0.6, 0.0, 1.0); // 1 = just spawned (hot), 0 = dying (cool)

    float soft = smoothstep(0.5, 0.0, d);
    float alpha = soft * clamp(vLife * 3.0, 0.0, 1.0) * mix(0.25, 0.85, t);

    // heat gradient: dark ember smoke -> orange -> white-hot core
    vec3 smoke  = vec3(0.25, 0.06, 0.03);
    vec3 orange = vec3(1.0, 0.42, 0.05);
    vec3 hot    = vec3(1.0, 0.92, 0.55);

    vec3 color = mix(smoke, orange, smoothstep(0.0, 0.4, t));
    color = mix(color, hot, smoothstep(0.55, 0.9, t));

    // tiny per-particle flicker so the flame reads as alive, not static
    float flicker = 0.85 + 0.15 * sin(vSeed * 53.0 + t * 20.0);
    color *= flicker;

    gl_FragColor = vec4(color, alpha);
  }
`

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function createInitialPosTexture(size) {
  const data = new Float32Array(size * size * 4)

  for (let i = 0; i < size * size; i++) {
    data[i * 4 + 0] = 0
    data[i * 4 + 1] = 0
    data[i * 4 + 2] = -Math.random() * 0.5 // dormant, staggered countdown
    data[i * 4 + 3] = Math.random()        // seed
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

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------

export function FlameRenderer({ size = 10 }) {
  const { gl } = useThree()

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

    const weapon = getWeapon(gameState.currentWeapon)
    const active = weapon.category === "flame" && flameState.active

    simMaterial.uniforms.uPosTex.value = readTexture.current
    simMaterial.uniforms.uDelta.value = Math.min(delta, 0.1)
    simMaterial.uniforms.uTime.value = state.clock.elapsedTime
    simMaterial.uniforms.uOrigin.value.set(flameState.originX, flameState.originY)
    simMaterial.uniforms.uDir.value.set(flameState.dirX, flameState.dirY)
    simMaterial.uniforms.uConeAngle.value = flameState.coneAngle
    simMaterial.uniforms.uRange.value = flameState.range
    simMaterial.uniforms.uEmitting.value = active ? 1 : 0

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