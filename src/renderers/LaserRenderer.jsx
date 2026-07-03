// src/renderers/LaserRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laserState } from '../state/laserState.js'
import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/constants/weapons.js'

const CORE_WIDTH_MULT = 1
const GLOW_WIDTH_MULT = 2.6
const HALO_WIDTH_MULT = 4.5

export function LaserRenderer() {

    const coreRef = useRef()
    const glowRef = useRef()
    const haloRef = useRef()

    // unit cylinder, height 1, axis along Y by default — scale.y stretches it to beam length
    const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), [])

    useFrame(() => {

        const core = coreRef.current
        const glow = glowRef.current
        const halo = haloRef.current
        if (!core || !glow || !halo) return

        const active = gameState.currentWeapon === 4 && laserState.active && laserState.length > 0.01

        if (!active) {
            core.visible = false
            glow.visible = false
            halo.visible = false
            return
        }

        core.visible = true
        glow.visible = true
        halo.visible = true

        const weapon = getWeapon(4)

        const dx = laserState.hitX - laserState.originX
        const dy = laserState.hitY - laserState.originY
        const length = laserState.length

        const midX = laserState.originX + dx * 0.5
        const midY = laserState.originY + dy * 0.5

        const angle = Math.atan2(dy, dx) - Math.PI / 2   // align cylinder's Y axis with beam direction
        const width = weapon.beamWidth

        core.position.set(midX, midY, 0.02)
        glow.position.set(midX, midY, 0.015)
        halo.position.set(midX, midY, 0.01)

        core.rotation.set(0, 0, angle)
        glow.rotation.set(0, 0, angle)
        halo.rotation.set(0, 0, angle)

        core.scale.set(width * CORE_WIDTH_MULT, length, width * CORE_WIDTH_MULT)
        glow.scale.set(width * GLOW_WIDTH_MULT, length, width * GLOW_WIDTH_MULT)
        halo.scale.set(width * HALO_WIDTH_MULT, length, width * HALO_WIDTH_MULT)

    })

    return (
        <>
            <mesh ref={haloRef} geometry={geometry} frustumCulled={false}>
                <meshBasicMaterial
                    color="#ff0033"
                    transparent
                    opacity={0.18}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh ref={glowRef} geometry={geometry} frustumCulled={false}>
                <meshBasicMaterial
                    color="#ff0055"
                    transparent
                    opacity={0.4}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh ref={coreRef} geometry={geometry} frustumCulled={false}>
                <meshBasicMaterial
                    color="#ffe0ee"
                    transparent
                    opacity={0.95}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </>
    )
}