// src/renderers/TentacleRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useControls } from "leva"
import * as THREE from "three"
import { playerQuery, tentacleQuery } from "../ecs/constants/queries.js"
import { Position, Tentacle } from "../ecs/constants/components.js"

const PHASE = { HIDDEN: 0, EMERGING: 1, ACTIVE: 2, RETRACTING: 3 }

// Each ECS tentacle entity anchors one *bundle* — a cluster of several
// individually-simulated tentacles fanned out around that anchor point,
// rather than one tentacle per entity.
const BUNDLE_COUNT_DEFAULT = 5
const TENTACLES_PER_BUNDLE_DEFAULT = 10
const MAX_BUNDLES = 8            // upper bound for buffer sizing
const MAX_PER_BUNDLE = 20        // upper bound for buffer sizing
const MAX_TENTACLES = MAX_BUNDLES * MAX_PER_BUNDLE

// ============================================================
// physics — ported from the original Tentacle.prototype.update(),
// plus an independent per-tentacle "wander" so tentacles in the same
// bundle don't move in lockstep.
// ============================================================

function createNodes(nodeCount, x, y) {
    const nodes = []
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({ x, y, ox: x, oy: y, vx: 0, vy: 0 })
    }
    return nodes
}

// per-node radius, base -> tip (replaces the old this.radius * settings.thickness taper)
function buildTaper(nodeCount, baseRadius, tipRadius) {
    const radii = new Float32Array(nodeCount)
    for (let i = 0; i < nodeCount; i++) {
        const t = nodeCount <= 1 ? 0 : i / (nodeCount - 1)
        radii[i] = THREE.MathUtils.lerp(baseRadius, tipRadius, t)
    }
    return radii
}

// weight ramp for the player-reach pull, tip pulls hardest
function buildReachWeights(nodeCount) {
    const weights = new Float32Array(nodeCount)
    for (let i = 1; i < nodeCount; i++) {
        weights[i] = i / (nodeCount - 1)
    }
    return weights
}

// Mutates `nodes` in place and fills `outer`/`inner` (length nodeCount - 1)
// with the ribbon edge points for this frame.
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

    // per-tentacle independent sway, so tentacles sharing a bundle don't
    // all bend the same way at the same moment
    const wanderX = Math.sin(time * wanderSpeed + seed * 6.283) * wanderStrength
    const wanderY = Math.cos(time * wanderSpeed * 0.8 + seed * 11.0) * wanderStrength

    const lastIndex = nodes.length - 1

    // Pass 1: integrate forces + fixed-spacing chase constraint into raw
    // node positions. On its own this tends to bend sharply at whichever
    // joint absorbs the most force each frame — the "finger knuckle" look.
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

        // traveling lateral wave, perpendicular to the direction the
        // tentacle emerges from the wall — amplitude ramps from 0 at the
        // base to full at the tip, and the phase shifts along the chain
        // so the bend visibly propagates outward instead of the whole
        // limb leaning as one rigid piece. Two layered frequencies (a
        // slow broad undulation + a faster small ripple) avoid it
        // reading as a single uniform sine curve.
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

    // Pass 2: curvature smoothing. Relax each interior joint toward the
    // midpoint of its immediate neighbors so a bend spreads continuously
    // across several joints instead of kinking sharply at one or two.
    // The base (fixed to the wall) and the tip are left alone.
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

    // Pass 3: commit the smoothed positions as "old" for next frame's
    // velocity calc (so the smoothing correction doesn't register as a
    // phantom velocity spike), and rebuild the ribbon edges from the
    // final, smoothed shape.
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

function edgeAnchor(edge, along, viewportW, viewportH) {
    const halfW = viewportW / 2
    const halfH = viewportH / 2
    switch (edge) {
        case 0: return { x: -halfW, y: along * viewportH, nx: 1, ny: 0 }
        case 1: return { x: halfW, y: along * viewportH, nx: -1, ny: 0 }
        case 2: return { x: along * viewportW, y: halfH, nx: 0, ny: -1 }
        default: return { x: along * viewportW, y: -halfH, nx: 0, ny: 1 }
    }
}

// ============================================================
// shader — same plume look as before
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

void main() {
  // fully soft radial falloff (no flat full-alpha plateau in the middle),
  // same shape as the exhaust's point-sprite falloff
  float edge = abs(vUv.y - 0.5) * 2.0;
  float softEdge = smoothstep(1.0, 0.0, edge);

  float turbA = sin(vUv.x * 16.0 + uTime * 2.0 + vSeed * 6.283) * 0.5 + 0.5;
  float turbB = sin(vUv.x * 33.0 - uTime * 3.4 + vSeed * 11.0) * 0.5 + 0.5;
  float density = mix(1.0, 1.0, turbA) * mix(1.0 - uNoiseStrength, 1.0, turbB);

  float tipFade = 1.0 - smoothstep(0.85, 1.0, vSegmentT);
  float baseFade = smoothstep(0.0, 0.04, vSegmentT);

  float alpha = softEdge * density * tipFade * baseFade * uOpacity;

  // hot core right at the wall, quickly giving way to the fire color,
  // then a long fade out to smoke toward the tip — same age-based
  // gradient shape as the exhaust's uHotCore -> uFireColor -> uSmokeColor
  vec3 color = mix(uHotCore, uFireColor, smoothstep(0.0, 0.15, vSegmentT));
  color = mix(color, uSmokeColor, smoothstep(0.15, 1.0, vSegmentT));

  float shade = mix(0.85, 1.15, vSeed);
  color *= shade;

  gl_FragColor = vec4(color, alpha);
}
`

export function TentacleRenderer() {

    const cfg = useControls('Eldritch / Organic Tentacles', {
        debugForceVisible: { value: true, label: '[DEBUG] Force Visible' },
        bundleCount: { value: BUNDLE_COUNT_DEFAULT, min: 1, max: MAX_BUNDLES, step: 1 },
        tentaclesPerBundle: { value: TENTACLES_PER_BUNDLE_DEFAULT, min: 1, max: MAX_PER_BUNDLE, step: 1 },
        bundleSpread: { value: 0.045, min: 0, max: 0.3, step: 0.005, label: 'bundle fan spread' },
        nodeCount: { value: 9, min: 3, max: 32, step: 1 },
        spacing: { value: 1.6, min: 0.2, max: 12, step: 0.1, label: 'segment spacing' },
        baseRadius: { value: 1.1, min: 0.1, max: 8, step: 0.05 },
        tipRadius: { value: 0.06, min: 0.02, max: 3, step: 0.02 },
        friction: { value: 0.82, min: 0, max: 0.98, step: 0.005 },
        gravity: { value: 0.3, min: -3, max: 3, step: 0.05 },
        wind: { value: -0.15, min: -3, max: 3, step: 0.05 },
        wanderStrength: { value: 0.5, min: 0, max: 5, step: 0.05 },
        wanderSpeed: { value: 1.1, min: 0, max: 5, step: 0.05 },
        waveAmplitude: { value: 1.4, min: 0, max: 8, step: 0.05, label: 'S-curve amplitude' },
        waveFrequency: { value: 0.6, min: 0, max: 3, step: 0.05, label: 'S-curve cycles' },
        waveSpeed: { value: 1.6, min: 0, max: 6, step: 0.05, label: 'S-curve speed' },
        detailAmplitude: { value: 0.5, min: 0, max: 4, step: 0.05, label: 'ripple amplitude' },
        detailFrequency: { value: 1.8, min: 0, max: 6, step: 0.05, label: 'ripple cycles' },
        detailSpeed: { value: 3.2, min: 0, max: 8, step: 0.05, label: 'ripple speed' },
        curvatureSmoothing: { value: 0.35, min: 0, max: 1, step: 0.02, label: 'joint smoothing' },
        smoothIterations: { value: 2, min: 0, max: 6, step: 1, label: 'smoothing passes' },
        reachStrength: { value: 5, min: 0, max: 30, step: 0.5 },
    }, { collapsed: false })

    const plumeCfg = useControls('Eldritch / Organic Tentacle Plume', {
        hotCore: { value: '#ff2614', label: 'hot core' },
        fireColor: { value: '#ff3308', label: 'fire color' },
        smokeColor: { value: '#7a1fbf', label: 'smoke color' },
        noiseStrength: { value: 0.6, min: 0, max: 1, step: 0.02 },
        opacity: { value: 0.35, min: 0, max: 2, step: 0.05 },
    }, { collapsed: false })

    const totalTentacles = cfg.bundleCount * cfg.tentaclesPerBundle

    // ribbon has nodeCount - 1 outer/inner point pairs -> nodeCount - 2
    // quads (each quad = 2 triangles) once there are at least 2 points
    const pointsPerTentacle = Math.max(cfg.nodeCount - 1, 2)
    const quadsPerTentacle = pointsPerTentacle - 1
    const vertsPerTentacle = pointsPerTentacle * 2 // outer + inner per point
    const totalVerts = MAX_TENTACLES * vertsPerTentacle
    const totalTris = MAX_TENTACLES * quadsPerTentacle * 2

    // persistent per-tentacle simulation state
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
                alongJitter: (Math.random() - 0.5) * 2, // -1..1, scaled by bundleSpread per frame
            })
        }
        stateRef.current = {
            nodeCount: cfg.nodeCount,
            tentacles,
            reachWeights: buildReachWeights(cfg.nodeCount),
        }
    }

    // static topology (indices, uv, aSegmentT, aSeed) — rebuilt only when
    // the node/point count changes; position is rewritten every frame
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

    const meshRef = useRef()

    useFrame((frameState, dt) => {
        if (!meshRef.current) return

        const t = frameState.clock.elapsedTime
        const viewportW = frameState.viewport.width
        const viewportH = frameState.viewport.height

        plumeMaterial.uniforms.uTime.value = t

        const { tentacles: sims, reachWeights } = stateRef.current
        const positions = positionAttr.array

        const bundleEntities = tentacleQuery()
        const players = playerQuery()
        const hasPlayer = players.length > 0
        const playerEid = hasPlayer ? players[0] : null

        // hide every slot beyond what's currently in use, in case
        // bundleCount/tentaclesPerBundle shrank since last frame
        for (let i = totalTentacles; i < MAX_TENTACLES; i++) {
            const vBase = i * vertsPerTentacle
            for (let p = 0; p < pointsPerTentacle; p++) {
                const outerIdx = vBase + p * 2
                const innerIdx = outerIdx + 1
                positions[outerIdx * 3] = positions[outerIdx * 3 + 1] = positions[outerIdx * 3 + 2] = 0
                positions[innerIdx * 3] = positions[innerIdx * 3 + 1] = positions[innerIdx * 3 + 2] = 0
            }
        }

        for (let b = 0; b < cfg.bundleCount; b++) {
            const active = b < bundleEntities.length
            const eid = active ? bundleEntities[b] : null

            const deployT = cfg.debugForceVisible ? 1 : (active ? Tentacle.deployT[eid] : 0)
            const visible = cfg.debugForceVisible || deployT > 0.001

            const edge = active ? Tentacle.edge[eid] : (b % 4)
            const bundleAlong = active ? Tentacle.along[eid] : ((b / cfg.bundleCount) - 0.5) * 0.8

            const isActivePhase = active && Tentacle.phase[eid] === PHASE.ACTIVE
            const reachActive = isActivePhase && hasPlayer
            const reachX = reachActive ? Position.x[playerEid] : 0
            const reachY = reachActive ? Position.y[playerEid] : 0

            for (let k = 0; k < cfg.tentaclesPerBundle; k++) {
                const i = b * cfg.tentaclesPerBundle + k
                const sim = sims[i]
                const vBase = i * vertsPerTentacle

                if (!visible) {
                    for (let p = 0; p < pointsPerTentacle; p++) {
                        const outerIdx = vBase + p * 2
                        const innerIdx = outerIdx + 1
                        positions[outerIdx * 3] = positions[outerIdx * 3 + 1] = positions[outerIdx * 3 + 2] = 0
                        positions[innerIdx * 3] = positions[innerIdx * 3 + 1] = positions[innerIdx * 3 + 2] = 0
                    }
                    continue
                }

                // fan this tentacle out slightly from the bundle's shared
                // anchor point, along the boundary edge it emerges from
                const along = bundleAlong + sim.alongJitter * cfg.bundleSpread
                const anchor = edgeAnchor(edge, along, viewportW, viewportH)

                const effSpacing = cfg.spacing * deployT
                const radii = buildTaper(cfg.nodeCount, cfg.baseRadius * deployT, cfg.tipRadius * deployT)

                // seed the chain toward the anchor on first activation so it
                // doesn't spawn from (0,0) and whip across the screen
                if (sim.nodes[0].x === 0 && sim.nodes[0].y === 0 && sim.nodes[1].x === 0 && sim.nodes[1].y === 0) {
                    for (const node of sim.nodes) {
                        node.x = node.ox = anchor.x
                        node.y = node.oy = anchor.y
                    }
                }

                // tangent along the boundary edge (perpendicular to the
                // anchor's inward normal) — the axis the S-curve wave
                // bends across
                const tangentX = -anchor.ny
                const tangentY = anchor.nx

                updateTentacle(
                    sim.nodes, sim.outer, sim.inner,
                    anchor.x, anchor.y,
                    effSpacing, cfg.friction, cfg.gravity, cfg.wind,
                    radii,
                    reachActive, reachX, reachY, cfg.reachStrength, reachWeights,
                    sim.seed, t, cfg.wanderStrength, cfg.wanderSpeed,
                    tangentX, tangentY,
                    cfg.waveAmplitude, cfg.waveFrequency, cfg.waveSpeed,
                    cfg.detailAmplitude, cfg.detailFrequency, cfg.detailSpeed,
                    cfg.curvatureSmoothing, cfg.smoothIterations
                )

                // only the bundle's own entity gets its tip fed back into
                // the ECS (used for hit detection etc.) — the fan-out
                // siblings are purely visual
                if (active && k === 0) {
                    const tip = sim.nodes[sim.nodes.length - 1]
                    Position.x[eid] = tip.x
                    Position.y[eid] = tip.y
                }

                for (let p = 0; p < pointsPerTentacle; p++) {
                    const o = sim.outer[p]
                    const n = sim.inner[p]
                    const outerIdx = vBase + p * 2
                    const innerIdx = outerIdx + 1

                    positions[outerIdx * 3] = o.x
                    positions[outerIdx * 3 + 1] = o.y
                    positions[outerIdx * 3 + 2] = 0.05

                    positions[innerIdx * 3] = n.x
                    positions[innerIdx * 3 + 1] = n.y
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
