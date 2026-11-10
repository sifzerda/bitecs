// src/renderers/SpawnWarningRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { getArenaBounds } from "../ecs/constants/arenaBounds.js"
import {
    getSpawnWarnings,
    updateSpawnWarnings,
} from "../ecs/waves/spawnWarningState.js"

import { useGameStore, SCREEN } from "../../store/gameStore.js"

const MAX_WARNINGS = 64
const EDGE_INSET = 0.45
const WARNING_SIZE = 0.28

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

export function SpawnWarningRenderer() {
    const mesh = useRef(null)

    const dummy = useMemo(() => new THREE.Object3D(), [])

    const geometry = useMemo(
        () => new THREE.RingGeometry(0.65, 1, 24),
        []
    )

    const material = useMemo(
        () => new THREE.MeshBasicMaterial({
            color: "#ff7043",
            transparent: true,
            opacity: 0.85,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false,
        }),
        []
    )

    useFrame((_, delta) => {
        if (!mesh.current) return

        const state = useGameStore.getState()
        const running =
            state.screen === SCREEN.PLAY && !state.paused

        if (running) {
            updateSpawnWarnings(Math.min(delta, 0.1))
        }

        const warnings = getSpawnWarnings()
        const bounds = getArenaBounds()

        const left = bounds.left + EDGE_INSET
        const right = bounds.right - EDGE_INSET
        const bottom = bounds.bottom + EDGE_INSET
        const top = bounds.top - EDGE_INSET

        const count = Math.min(warnings.length, MAX_WARNINGS)

        for (let i = 0; i < count; i++) {
            const warning = warnings[i]

            const x = clamp(warning.x, left, right)
            const y = clamp(warning.y, bottom, top)

            const progress = clamp(
                warning.remaining / warning.duration,
                0,
                1
            )

            const pulse = 1 + 0.3 * Math.sin(
                (1 - progress) * Math.PI * 8
            )

            const size = WARNING_SIZE * pulse

            dummy.position.set(x, y, 3)
            dummy.rotation.set(0, 0, 0)
            dummy.scale.set(size, size, 1)
            dummy.updateMatrix()

            mesh.current.setMatrixAt(i, dummy.matrix)
        }

        mesh.current.count = count
        mesh.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh
            ref={mesh}
            args={[geometry, material, MAX_WARNINGS]}
            frustumCulled={false}
            renderOrder={100}
        />
    )
}
