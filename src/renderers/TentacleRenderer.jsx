// src/renderers/TentacleRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useControls } from "leva"
import * as THREE from "three"
import { playerQuery, tentacleQuery } from "../ecs/constants/queries.js"
import { Position, Tentacle } from "../ecs/constants/components.js"

const PHASE = { HIDDEN: 0, EMERGING: 1, ACTIVE: 2, RETRACTING: 3 }
const MAX_TENTACLES = 16

// ============================================================

function createChain(segmentCount, originX, originY) {
    const points = []
    for (let i = 0; i <= segmentCount; i++) {
        points.push({ x: originX, y: originY, px: originX, py: originY })
    }
    return points
}

function buildReachWeights(segmentCount) {
    const weights = [0]
    for (let i = 1; i <= segmentCount; i++) {
        weights.push(i / segmentCount)
    }
    return weights
}

function curl(x, y, time, freq, speed) {
    const n1 = Math.sin(y * freq + time * speed)
    const n2 = Math.cos(x * freq - time * speed)
    return [n1, n2]
}

function integrate(
    points,
    forceX, forceY,
    damping, dt,
    reachWeights, reachActive, reachX, reachY, reachStrength,
    curlStrength, curlFreq, curlSpeed, curlDetailStrength, curlDetailFreq, curlDetailSpeed,
    time
) {
    for (let i = 1; i < points.length; i++) {
        const p = points[i]
        const vx = (p.x - p.px) * damping
        const vy = (p.y - p.py) * damping
        p.px = p.x
        p.py = p.y

        let fx = forceX
        let fy = forceY

        const [c1x, c1y] = curl(p.x, p.y, time, curlFreq, curlSpeed)
        fx += c1x * curlStrength
        fy += c1y * curlStrength

        const [c2x, c2y] = curl(p.x, p.y, time, curlDetailFreq, curlDetailSpeed)
        fx += c2x * curlDetailStrength
        fy += c2y * curlDetailStrength

        if (reachActive) {
            const dx = reachX - p.x
            const dy = reachY - p.y
            const dist = Math.hypot(dx, dy) || 0.0001
            const w = reachWeights[i]
            fx += (dx / dist) * reachStrength * w
            fy += (dy / dist) * reachStrength * w
        }

        p.x += vx + fx * dt * dt
        p.y += vy + fy * dt * dt
    }
}

function satisfyConstraints(points, segmentLength, anchorX, anchorY, iterations) {
    for (let iter = 0; iter < iterations; iter++) {
        points[0].x = anchorX
        points[0].y = anchorY

        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i]
            const b = points[i + 1]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const dist = Math.hypot(dx, dy) || 0.0001
            const diff = (dist - segmentLength) / dist
            const offX = dx * 0.5 * diff
            const offY = dy * 0.5 * diff

            if (i !== 0) {
                a.x += offX
                a.y += offY
            }
            b.x -= offX
            b.y -= offY
        }
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

function buildSegmentPlaneGeometry(baseWidth, tipWidth, length) {
    const hb = baseWidth / 2
    const ht = tipWidth / 2

    // 4 verts: base-top, base-bottom, tip-top, tip-bottom
    const positions = new Float32Array([
        0, hb, 0,
        0, -hb, 0,
        length, ht, 0,
        length, -ht, 0,
    ])
    const uvs = new Float32Array([
        0, 1,
        0, 0,
        1, 1,
        1, 0,
    ])
    const indices = [0, 1, 2, 2, 1, 3]

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    return geo
}
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

vec4 worldPosition = instanceMatrix * vec4(position,1.0);
 
  vec4 mvPosition = modelViewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
}
`

const plumeFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying float vSegmentT;
varying float vSeed;

uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorGlow;
uniform vec3 uColorFade;
uniform float uNoiseStrength;
uniform float uOpacity;

void main() {
  // soft cross-section — fades from center to edge, no hard boundary
  float edge = abs(vUv.y - 0.5) * 2.0;
  float softEdge = smoothstep(1.0, 0.3, edge);

  // turbulent density along the strip's length, two frequencies layered
  // (same family as the position curl noise, applied to opacity instead)
  float turbA = sin(vUv.x * 16.0 + uTime * 2.0 + vSeed * 6.283) * 0.5 + 0.5;
  float turbB = sin(vUv.x * 33.0 - uTime * 3.4 + vSeed * 11.0) * 0.5 + 0.5;
  float density = mix(1.0 - uNoiseStrength, 1.0, turbA) * mix(1.0 - uNoiseStrength, 1.0, turbB);

  // fade out toward the very tip (wisps into nothing) and right at the
  // wall (no hard pop-in at the anchor)
  float tipFade = 1.0 - smoothstep(0.78, 1.0, vSegmentT);
  float baseFade = smoothstep(0.0, 0.06, vSegmentT);

  float alpha = softEdge * density * tipFade * baseFade * uOpacity;

  vec3 color = mix(uColorCore, uColorGlow, smoothstep(0.0, 0.5, vSegmentT));
  color = mix(color, uColorFade, smoothstep(0.5, 1.0, vSegmentT));

  gl_FragColor = vec4(color, alpha);
}
`

export function TentacleRenderer() {

    const cfg = useControls('Eldritch / Tentacles', {
        debugForceVisible: { value: true, label: '[DEBUG] Force Visible' },
        segmentCount: { value: 12, min: 3, max: 24, step: 1 },
        segmentLength: { value: 3.5, min: 0.5, max: 12, step: 0.1 },
        baseWidth: { value: 2.6, min: 0.1, max: 8, step: 0.1 },
        tipWidth: { value: 0.4, min: 0.02, max: 3, step: 0.05 },
        damping: { value: 0.965, min: 0.8, max: 1, step: 0.005 },
        iterations: { value: 8, min: 1, max: 16, step: 1 },
        reachStrength: { value: 5, min: 0, max: 30, step: 0.5 },
    }, { collapsed: false })

    const curlCfg = useControls('Eldritch / Tentacle Curl', {
        curlStrength: { value: 4.0, min: 0, max: 15, step: 0.1 },
        curlFreq: { value: 0.35, min: 0.02, max: 2, step: 0.01 },
        curlSpeed: { value: 1.2, min: 0, max: 5, step: 0.05 },
        detailStrength: { value: 1.5, min: 0, max: 10, step: 0.1 },
        detailFreq: { value: 1.4, min: 0.05, max: 5, step: 0.05 },
        detailSpeed: { value: 2.6, min: 0, max: 8, step: 0.05 },
    }, { collapsed: false })

    const plumeCfg = useControls('Eldritch / Tentacle Plume', {
        colorCore: '#ff2ecb',   // hot glow near the wall/anchor
        colorGlow: '#7a1fbf',   // mid-length
        colorFade: '#04051a',   // near-black at the tip, wisps into void
        noiseStrength: { value: 0.6, min: 0, max: 1, step: 0.02 },
        opacity: { value: 0.85, min: 0, max: 2, step: 0.05 },
    }, { collapsed: false })

      const segmentGeometry = useMemo(
        () => buildSegmentPlaneGeometry(cfg.baseWidth, cfg.tipWidth, cfg.segmentLength),
        [cfg.baseWidth, cfg.tipWidth, cfg.segmentLength]
    )

    const chainsRef = useRef(
        Array.from({ length: MAX_TENTACLES }, () => createChain(cfg.segmentCount, 0, 0))
    )

    const reachWeights = useMemo(() => buildReachWeights(cfg.segmentCount), [cfg.segmentCount])

    const totalSegments = MAX_TENTACLES * cfg.segmentCount

     const { segmentTArray, seedArray } = useMemo(() => {
        const segmentTArray = new Float32Array(totalSegments)
        const seedArray = new Float32Array(totalSegments)
        for (let i = 0; i < MAX_TENTACLES; i++) {
            const tentacleSeed = Math.random()
            for (let s = 0; s < cfg.segmentCount; s++) {
                const idx = i * cfg.segmentCount + s
                segmentTArray[idx] = s / (cfg.segmentCount - 1)
                seedArray[idx] = tentacleSeed
            }
        }
        return { segmentTArray, seedArray }
    }, [cfg.segmentCount, totalSegments])

     const plumeMaterial = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: plumeVertexShader,
        fragmentShader: plumeFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColorCore: { value: new THREE.Color(plumeCfg.colorCore) },
            uColorGlow: { value: new THREE.Color(plumeCfg.colorGlow) },
            uColorFade: { value: new THREE.Color(plumeCfg.colorFade) },
            uNoiseStrength: { value: plumeCfg.noiseStrength },
            uOpacity: { value: plumeCfg.opacity },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    }), []) // uniforms updated live below, no need to rebuild material on control change

    // keep uniforms in sync with Leva without recreating the material
    plumeMaterial.uniforms.uColorCore.value.set(plumeCfg.colorCore)
    plumeMaterial.uniforms.uColorGlow.value.set(plumeCfg.colorGlow)
    plumeMaterial.uniforms.uColorFade.value.set(plumeCfg.colorFade)
    plumeMaterial.uniforms.uNoiseStrength.value = plumeCfg.noiseStrength
    plumeMaterial.uniforms.uOpacity.value = plumeCfg.opacity

    const meshRef = useRef()

const _matrix = useMemo(() => new THREE.Matrix4(), [])
    const _pos = useMemo(() => new THREE.Vector3(), [])
    const _quat = useMemo(() => new THREE.Quaternion(), [])
    const _scale = useMemo(() => new THREE.Vector3(1, 1, 1), [])
    const _zero = useMemo(() => new THREE.Vector3(0, 0, 0), [])
    const _euler = useMemo(() => new THREE.Euler(), [])

    useFrame((frameState, dt) => {
        if (!meshRef.current) return

        const safeDt = Math.min(dt, 1 / 30)
        const t = frameState.clock.elapsedTime
        const viewportW = frameState.viewport.width
        const viewportH = frameState.viewport.height

        plumeMaterial.uniforms.uTime.value = t

        const tentacles = tentacleQuery()
        const players = playerQuery()
        const hasPlayer = players.length > 0
        const playerEid = hasPlayer ? players[0] : null

        for (let i = 0; i < MAX_TENTACLES; i++) {
            const active = i < tentacles.length
            const eid = active ? tentacles[i] : null
            const chain = chainsRef.current[i]

            const deployT = cfg.debugForceVisible ? 1 : (active ? Tentacle.deployT[eid] : 0)
            const visible = cfg.debugForceVisible || deployT > 0.001

            if (visible) {
                const edge = active ? Tentacle.edge[eid] : (i % 4)
                const along = active ? Tentacle.along[eid] : ((i / MAX_TENTACLES) - 0.5) * 0.8
                const anchor = edgeAnchor(edge, along, viewportW, viewportH)
                const effSegmentLength = cfg.segmentLength * deployT

                const inwardX = anchor.nx * 1.5
                const inwardY = anchor.ny * 1.5

                const isActivePhase = active && Tentacle.phase[eid] === PHASE.ACTIVE
                const reachActive = isActivePhase && hasPlayer
                const reachX = reachActive ? Position.x[playerEid] : 0
                const reachY = reachActive ? Position.y[playerEid] : 0

                integrate(
                    chain, inwardX, inwardY, cfg.damping, safeDt,
                    reachWeights, reachActive, reachX, reachY, cfg.reachStrength,
                    curlCfg.curlStrength, curlCfg.curlFreq, curlCfg.curlSpeed,
                    curlCfg.detailStrength, curlCfg.detailFreq, curlCfg.detailSpeed,
                    t
                )
                satisfyConstraints(chain, effSegmentLength, anchor.x, anchor.y, cfg.iterations)

                if (active) {
                    const tip = chain[chain.length - 1]
                    Position.x[eid] = tip.x
                    Position.y[eid] = tip.y
                }

                for (let s = 0; s < cfg.segmentCount; s++) {
                    const a = chain[s]
                    const c = chain[s + 1]
                    const angle = Math.atan2(c.y - a.y, c.x - a.x)

                    _pos.set(a.x, a.y, 0.05)
                    _euler.set(0, 0, angle)
                    _quat.setFromEuler(_euler)
                    _matrix.compose(_pos, _quat, _scale)
                    meshRef.current.setMatrixAt(i * cfg.segmentCount + s, _matrix)
                }
            } else {
                for (let s = 0; s < cfg.segmentCount; s++) {
                    _matrix.compose(_zero, _quat, _zero)
                    meshRef.current.setMatrixAt(i * cfg.segmentCount + s, _matrix)
                }
            }
        }

        meshRef.current.instanceMatrix.needsUpdate = true
        meshRef.current.count = totalSegments
    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[segmentGeometry, plumeMaterial, totalSegments]}
            frustumCulled={false}
        >
            <instancedBufferAttribute attach="geometry-attributes-aSegmentT" args={[segmentTArray, 1]} />
            <instancedBufferAttribute attach="geometry-attributes-aSeed" args={[seedArray, 1]} />
        </instancedMesh>
    )
}