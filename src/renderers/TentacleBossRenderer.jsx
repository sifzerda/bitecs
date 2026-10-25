// src/renderers/TentacleBossRenderer.jsx

import { useLayoutEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

import {
  OCTOPUS,
  octopusState as s,
  setOctopusViewport,
  findOctopusBoss,
} from "../ecs/systems/octopusBossSystem.js"

import { Health } from "../ecs/constants/components.js"
import { startState } from "../state/startState.js"

// Appearance from TentacleRenderer.
// Each gameplay arm carries a bundle of thin visual strands.
const STRANDS_PER_ARM = 20
const NODE_COUNT = 32

const BASE_RADIUS = 0.20
const TIP_RADIUS = 0.02

const BUNDLE_SPREAD = 0.30
const WAVE_AMPLITUDE = 1.10
const WAVE_FREQUENCY = 0.75
const WAVE_SPEED = 2.55

const DETAIL_AMPLITUDE = 0.60
const DETAIL_FREQUENCY = 1.35

const TOTAL_STRANDS = OCTOPUS.count * STRANDS_PER_ARM
const VERTICES_PER_STRAND = NODE_COUNT * 2

const vertexShader = /* glsl */ `
  attribute float aSeed;

  varying vec2 vUv;
  varying float vSeed;

  void main() {
    vUv = uv;
    vSeed = aSeed;

    vec4 mvPosition =
      modelViewMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`

// Same plume appearance and default values as TentacleRenderer.
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uHotCore;
  uniform vec3 uFireColor;
  uniform vec3 uSmokeColor;
  uniform float uNoiseStrength;
  uniform float uOpacity;
  uniform float uCoreWidth;

  varying vec2 vUv;
  varying float vSeed;

  void main() {
    float along = vUv.x;
    float edge = abs(vUv.y - 0.5) * 2.0;

    float softEdge =
      1.0 - smoothstep(uCoreWidth, 1.0, edge);

    float turbB =
      sin(
        along * 33.0 -
        uTime * 3.4 +
        vSeed * 11.0
      ) * 0.5 + 0.5;

    float density = mix(
      1.0 - uNoiseStrength,
      1.0,
      turbB
    );

    float tipFade =
      1.0 - smoothstep(0.85, 1.0, along);

    float baseFade =
      smoothstep(0.0, 0.04, along);

    float alpha =
      softEdge *
      density *
      tipFade *
      baseFade *
      uOpacity;

    vec3 color = mix(
      uHotCore,
      uFireColor,
      smoothstep(0.0, 0.15, along)
    );

    color = mix(
      color,
      uSmokeColor,
      smoothstep(0.15, 1.0, along)
    );

    color *= mix(0.85, 1.15, vSeed);

    gl_FragColor = vec4(color, alpha);
  }
`

function buildBuffers() {
  const totalVertices = TOTAL_STRANDS * VERTICES_PER_STRAND

  const positions = new Float32Array(totalVertices * 3)
  const uvs = new Float32Array(totalVertices * 2)
  const seeds = new Float32Array(totalVertices)

  const indices = new Uint32Array(
    TOTAL_STRANDS * (NODE_COUNT - 1) * 6
  )

  const strandSeeds = new Float32Array(TOTAL_STRANDS)
  const strandSpread = new Float32Array(TOTAL_STRANDS)

  // Reused centreline storage, with no per-frame allocations.
  const centerX = new Float32Array(TOTAL_STRANDS * NODE_COUNT)
  const centerY = new Float32Array(TOTAL_STRANDS * NODE_COUNT)

  let cursor = 0

  for (let strand = 0; strand < TOTAL_STRANDS; strand++) {
    const vertexBase = strand * VERTICES_PER_STRAND

    // Deterministic variation keeps the appearance stable on remount.
    const seed = ((strand + 1) * 0.61803398875) % 1

    strandSeeds[strand] = seed
    strandSpread[strand] =
      (((strand + 1) * 0.754877666) % 1) * 2 - 1

    for (let j = 0; j < NODE_COUNT; j++) {
      const vertex = vertexBase + j * 2
      const t = j / (NODE_COUNT - 1)

      uvs[vertex * 2] = t
      uvs[vertex * 2 + 1] = 1

      uvs[(vertex + 1) * 2] = t
      uvs[(vertex + 1) * 2 + 1] = 0

      seeds[vertex] = seed
      seeds[vertex + 1] = seed

      if (j === NODE_COUNT - 1) continue

      indices[cursor++] = vertex
      indices[cursor++] = vertex + 1
      indices[cursor++] = vertex + 2

      indices[cursor++] = vertex + 2
      indices[cursor++] = vertex + 1
      indices[cursor++] = vertex + 3
    }
  }

  return {
    positions,
    uvs,
    seeds,
    indices,
    strandSeeds,
    strandSpread,
    centerX,
    centerY,
  }
}

export function TentacleBossRenderer() {
  const arms = useRef()
  const core = useRef()
  const warning = useRef()

  const viewport = useThree(state => state.viewport)

  useLayoutEffect(() => {
    setOctopusViewport(viewport.width, viewport.height)
  }, [viewport.width, viewport.height])

  const buffers = useMemo(buildBuffers, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHotCore: { value: new THREE.Color("#ff2614") },
    uFireColor: { value: new THREE.Color("#ff3308") },
    uSmokeColor: { value: new THREE.Color("#7a1fbf") },
    uNoiseStrength: { value: 0 },
    uOpacity: { value: 0.18 },
    uCoreWidth: { value: 0.55 },
  }), [])

  useFrame(() => {
    const mesh = arms.current
    const body = core.current
    const marker = warning.current

    if (!mesh || !body || !marker) return

    const alive =
      s.eid >= 0 &&
      findOctopusBoss() === s.eid

    mesh.visible = alive
    body.visible = alive

    marker.visible =
      alive &&
      s.warning &&
      startState.encounterPhase === "active"

    if (!alive) return

    const time = s.time
    uniforms.uTime.value = time

    body.position.set(s.coreX, 0, 0.1)

    const healthFraction = THREE.MathUtils.clamp(
      Health.current[s.eid] /
        Math.max(1, Health.max[s.eid]),
      0,
      1
    )

    body.material.emissiveIntensity =
      0.6 +
      (1 - healthFraction) +
      Math.sin(time * 4) * 0.15

    marker.position.set(s.targetX, s.targetY, 0.2)
    marker.scale.setScalar(
      1 + Math.sin(time * 18) * 0.12
    )

    const {
      positions,
      centerX,
      centerY,
      strandSeeds,
      strandSpread,
    } = buffers

    for (let arm = 0; arm < OCTOPUS.count; arm++) {
      const armBase = arm * OCTOPUS.segments

      const attacking =
        arm === s.attack &&
        (s.warning || s.danger)

      // Tighten the bundle during an attack so its visible tip
      // stays attached to the gameplay arm's damaging tip.
      const waveScale = attacking ? 0.35 : 1

      for (let k = 0; k < STRANDS_PER_ARM; k++) {
        const strand = arm * STRANDS_PER_ARM + k
        const seed = strandSeeds[strand]
        const spread = strandSpread[strand]

        const nodeBase = strand * NODE_COUNT
        const vertexBase = strand * VERTICES_PER_STRAND

        for (let j = 0; j < NODE_COUNT; j++) {
          const t = j / (NODE_COUNT - 1)

          // Sample the existing boss arm's centreline.
          const sample = t * (OCTOPUS.segments - 1)
          const segment = Math.min(
            Math.floor(sample),
            OCTOPUS.segments - 1
          )

          const nextSegment = Math.min(
            segment + 1,
            OCTOPUS.segments - 1
          )

          const fraction = sample - segment

          const a = armBase + segment
          const b = armBase + nextSegment

          const x = THREE.MathUtils.lerp(s.x[a], s.x[b], fraction)
          const y = THREE.MathUtils.lerp(s.y[a], s.y[b], fraction)

          const previous = armBase + Math.max(0, segment - 1)
          const next = armBase + Math.min(
            OCTOPUS.segments - 1,
            nextSegment + 1
          )

          const dx = s.x[next] - s.x[previous]
          const dy = s.y[next] - s.y[previous]
          const length = Math.hypot(dx, dy) || 1

          const nx = -dy / length
          const ny = dx / length

          const wave =
            Math.sin(
              time * WAVE_SPEED -
              t * WAVE_FREQUENCY * Math.PI * 2 +
              seed * Math.PI * 2
            ) * WAVE_AMPLITUDE +
            Math.sin(
              -t * DETAIL_FREQUENCY * Math.PI * 2 +
              seed * 11
            ) * DETAIL_AMPLITUDE

          // Zero displacement at the base and attack tip.
          const envelope = Math.sin(t * Math.PI)
          const radius = Math.max(
            0,
            THREE.MathUtils.lerp(
              s.radius[a],
              s.radius[b],
              fraction
            )
          )

          const offset =
            (
              spread * BUNDLE_SPREAD +
              wave * 0.20 * waveScale
            ) *
            envelope *
            Math.min(1, radius / BASE_RADIUS)

          centerX[nodeBase + j] = x + nx * offset
          centerY[nodeBase + j] = y + ny * offset
        }

        // Six smoothing passes, as in the reference.
        // Endpoints remain fixed to the boss arm.
        for (let pass = 0; pass < 6; pass++) {
          for (let j = 1; j < NODE_COUNT - 1; j++) {
            const i = nodeBase + j

            centerX[i] += (
              (centerX[i - 1] + centerX[i + 1]) * 0.5 -
              centerX[i]
            ) * 0.2

            centerY[i] += (
              (centerY[i - 1] + centerY[i + 1]) * 0.5 -
              centerY[i]
            ) * 0.2
          }
        }

        // Build each tapered ribbon from its own curved centreline.
        for (let j = 0; j < NODE_COUNT; j++) {
          const t = j / (NODE_COUNT - 1)
          const i = nodeBase + j

          const previous = nodeBase + Math.max(0, j - 1)
          const next = nodeBase + Math.min(NODE_COUNT - 1, j + 1)

          const dx = centerX[next] - centerX[previous]
          const dy = centerY[next] - centerY[previous]
          const length = Math.hypot(dx, dy) || 1

          const nx = -dy / length
          const ny = dx / length

          const radius = THREE.MathUtils.lerp(
            BASE_RADIUS,
            TIP_RADIUS,
            t
          )

          const vertex = vertexBase + j * 2
          const offset = vertex * 3

          positions[offset] = centerX[i] + nx * radius
          positions[offset + 1] = centerY[i] + ny * radius
          positions[offset + 2] = 0.05

          positions[offset + 3] = centerX[i] - nx * radius
          positions[offset + 4] = centerY[i] - ny * radius
          positions[offset + 5] = 0.05
        }
      }
    }

    mesh.geometry.attributes.position.needsUpdate = true
  })

  return (
    <>
      <mesh ref={arms} visible={false} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[buffers.positions, 3]}
            usage={THREE.DynamicDrawUsage}
          />

          <bufferAttribute
            attach="attributes-uv"
            args={[buffers.uvs, 2]}
          />

          <bufferAttribute
            attach="attributes-aSeed"
            args={[buffers.seeds, 1]}
          />

          <bufferAttribute
            attach="index"
            args={[buffers.indices, 1]}
          />
        </bufferGeometry>

        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={core} visible={false}>
        <sphereGeometry args={[OCTOPUS.coreRadius, 20, 14]} />

        <meshStandardMaterial
          color="#37245c"
          emissive="#a329ff"
          roughness={0.35}
          metalness={0.4}
        />
      </mesh>

      <mesh ref={warning} visible={false} renderOrder={100}>
        <ringGeometry args={[0.55, 0.65, 32]} />

        <meshBasicMaterial
          color="#ffcc33"
          transparent
          opacity={0.9}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}