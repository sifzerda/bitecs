// src/renderers/OctopusRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useControls } from "leva"
import * as THREE from "three"
import { octopusQuery } from "../ecs/constants/queries.js"
import { Position, Velocity } from "../ecs/constants/components.js"
import { gameState } from "../state/gameState.js"

const MAX_OCTOPUSES = 6              // upper bound for buffer sizing
const MAX_TENTACLES_PER_OCTOPUS = 24 // upper bound for buffer sizing
const MAX_TENTACLES = MAX_OCTOPUSES * MAX_TENTACLES_PER_OCTOPUS

// ============================================================

function createNodes(nodeCount, x, y) {
    const nodes = []
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({ x, y, ox: x, oy: y, vx: 0, vy: 0 })
    }
    return nodes
}

function buildTaper(nodeCount, baseRadius, tipRadius) {
    const radii = new Float32Array(nodeCount)
    for (let i = 0; i < nodeCount; i++) {
        const t = nodeCount <= 1 ? 0 : i / (nodeCount - 1)
        radii[i] = THREE.MathUtils.lerp(baseRadius, tipRadius, t)
    }
    return radii
}

function buildReachWeights(nodeCount) {
    const weights = new Float32Array(nodeCount)
    for (let i = 1; i < nodeCount; i++) {
        weights[i] = i / (nodeCount - 1)
    }
    return weights
}

function updateTentacle(
    nodes, outer, inner,
    anchorX, anchorY,
    spacing, friction, gravity, wind,
    radii,
    reachActive, reachX, reachY, reachStrength, reachWeights,
    seed, time, wanderStrength, wanderSpeed,
    tangentX, tangentY,
    waveAmplitude, waveFrequency, waveSpeed,
    detailAmplitude, detailFrequency, detailSpeed,
    curvatureSmoothing, smoothIterations
) {
    nodes[0].x = anchorX
    nodes[0].y = anchorY

    const wanderX = Math.sin(time * wanderSpeed + seed * 6.283) * wanderStrength
    const wanderY = Math.cos(time * wanderSpeed * 0.8 + seed * 11.0) * wanderStrength

    const lastIndex = nodes.length - 1

    let prev = nodes[0]
    for (let i = 1; i < nodes.length; i++) {
        const node = nodes[i]
        node.x += node.vx
        node.y += node.vy

        const dx = prev.x - node.x
        const dy = prev.y - node.y
        const da = Math.atan2(dy, dx)

        const px = node.x + Math.cos(da) * spacing
        const py = node.y + Math.sin(da) * spacing
        node.x = prev.x - (px - node.x)
        node.y = prev.y - (py - node.y)

        node.vx = (node.x - node.ox) * friction
        node.vy = (node.y - node.oy) * friction

        node.vx += wind + wanderX
        node.vy += gravity + wanderY

        const localT = lastIndex <= 0 ? 0 : i / lastIndex
        const wavePhase = time * waveSpeed - localT * waveFrequency * Math.PI * 2 + seed * 6.283
        const detailPhase = time * detailSpeed - localT * detailFrequency * Math.PI * 2 + seed * 11.0
        const wave = Math.sin(wavePhase) * waveAmplitude * localT
            + Math.sin(detailPhase) * detailAmplitude * localT

        node.vx += tangentX * wave
        node.vy += tangentY * wave

        if (reachActive) {
            const rdx = reachX - node.x
            const rdy = reachY - node.y
            const dist = Math.hypot(rdx, rdy) || 0.0001
            const w = reachWeights[i]
            node.vx += (rdx / dist) * reachStrength * w
            node.vy += (rdy / dist) * reachStrength * w
        }

        prev = node
    }

    for (let iter = 0; iter < smoothIterations; iter++) {
        for (let i = 1; i < lastIndex; i++) {
            const prevNode = nodes[i - 1]
            const curNode = nodes[i]
            const nextNode = nodes[i + 1]
            const targetX = (prevNode.x + nextNode.x) * 0.5
            const targetY = (prevNode.y + nextNode.y) * 0.5
            curNode.x += (targetX - curNode.x) * curvatureSmoothing
            curNode.y += (targetY - curNode.y) * curvatureSmoothing
        }
    }

    prev = nodes[0]
    for (let i = 1; i < nodes.length; i++) {
        const node = nodes[i]
        node.ox = node.x
        node.oy = node.y

        const dx = prev.x - node.x
        const dy = prev.y - node.y
        const da = Math.atan2(dy, dx)

        const s = Math.sin(da + Math.PI / 2)
        const c = Math.cos(da + Math.PI / 2)
        const idx = i - 1
        const radius = radii[i]
        outer[idx].x = prev.x + c * radius
        outer[idx].y = prev.y + s * radius
        inner[idx].x = prev.x - c * radius
        inner[idx].y = prev.y - s * radius

        prev = node
    }
}

// ============================================================
// shader (identical to TentacleRenderer.jsx, including the solid-core fix)
// ============================================================

const plumeVertexShader = /* glsl */ `
attribute float aSegmentT;
attribute float aSeed;

varying vec2 vUv;
varying float vSegmentT;
varying float vSeed;

void main() {
    vUv = uv;
    vSegmentT = aSegmentT;
    vSeed = aSeed;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`

const plumeFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying float vSegmentT;
varying float vSeed;

uniform float uTime;
uniform vec3 uHotCore;
uniform vec3 uFireColor;
uniform vec3 uSmokeColor;
uniform float uNoiseStrength;
uniform float uOpacity;
uniform float uCoreWidth;

void main() {
  float edge = abs(vUv.y - 0.5) * 2.0;
  float softEdge = 1.0 - smoothstep(uCoreWidth, 1.0, edge);

  float turbA = sin(vUv.x * 16.0 + uTime * 2.0 + vSeed * 6.283) * 0.5 + 0.5;
  float turbB = sin(vUv.x * 33.0 - uTime * 3.4 + vSeed * 11.0) * 0.5 + 0.5;
  float density = mix(1.0, 1.0, turbA) * mix(1.0 - uNoiseStrength, 1.0, turbB);
  float tipFade = 1.0 - smoothstep(0.85, 1.0, vSegmentT);
  float baseFade = smoothstep(0.0, 0.04, vSegmentT);
  float alpha = softEdge * density * tipFade * baseFade * uOpacity;

  vec3 color = mix(uHotCore, uFireColor, smoothstep(0.0, 0.15, vSegmentT));
  color = mix(color, uSmokeColor, smoothstep(0.15, 1.0, vSegmentT));

  float shade = mix(0.85, 1.15, vSeed);
  color *= shade;

  gl_FragColor = vec4(color, alpha);
}
`

export function OctopusRenderer() {

    const cfg = useControls('Eldritch / Octopuses', {
        octopusCount: { value: 3, min: 1, max: MAX_OCTOPUSES, step: 1 },
        tentaclesPerOctopus: { value: 12, min: 1, max: MAX_TENTACLES_PER_OCTOPUS, step: 1 },
        headRadius: { value: 0.6, min: 0.05, max: 6, step: 0.05, label: 'head radius' },
        pulse: { value: true, label: 'head pulse' },
        pulseSpeed: { value: 0.6, min: 0, max: 4, step: 0.02, label: 'pulse speed' },
        pulseAmount: { value: 0.35, min: 0, max: 1, step: 0.02, label: 'pulse amount' },
        nodeCount: { value: 8, min: 3, max: 24, step: 1 },
        spacing: { value: 0.22, min: 0.02, max: 4, step: 0.01, label: 'segment spacing' },
        baseRadius: { value: 0.05, min: 0.005, max: 2, step: 0.005 },
        tipRadius: { value: 0.008, min: 0.002, max: 1, step: 0.002 },
        friction: { value: 0.75, min: 0, max: 0.98, step: 0.005 },
        dragStrength: { value: 0.9, min: 0, max: 4, step: 0.02, label: 'trailing drag' },
        wanderStrength: { value: 0.15, min: 0, max: 3, step: 0.02 },
        wanderSpeed: { value: 1.3, min: 0, max: 5, step: 0.05 },
        waveAmplitude: { value: 0.3, min: 0, max: 3, step: 0.02, label: 'S-curve amplitude' },
        waveFrequency: { value: 0.9, min: 0, max: 3, step: 0.05, label: 'S-curve cycles' },
        waveSpeed: { value: 2.2, min: 0, max: 6, step: 0.05, label: 'S-curve speed' },
        detailAmplitude: { value: 0.12, min: 0, max: 2, step: 0.02, label: 'ripple amplitude' },
        detailFrequency: { value: 1.6, min: 0, max: 6, step: 0.05, label: 'ripple cycles' },
        detailSpeed: { value: 3.0, min: 0, max: 8, step: 0.05, label: 'ripple speed' },
        curvatureSmoothing: { value: 0.3, min: 0, max: 1, step: 0.02, label: 'joint smoothing' },
        smoothIterations: { value: 3, min: 0, max: 6, step: 1, label: 'smoothing passes' },
    }, { collapsed: false })

    const plumeCfg = useControls('Eldritch / Octopus Plume', {
        hotCore: { value: '#ff2ecb', label: 'hot core' },
        fireColor: { value: '#7a1fbf', label: 'fire color' },
        smokeColor: { value: '#04051a', label: 'smoke color' },
        noiseStrength: { value: 0.5, min: 0, max: 1, step: 0.02 },
        opacity: { value: 0.5, min: 0, max: 2, step: 0.05 },
        coreWidth: { value: 0.55, min: 0, max: 0.95, step: 0.02, label: 'solid core width' },
    }, { collapsed: false })

    const totalTentacles = cfg.octopusCount * cfg.tentaclesPerOctopus
    const pointsPerTentacle = Math.max(cfg.nodeCount - 1, 2)
    const quadsPerTentacle = pointsPerTentacle - 1
    const vertsPerTentacle = pointsPerTentacle * 2
    const totalVerts = MAX_TENTACLES * vertsPerTentacle
    const totalTris = MAX_TENTACLES * quadsPerTentacle * 2

    // persistent per-tentacle simulation state, plus one seed per octopus
    // (used to desync head-pulse phase between octopuses)
    const stateRef = useRef(null)
    if (
        !stateRef.current ||
        stateRef.current.nodeCount !== cfg.nodeCount ||
        stateRef.current.tentacles.length !== MAX_TENTACLES
    ) {
        const tentacles = []
        for (let i = 0; i < MAX_TENTACLES; i++) {
            tentacles.push({
                nodes: createNodes(cfg.nodeCount, 0, 0),
                outer: Array.from({ length: pointsPerTentacle }, () => ({ x: 0, y: 0 })),
                inner: Array.from({ length: pointsPerTentacle }, () => ({ x: 0, y: 0 })),
                seed: Math.random(),
                initialized: false,
            })
        }
        const octopusSeeds = new Float32Array(MAX_OCTOPUSES)
        for (let o = 0; o < MAX_OCTOPUSES; o++) octopusSeeds[o] = Math.random()

        stateRef.current = {
            nodeCount: cfg.nodeCount,
            tentacles,
            octopusSeeds,
            reachWeights: buildReachWeights(cfg.nodeCount),
        }
    }

    // static topology — rebuilt only when node/point count changes;
    // position is rewritten every frame
    const { geometry, positionAttr } = useMemo(() => {
        const positions = new Float32Array(totalVerts * 3)
        const uvs = new Float32Array(totalVerts * 2)
        const segmentT = new Float32Array(totalVerts)
        const seeds = new Float32Array(totalVerts)
        const indices = new Uint32Array(totalTris * 3)

        let triCursor = 0
        for (let t = 0; t < MAX_TENTACLES; t++) {
            const vBase = t * vertsPerTentacle
            const seed = stateRef.current.tentacles[t]?.seed ?? 0

            for (let p = 0; p < pointsPerTentacle; p++) {
                const outerIdx = vBase + p * 2
                const innerIdx = outerIdx + 1
                const tAlong = pointsPerTentacle <= 1 ? 0 : p / (pointsPerTentacle - 1)

                uvs[outerIdx * 2] = tAlong; uvs[outerIdx * 2 + 1] = 1
                uvs[innerIdx * 2] = tAlong; uvs[innerIdx * 2 + 1] = 0

                segmentT[outerIdx] = tAlong
                segmentT[innerIdx] = tAlong

                seeds[outerIdx] = seed
                seeds[innerIdx] = seed
            }

            for (let p = 0; p < quadsPerTentacle; p++) {
                const outerA = vBase + p * 2
                const innerA = outerA + 1
                const outerB = outerA + 2
                const innerB = outerA + 3

                indices[triCursor++] = outerA
                indices[triCursor++] = innerA
                indices[triCursor++] = outerB

                indices[triCursor++] = outerB
                indices[triCursor++] = innerA
                indices[triCursor++] = innerB
            }
        }

        const geo = new THREE.BufferGeometry()
        const positionAttr = new THREE.BufferAttribute(positions, 3)
        positionAttr.setUsage(THREE.DynamicDrawUsage)
        geo.setAttribute('position', positionAttr)
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
        geo.setAttribute('aSegmentT', new THREE.BufferAttribute(segmentT, 1))
        geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
        geo.setIndex(new THREE.BufferAttribute(indices, 1))
        geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 10000)

        return { geometry: geo, positionAttr }
    }, [cfg.nodeCount, pointsPerTentacle, quadsPerTentacle, vertsPerTentacle, totalVerts, totalTris])

    const plumeMaterial = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: plumeVertexShader,
        fragmentShader: plumeFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uHotCore: { value: new THREE.Color(plumeCfg.hotCore) },
            uFireColor: { value: new THREE.Color(plumeCfg.fireColor) },
            uSmokeColor: { value: new THREE.Color(plumeCfg.smokeColor) },
            uNoiseStrength: { value: plumeCfg.noiseStrength },
            uOpacity: { value: plumeCfg.opacity },
            uCoreWidth: { value: plumeCfg.coreWidth },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    }), [])

    plumeMaterial.uniforms.uHotCore.value.set(plumeCfg.hotCore)
    plumeMaterial.uniforms.uFireColor.value.set(plumeCfg.fireColor)
    plumeMaterial.uniforms.uSmokeColor.value.set(plumeCfg.smokeColor)
    plumeMaterial.uniforms.uNoiseStrength.value = plumeCfg.noiseStrength
    plumeMaterial.uniforms.uOpacity.value = plumeCfg.opacity
    plumeMaterial.uniforms.uCoreWidth.value = plumeCfg.coreWidth

    const meshRef = useRef()

useFrame((frameState) => {
    if (!meshRef.current) return

    if (!gameState.octopusEnabled) {
        // zero out all verts so nothing renders, without tearing down GPU buffers
        const positions = positionAttr.array
        positions.fill(0)
        positionAttr.needsUpdate = true
        return
    }

    const t = frameState.clock.elapsedTime
        plumeMaterial.uniforms.uTime.value = t

        const { tentacles: sims, octopusSeeds, reachWeights } = stateRef.current
        const positions = positionAttr.array

        const octopusEntities = octopusQuery()

        // hide every slot beyond what's currently in use
        for (let i = totalTentacles; i < MAX_TENTACLES; i++) {
            const vBase = i * vertsPerTentacle
            for (let p = 0; p < pointsPerTentacle; p++) {
                const outerIdx = vBase + p * 2
                const innerIdx = outerIdx + 1
                positions[outerIdx * 3] = positions[outerIdx * 3 + 1] = positions[outerIdx * 3 + 2] = 0
                positions[innerIdx * 3] = positions[innerIdx * 3 + 1] = positions[innerIdx * 3 + 2] = 0
            }
        }

        for (let o = 0; o < cfg.octopusCount; o++) {
            const active = o < octopusEntities.length
            const eid = active ? octopusEntities[o] : null

            if (!active) {
                for (let k = 0; k < cfg.tentaclesPerOctopus; k++) {
                    const i = o * cfg.tentaclesPerOctopus + k
                    const vBase = i * vertsPerTentacle
                    for (let p = 0; p < pointsPerTentacle; p++) {
                        const outerIdx = vBase + p * 2
                        const innerIdx = outerIdx + 1
                        positions[outerIdx * 3] = positions[outerIdx * 3 + 1] = positions[outerIdx * 3 + 2] = 0
                        positions[innerIdx * 3] = positions[innerIdx * 3 + 1] = positions[innerIdx * 3 + 2] = 0
                    }
                }
                continue
            }

            const centerX = Position.x[eid]
            const centerY = Position.y[eid]
            const vx = Velocity.x[eid]
            const vy = Velocity.y[eid]

            const pulse = cfg.pulse
                ? Math.pow(Math.sin(t * cfg.pulseSpeed + octopusSeeds[o] * 6.283), 18)
                : 0
            const headR = cfg.headRadius * (1 - cfg.pulseAmount * 0.5 + cfg.pulseAmount * 0.5 * pulse)

            // drag opposite velocity — tentacles trail behind the octopus
            // as it flies, instead of sagging toward a fixed world direction
            const dragX = -vx * cfg.dragStrength
            const dragY = -vy * cfg.dragStrength

            for (let k = 0; k < cfg.tentaclesPerOctopus; k++) {
                const i = o * cfg.tentaclesPerOctopus + k
                const sim = sims[i]
                const vBase = i * vertsPerTentacle

                const angle = (k / cfg.tentaclesPerOctopus) * Math.PI * 2
                const anchorX = centerX + Math.cos(angle) * headR
                const anchorY = centerY + Math.sin(angle) * headR

                // tangent to the head circle at this angle — the axis the
                // S-curve wave bends across
                const tangentX = -Math.sin(angle)
                const tangentY = Math.cos(angle)

                const radii = buildTaper(cfg.nodeCount, cfg.baseRadius, cfg.tipRadius)

                if (!sim.initialized) {
                    for (const node of sim.nodes) {
                        node.x = node.ox = anchorX
                        node.y = node.oy = anchorY
                    }
                    sim.initialized = true
                }

                updateTentacle(
                    sim.nodes, sim.outer, sim.inner,
                    anchorX, anchorY,
                    cfg.spacing, cfg.friction, dragY, dragX,
                    radii,
                    false, 0, 0, 0, reachWeights,
                    sim.seed, t, cfg.wanderStrength, cfg.wanderSpeed,
                    tangentX, tangentY,
                    cfg.waveAmplitude, cfg.waveFrequency, cfg.waveSpeed,
                    cfg.detailAmplitude, cfg.detailFrequency, cfg.detailSpeed,
                    cfg.curvatureSmoothing, cfg.smoothIterations
                )

                for (let p = 0; p < pointsPerTentacle; p++) {
                    const o2 = sim.outer[p]
                    const n2 = sim.inner[p]
                    const outerIdx = vBase + p * 2
                    const innerIdx = outerIdx + 1

                    positions[outerIdx * 3] = o2.x
                    positions[outerIdx * 3 + 1] = o2.y
                    positions[outerIdx * 3 + 2] = 0.05

                    positions[innerIdx * 3] = n2.x
                    positions[innerIdx * 3 + 1] = n2.y
                    positions[innerIdx * 3 + 2] = 0.05
                }
            }
        }

        positionAttr.needsUpdate = true
    })

    return (
        <mesh ref={meshRef} geometry={geometry} material={plumeMaterial} frustumCulled={false} />
    )
}
