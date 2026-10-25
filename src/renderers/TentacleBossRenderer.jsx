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
import { TentacleRenderer } from "./TentacleRenderer.jsx"

const vertexShader = /* glsl */ `
    attribute float aSeed;
    attribute float aWarning;

    varying vec2 vUv;
    varying float vSeed;
    varying float vWarning;

    void main() {
        vUv = uv;
        vSeed = aSeed;
        vWarning = aWarning;

        gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position, 1.0);
    }
`

const fragmentShader = /* glsl */ `
    precision highp float;

    varying vec2 vUv;
    varying float vSeed;
    varying float vWarning;

    uniform float uTime;
    uniform vec3 uHotCore;
    uniform vec3 uFireColor;
    uniform vec3 uSmokeColor;

    void main() {
        float along = vUv.x;
        float edge = abs(vUv.y - 0.5) * 2.0;

        float softEdge =
            1.0 - smoothstep(0.55, 1.0, edge);

        float tipFade =
            1.0 - smoothstep(0.85, 1.0, along);

        float baseFade =
            smoothstep(0.0, 0.04, along);

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

        // Highlight the arm that is preparing to strike.
        float pulse = 0.5 + 0.5 * sin(uTime * 12.0);

        color = mix(
            color,
            vec3(1.0, 0.70, 0.10),
            vWarning * (0.55 + pulse * 0.20)
        );

        float alpha =
            softEdge *
            tipFade *
            baseFade *
            0.18;

        gl_FragColor = vec4(color, alpha);
    }
`

function buildBuffers() {
    const vertices = OCTOPUS.count * OCTOPUS.segments * 2

    const positions = new Float32Array(vertices * 3)
    const uvs = new Float32Array(vertices * 2)
    const seeds = new Float32Array(vertices)
    const warnings = new Float32Array(vertices)

    const indices = new Uint32Array(
        OCTOPUS.count * (OCTOPUS.segments - 1) * 6
    )

    let cursor = 0

    for (let arm = 0; arm < OCTOPUS.count; arm++) {
        const base = arm * OCTOPUS.segments * 2
        const seed = ((arm + 1) * 0.61803398875) % 1

        for (let j = 0; j < OCTOPUS.segments; j++) {
            const vertex = base + j * 2
            const t = j / (OCTOPUS.segments - 1)

            uvs[vertex * 2] = t
            uvs[vertex * 2 + 1] = 1

            uvs[(vertex + 1) * 2] = t
            uvs[(vertex + 1) * 2 + 1] = 0

            seeds[vertex] = seed
            seeds[vertex + 1] = seed

            if (j === OCTOPUS.segments - 1) continue

            indices[cursor++] = vertex
            indices[cursor++] = vertex + 1
            indices[cursor++] = vertex + 2

            indices[cursor++] = vertex + 2
            indices[cursor++] = vertex + 1
            indices[cursor++] = vertex + 3
        }
    }

    return { positions, uvs, seeds, warnings, indices }
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

        uniforms.uTime.value = s.time

        body.position.set(s.coreX, s.coreY, 0.1)

        const healthFraction = THREE.MathUtils.clamp(
            Health.current[s.eid] /
                Math.max(1, Health.max[s.eid]),
            0,
            1
        )

        body.material.emissiveIntensity =
            0.6 +
            (1 - healthFraction) +
            Math.sin(s.time * 4) * 0.15

        marker.position.set(s.targetX, s.targetY, 0.2)

        marker.scale.setScalar(
            1 + Math.sin(s.time * 18) * 0.12
        )

        for (let arm = 0; arm < OCTOPUS.count; arm++) {
            const base = arm * OCTOPUS.segments

            const preparing =
                arm === s.attack && s.warning ? 1 : 0

            for (let j = 0; j < OCTOPUS.segments; j++) {
                const i = base + j

                const previous = base + Math.max(0, j - 1)

                const next = base + Math.min(
                    OCTOPUS.segments - 1,
                    j + 1
                )

                const dx = s.x[next] - s.x[previous]
                const dy = s.y[next] - s.y[previous]
                const length = Math.hypot(dx, dy)

                const nx = length > 0.00001 ? -dy / length : 0
                const ny = length > 0.00001 ? dx / length : 1

                const radius = s.radius[i]
                const vertex = i * 2
                const offset = vertex * 3

                buffers.positions[offset] =
                    s.x[i] + nx * radius

                buffers.positions[offset + 1] =
                    s.y[i] + ny * radius

                buffers.positions[offset + 2] = 0.06

                buffers.positions[offset + 3] =
                    s.x[i] - nx * radius

                buffers.positions[offset + 4] =
                    s.y[i] - ny * radius

                buffers.positions[offset + 5] = 0.06

                buffers.warnings[vertex] = preparing
                buffers.warnings[vertex + 1] = preparing
            }
        }

        mesh.geometry.attributes.position.needsUpdate = true
        mesh.geometry.attributes.aWarning.needsUpdate = true
    })

    return (
        <>
            {/* Original decorative bundles remain unchanged. */}
            <TentacleRenderer />

            {/* Six gameplay tentacles use the same thin ribbon style. */}
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
                        attach="attributes-aWarning"
                        args={[buffers.warnings, 1]}
                        usage={THREE.DynamicDrawUsage}
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
                <sphereGeometry
                    args={[OCTOPUS.coreRadius, 20, 14]}
                />

                <meshStandardMaterial
                    color="#37245c"
                    emissive="#a329ff"
                    roughness={0.35}
                    metalness={0.4}
                />
            </mesh>

            <mesh
                ref={warning}
                visible={false}
                renderOrder={100}
            >
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