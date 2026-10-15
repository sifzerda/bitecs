
// src/renderers/OctopusMinionRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { octopusMinionQuery } from "../ecs/constants/queries.js"
import {
    Position,
    Velocity,
    Rotation,
    OctopusMinion,
} from "../ecs/constants/components.js"

const MAX_MINIONS = 3
const TENTACLE_COUNT = 6
const TENTACLE_SEGMENTS = 8
const TENTACLE_SIDES = 6

const BODY_RADIUS = 0.48
const TENTACLE_LENGTH = 0.95

function createTentacleGeometry() {
    const vertexCount =
        (TENTACLE_SEGMENTS + 1) * TENTACLE_SIDES

    const positions = new Float32Array(vertexCount * 3)
    const indices = []

    for (let segment = 0; segment < TENTACLE_SEGMENTS; segment++) {
        for (let side = 0; side < TENTACLE_SIDES; side++) {
            const a = segment * TENTACLE_SIDES + side
            const b = segment * TENTACLE_SIDES + (side + 1) % TENTACLE_SIDES
            const c = (segment + 1) * TENTACLE_SIDES + side
            const d = (segment + 1) * TENTACLE_SIDES + (side + 1) % TENTACLE_SIDES

            indices.push(a, b, c, b, d, c)
        }
    }

    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    )

    geometry.setIndex(indices)

    return geometry
}

function updateTentacleGeometry(geometry, time, tentacleIndex, phase) {
    const positions = geometry.attributes.position.array

    const angle =
        (tentacleIndex / TENTACLE_COUNT) * Math.PI * 2

    const baseX = Math.cos(angle) * BODY_RADIUS * 0.65
    const baseY = Math.sin(angle) * BODY_RADIUS * 0.65

    const directionX = Math.cos(angle)
    const directionY = Math.sin(angle)

    for (let segment = 0; segment <= TENTACLE_SEGMENTS; segment++) {
        const t = segment / TENTACLE_SEGMENTS

        const wave =
            Math.sin(time * 2.2 + phase + t * 4 + tentacleIndex) *
            0.16 *
            t

        const curl =
            Math.sin(t * Math.PI) * 0.18

        const x =
            baseX +
            directionX * TENTACLE_LENGTH * t -
            directionY * (wave + curl)

        const y =
            baseY +
            directionY * TENTACLE_LENGTH * t +
            directionX * (wave + curl)

        const radius =
            0.105 * (1 - t * 0.82)

        for (let side = 0; side < TENTACLE_SIDES; side++) {
            const sideAngle =
                (side / TENTACLE_SIDES) * Math.PI * 2

            const index =
                (segment * TENTACLE_SIDES + side) * 3

            positions[index] =
                x + Math.cos(sideAngle) * radius

            positions[index + 1] =
                y + Math.sin(sideAngle) * radius

            positions[index + 2] =
                Math.sin(sideAngle + time * 1.5 + phase) *
                0.035
        }
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
}

function Minion({ index, groupRef, tentacleRefs, geometries }) {
    const bodyMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#a64be0",
                roughness: 0.48,
                metalness: 0.12,
                emissive: "#351044",
                emissiveIntensity: 0.5,
            }),
        []
    )

    const tentacleMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#8135bd",
                roughness: 0.5,
                metalness: 0.1,
                emissive: "#260b38",
                emissiveIntensity: 0.35,
                side: THREE.DoubleSide,
            }),
        []
    )

    const eyeMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#ffffff",
                emissive: "#ffffff",
                emissiveIntensity: 0.3,
            }),
        []
    )

    const pupilMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#160b20",
                roughness: 0.2,
            }),
        []
    )

    return (
        <group ref={groupRef} visible={false}>
            {Array.from({ length: TENTACLE_COUNT }, (_, i) => (
                <mesh
                    key={`tentacle-${index}-${i}`}
                    ref={(ref) => {
                        tentacleRefs.current[index][i] = ref
                    }}
                    geometry={geometries[index][i]}
                    material={tentacleMaterial}
                />
            ))}

            <mesh material={bodyMaterial}>
                <sphereGeometry args={[BODY_RADIUS, 20, 16]} />
            </mesh>

            {/* Eyes */}
            {[-1, 1].map((side) => (
                <group
                    key={`eye-${side}`}
                    position={[side * 0.17, 0.13, 0.39]}
                >
                    <mesh material={eyeMaterial}>
                        <sphereGeometry args={[0.105, 12, 12]} />
                    </mesh>

                    <mesh
                        material={pupilMaterial}
                        position={[0, 0, 0.085]}
                    >
                        <sphereGeometry args={[0.052, 10, 10]} />
                    </mesh>
                </group>
            ))}
        </group>
    )
}

export default function OctopusMinionRenderer() {
    const groupRefs = useRef([])
    const tentacleRefs = useRef(
        Array.from(
            { length: MAX_MINIONS },
            () => Array(TENTACLE_COUNT).fill(null)
        )
    )

    const phaseOffsets = useMemo(
        () => [0, 2.1, 4.2],
        []
    )

    const geometries = useMemo(
        () =>
            Array.from(
                { length: MAX_MINIONS },
                () =>
                    Array.from(
                        { length: TENTACLE_COUNT },
                        () => createTentacleGeometry()
                    )
            ),
        []
    )

    useFrame((state) => {
        const time = state.clock.elapsedTime
        const minions = octopusMinionQuery()

        for (let i = 0; i < MAX_MINIONS; i++) {
            const group = groupRefs.current[i]

            if (!group) continue

            const id = minions[i]

            if (id === undefined) {
                group.visible = false
                continue
            }

            group.visible = true

            group.position.set(
                Position.x[id],
                Position.y[id],
                0
            )

            const vx = Velocity.x[id]
            const vy = Velocity.y[id]

            if (Math.abs(vx) + Math.abs(vy) > 0.01) {
                group.rotation.z = Math.atan2(vy, vx)
            } else {
                group.rotation.z = Rotation[id] || 0
            }

            const pulse =
                1 + Math.sin(time * 3 + phaseOffsets[i]) * 0.035

            group.scale.setScalar(pulse)

            for (let t = 0; t < TENTACLE_COUNT; t++) {
                const mesh = tentacleRefs.current[i]?.[t]

                if (!mesh) continue

                updateTentacleGeometry(
                    mesh.geometry,
                    time,
                    t,
                    phaseOffsets[i] + i
                )
            }
        }
    })

return (
    <>
        {Array.from({ length: MAX_MINIONS }, (_, i) => (
            <Minion
                key={i}
                index={i}
                groupRef={(ref) => {
                    groupRefs.current[i] = ref
                }}
                tentacleRefs={tentacleRefs}
                geometries={geometries}
            />
        ))}
    </>
)
}
