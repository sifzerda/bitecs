// src/renderers/ExhaustRenderer.jsx

import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { exhaustSources } from "../fx/gpu/ExhaustState"

const PARTICLE_SIZE = 128

// Matches the shader's lifespan formula: 0.5 + seed * 0.5, seed in [0,1]
const MAX_LIFESPAN = 1.0

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
  uniform float uNozzleOffset;
  uniform float uEngineGap;

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

      vec2 expand = right * engineSide * age * 0.9;
      float velFade = 1.0 - smoothstep(0.0, 0.35, age);
      vec2 exhaustVel = -uShipVel * 0.85 * velFade + curl(pos) * 1.5 + expand;
      pos += exhaustVel * uDelta;

      if (life <= 0.0) {
        life = -(0.05 + seed * 0.35);
      }
    } else {

      life += uDelta;

      if (life >= 0.0) {
        if (uEmitting > 0.5) {

          float subSeed = fract(seed * 91.345);
          float nozzleJitter = (subSeed - 0.5) * 0.06;
          float engineOffset = engineSide * uEngineGap + nozzleJitter;
          pos = uShipPos + backward * uNozzleOffset + right * engineOffset;
          life = 0.5 + seed * 0.5;
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
  varying float vEnvelope;

  uniform sampler2D uPosTex;
  uniform float uSize;

  void main() {
    vec4 data = texture2D(uPosTex, particleUv);

    vLife = data.z;
    float seed = data.w;
    float lifespan = 0.5 + seed * 0.5;

    // 1.0 at spawn, 0.0 at death — normalized, unlike raw vLife which
    // varies in absolute scale depending on each particle's random
    // lifespan (0.5–1.0), so short-lived particles used to never reach
    // full size.
    float lifeFrac = clamp(vLife / lifespan, 0.0, 1.0);
    vAge = 1.0 - lifeFrac;

    // Smooth envelope: fade in over the first ~8% of life, hold, fade
    // out over the last ~25%. Drives both size and alpha (in the
    // fragment shader) so particles never hard-pop in or out.
    vEnvelope = smoothstep(0.0, 0.08, lifeFrac) * (1.0 - smoothstep(0.75, 1.0, vAge));

    vec3 pos = vec3(data.xy, 0.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Per-particle size variance from the seed (stable per-particle, not
    // re-randomized per frame) so the exhaust cloud reads as less uniform.
    float sizeVariance = mix(0.75, 1.25, fract(seed * 13.7));

    gl_PointSize = uSize * sizeVariance * vEnvelope * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const renderFragmentShader = /* glsl */
  `
  precision highp float;
  varying float vLife;
  varying float vAge;
  uniform vec3 uHotCore;
  uniform vec3 uFireColor;
  uniform vec3 uSmokeColor;

  void main() {
    if (vLife <= 0.0) discard;

    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float alpha = smoothstep(0.5, 0.0, d) * clamp(vLife, 0.0, 1.0) * 0.15;

    vec3 color = mix(uHotCore, uFireColor, smoothstep(0.0, 0.15, vAge));
    color = mix(color, uSmokeColor, smoothstep(0.15, 1.0, vAge));

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
//
// getShip: () => { x, y, vx, vy, rot, emitting } | null
//   Called every frame. Return null when the source entity doesn't exist
//   (e.g. boss slot empty) — the sim keeps ticking so any live particles
//   fade out naturally instead of freezing or popping.
//
// nozzleOffset / engineGap: tune per ship silhouette (player vs boss hull size)
// colors: optional override for the fire->smoke gradient (e.g. boss could run hotter/redder)

export function ExhaustRenderer({
  size = 4,
  slot = 0,
  nozzleOffset = -0.70,
  engineGap = 0.15,
  hotCore = '#ff2614',
  fireColor = '#ff3308',
  smokeColor = '#04bfff',
}) {
  const { gl } = useThree()

  const pointsRef = useRef()

  // Tracks how long to keep simulating after emission stops. Reset forward
  // to (now + MAX_LIFESPAN) every frame the ship is actively emitting; once
  // "now" passes this, every particle that could still be alive has already
  // fully decayed (matches the shader's own lifespan formula), so the sim
  // pass and the points draw are both skipped entirely — pure GPU cost with
  // zero visual difference, since nothing would be visible anyway.
  const activeUntilRef = useRef(0)

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
      uShipPos: { value: new THREE.Vector2() },
      uShipVel: { value: new THREE.Vector2() },
      uShipRot: { value: 0 },
      uDelta: { value: 0 },
      uTime: { value: 0 },
      uEmitting: { value: 0 },
      uNozzleOffset: { value: nozzleOffset },
      uEngineGap: { value: engineGap },
    },
    vertexShader: simVertexShader,
    fragmentShader: simFragmentShader,
  }), [nozzleOffset, engineGap])

  // Side effect (adding the quad to the sim scene) belongs in useEffect, not
  // useMemo — useMemo has no cleanup, so if simMaterial ever changed
  // identity (e.g. nozzleOffset/engineGap props change on a live instance)
  // this would silently add a second quad on top of the first instead of
  // replacing it.
  useEffect(() => {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial)
    simScene.add(quad)

    return () => {
      simScene.remove(quad)
      quad.geometry.dispose()
    }
  }, [simScene, simMaterial])

  const renderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex: { value: null },
      uSize: { value: size },
      uHotCore: { value: new THREE.Color(hotCore) },
      uFireColor: { value: new THREE.Color(fireColor) },
      uSmokeColor: { value: new THREE.Color(smokeColor) },
    },
    vertexShader: renderVertexShader,
    fragmentShader: renderFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [size, hotCore, fireColor, smokeColor])

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

  // Dispose every GPU resource this component owns when it unmounts.
  // None of this existed before — rtA/rtB/initialPosTexture/simMaterial/
  // renderMaterial/pointsGeometry were all leaking on unmount.
  useEffect(() => {
    return () => {
      initialPosTexture.dispose()
      rtA.dispose()
      rtB.dispose()
      simMaterial.dispose()
      renderMaterial.dispose()
      pointsGeometry.dispose()
    }
  }, [initialPosTexture, rtA, rtB, simMaterial, renderMaterial, pointsGeometry])

  useFrame((state, delta) => {

    const ship = exhaustSources.find(s => s.slot === slot)
    const now = state.clock.elapsedTime
    const emitting = !!(ship && ship.emitting)

    if (emitting) {
      activeUntilRef.current = now + MAX_LIFESPAN
    }

    const isActive = now < activeUntilRef.current

    if (pointsRef.current) {
      pointsRef.current.visible = isActive
    }

    // Nothing could possibly be alive or spawning this frame — skip the
    // sim pass and the points draw entirely rather than paying for a
    // 128x128 fragment shader pass and a 16,384-point draw call that would
    // render nothing visible (every particle already discards on life <= 0).
    if (!isActive) {
      return
    }

    simMaterial.uniforms.uPosTex.value = readTexture.current
    simMaterial.uniforms.uDelta.value = Math.min(delta, 0.1)
    simMaterial.uniforms.uTime.value = state.clock.elapsedTime

    if (ship) {
      simMaterial.uniforms.uShipPos.value.set(ship.x, ship.y)
      simMaterial.uniforms.uShipVel.value.set(ship.vx, ship.vy)
      simMaterial.uniforms.uShipRot.value = ship.rot
      simMaterial.uniforms.uEmitting.value = ship.emitting ? 1 : 0
    } else {
      // no source this frame (e.g. boss slot empty) — stop emitting,
      // let any already-living particles finish their fade
      simMaterial.uniforms.uEmitting.value = 0
    }

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
      ref={pointsRef}
      geometry={pointsGeometry}
      material={renderMaterial}
      frustumCulled={false}
    />
  )
}