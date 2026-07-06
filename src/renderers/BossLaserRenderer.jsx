// src/renderers/BossLaserRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { bossLaserState } from '../state/bossLaserState.js'
import { bossAIQuery } from '../ecs/constants/queries.js'
import { BossAI } from '../ecs/constants/components.js'
import { getWeapon } from '../ecs/constants/weapons.js'

const CORE_WIDTH_MULT = 1
const GLOW_WIDTH_MULT = 2.6
const HALO_WIDTH_MULT = 4.5

export function BossLaserRenderer() {

    const coreRef = useRef()
    const glowRef = useRef()
    const haloRef = useRef()

    // unit cylinder, height 1, axis along Y by default — scale.y stretches it to beam length
    const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), [])

    useFrame(() => {

        if (!coreRef.current || !glowRef.current || !haloRef.current) return

        const visible = bossLaserState.active && bossLaserState.hit

        coreRef.current.visible = visible
        glowRef.current.visible = visible
        haloRef.current.visible = visible

        if (!visible) return

        // pull the boss's current weapon so beamWidth/colors stay accurate even
        // if the boss switches weapons mid-fight
        const bosses = bossAIQuery()
        if (bosses.length === 0) {
            coreRef.current.visible = false
            glowRef.current.visible = false
            haloRef.current.visible = false
            return
        }

        const weapon = getWeapon(BossAI.weapon[bosses[0]])

        const dx = bossLaserState.hitX - bossLaserState.originX
        const dy = bossLaserState.hitY - bossLaserState.originY
        const length = Math.hypot(dx, dy)

        if (length < 0.01) {
            coreRef.current.visible = false
            glowRef.current.visible = false
            haloRef.current.visible = false
            return
        }

        const dirX = dx / length
        const dirY = dy / length

        const midX = bossLaserState.originX + dirX * length * 0.5
        const midY = bossLaserState.originY + dirY * length * 0.5

        const angle = Math.atan2(dirY, dirX) - Math.PI / 2   // align cylinder's Y axis with beam direction
        const width = weapon.beamWidth ?? 0.12

        coreRef.current.position.set(midX, midY, 0.02)
        glowRef.current.position.set(midX, midY, 0.015)
        haloRef.current.position.set(midX, midY, 0.01)

        coreRef.current.rotation.set(0, 0, angle)
        glowRef.current.rotation.set(0, 0, angle)
        haloRef.current.rotation.set(0, 0, angle)

        coreRef.current.scale.set(width * CORE_WIDTH_MULT, length, width * CORE_WIDTH_MULT)
        glowRef.current.scale.set(width * GLOW_WIDTH_MULT, length, width * GLOW_WIDTH_MULT)
        haloRef.current.scale.set(width * HALO_WIDTH_MULT, length, width * HALO_WIDTH_MULT)

        coreRef.current.material.color.set(weapon.color)
        glowRef.current.material.color.set(weapon.glowColor)
        haloRef.current.material.color.set(weapon.haloColor)
    })

    return (
        <group>
            <mesh ref={haloRef} geometry={geometry} frustumCulled={false}>
                <meshBasicMaterial
                    transparent
                    opacity={0.18}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh ref={glowRef} geometry={geometry} frustumCulled={false}>
                <meshBasicMaterial
                    transparent
                    opacity={0.4}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh ref={coreRef} geometry={geometry} frustumCulled={false}>
                <meshBasicMaterial
                    transparent
                    opacity={0.95}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    )
}