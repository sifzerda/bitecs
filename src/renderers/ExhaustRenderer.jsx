// src/renderers/ExhaustRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Position, Velocity, Rotation } from '../ecs/constants/components.js'
import { playerQuery } from '../ecs/constants/queries.js'
import { input } from '../ecs/systems/input.js'
import { gameState } from '../state/gameState.js'

const PARTICLE_SIZE = 128

// ---------------------------------------------------------------------------
// GPGPU shaders
// ---------------------------------------------------------------------------

const simVertexShader = /* glsl */
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const simFragmentShader = /* glsl */
  `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uPosTex;
  uniform vec2 uShipPos;
  uniform vec2 uShipVel;
  uniform float uShipRot;
  uniform float uDelta;
  uniform float uTime;
  uniform float uEmitting;
  uniform float uBoost;

  vec2 curl(vec2 p) {
    float n1 = sin(p.y * 0.05 + uTime * 1.5);
    float n2 = cos(p.x * 0.05 - uTime * 1.5);
    return vec2(n1, n2);
  }

  void main() {
    vec4 data = texture2D(uPosTex, vUv);

    vec2 pos = data.xy;
    float life = data.z;
    float seed = data.w;

    float engineSide = seed < 0.5 ? -1.0 : 1.0;

    vec2 backward = vec2(-sin(uShipRot), cos(uShipRot));
    vec2 right = vec2(cos(uShipRot), sin(uShipRot));

    if (life > 0.0) {

      life -= uDelta;

      float lifespan = 0.5 + seed * 0.5;
      float age = 1.0 - clamp(life / lifespan, 0.0, 1.0);

      vec2 expand = right * engineSide * age * mix(0.9, 1.6, uBoost);
      float velFade = 1.0 - smoothstep(0.0, 0.35, age);

      // extra backward punch while boosting, so the jet visibly stretches out
      vec2 boostKick = -backward * uBoost * 4.0 * velFade;

      vec2 exhaustVel = -uShipVel * 0.85 * velFade + curl(pos) * 1.5 + expand + boostKick;

      pos += exhaustVel * uDelta;

      if (life <= 0.0) {
        life = -(0.05 + seed * 0.35);
      }
    } else {

      life += uDelta;

      if (life >= 0.0) {
        if (uEmitting > 0.5) {

          float exhaustOffset = -0.70;
          float engineGap = 0.15;
          float subSeed = fract(seed * 91.345);
          float nozzleJitter = (subSeed - 0.5) * 0.06;

          float engineOffset = engineSide * engineGap + nozzleJitter;

          pos = uShipPos + backward * exhaustOffset + right * engineOffset;

          // slightly shorter-lived particles during boost — snappier, faster stream
          float lifeMix = mix(1.0, 0.75, uBoost);
          life = (0.5 + seed * 0.5) * lifeMix;
        } else {
          life = -(0.05 + seed * 0.90);
        }
      }
    }

    gl_FragColor = vec4(pos, life, seed);
  }
`

const renderVertexShader = /* glsl */
  `
  attribute vec2 particleUv;
  varying float vLife;
  varying float vAge;

  uniform sampler2D uPosTex;
  uniform float uSize;
  uniform float uBoost;

  void main() {
    vec4 data = texture2D(uPosTex, particleUv);

    vLife = data.z;
    float seed = data.w;
    float lifespan = 0.5 + seed * 0.5;
    vAge = 1.0 - clamp(vLife / lifespan, 0.0, 1.0);

    vec3 pos = vec3(data.xy, 0.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    float sizeBoost = mix(1.0, 1.4, uBoost);
    gl_PointSize = uSize * sizeBoost * mix(0.3, 1.0, clamp(vLife, 0.0, 1.0)) * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const renderFragmentShader = /* glsl */
  `
  precision highp float;
  varying float vLife;
  varying float vAge;
  uniform float uBoost;

  void main() {
    if (vLife <= 0.0) discard;

    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float alpha = smoothstep(0.5, 0.0, d) * clamp(vLife, 0.0, 1.0) * 0.15;

    vec3 hotCore   = vec3(1.0, 0.15, 0.08);
    vec3 fireColor = vec3(1.0, 0.2, 0.05);
    vec3 smokeColor = vec3(0.02, 0.75, 1.0);
    vec3 color = mix(hotCore, fireColor, smoothstep(0.0, 0.15, vAge));
    color = mix(color, smokeColor, smoothstep(0.15, 1.0, vAge));

    // boost override — whole stream shifts toward an intense saturated blue
    vec3 boostColor = vec3(0.05, 0.25, 1.0);
    color = mix(color, boostColor, uBoost);
    alpha *= mix(1.0, 1.6, uBoost);

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

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------

export function ExhaustRenderer({ size = 4 }) {
  const { gl } = useThree()

  const simScene = useMemo(() => new THREE.Scene(), [])
  const simCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])

  const initialPosTexture = useMemo(() => createInitialPosTexture(PARTICLE_SIZE), [])
  const rtA = useMemo(() => createRenderTarget(PARTICLE_SIZE), [])
  const rtB = useMemo(() => createRenderTarget(PARTICLE_SIZE), [])

  const readTexture = useRef(initialPosTexture)
  const writeTarget = useRef(rtA)
  const otherTarget = useRef(rtB)

  const playerId = useRef(-1)
  const boostSmooth = useRef(0)

  const simMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex: { value: null },
      uShipPos: { value: new THREE.Vector2() },
      uShipVel: { value: new THREE.Vector2() },
      uShipRot: { value: 0 },
      uDelta: { value: 0 },
      uTime: { value: 0 },
      uEmitting: { value: 0 },
      uBoost: { value: 0 },
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
      uBoost: { value: 0 },
    },
    vertexShader: renderVertexShader,
    fragmentShader: renderFragmentShader,
    transparent: true,
    depthWrite: false,
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
    if (playerId.current === -1) {
      const players = playerQuery()
      if (!players.length) return
      playerId.current = players[0]
    }

    const pid = playerId.current

    const boostTarget = gameState.boostActive > 0 ? 1 : 0
    boostSmooth.current = THREE.MathUtils.lerp(boostSmooth.current, boostTarget, 0.2)

    simMaterial.uniforms.uPosTex.value = readTexture.current
    simMaterial.uniforms.uDelta.value = Math.min(delta, 0.1)
    simMaterial.uniforms.uTime.value = state.clock.elapsedTime
    simMaterial.uniforms.uShipPos.value.set(Position.x[pid], Position.y[pid])
    simMaterial.uniforms.uShipVel.value.set(Velocity.x[pid], Velocity.y[pid])
    simMaterial.uniforms.uShipRot.value = Rotation[pid]
    simMaterial.uniforms.uEmitting.value = input.thrust ? 1 : 0
    simMaterial.uniforms.uBoost.value = boostSmooth.current

    const prevTarget = gl.getRenderTarget()

    gl.setRenderTarget(writeTarget.current)
    gl.render(simScene, simCamera)
    gl.setRenderTarget(prevTarget)

    readTexture.current = writeTarget.current.texture
    renderMaterial.uniforms.uPosTex.value = readTexture.current
    renderMaterial.uniforms.uBoost.value = boostSmooth.current

    const tmp = writeTarget.current
    writeTarget.current = otherTarget.current
    otherTarget.current = tmp
  })

  return (
    <points geometry={pointsGeometry}
      material={renderMaterial}
      frustumCulled={false}
    />
  )
}