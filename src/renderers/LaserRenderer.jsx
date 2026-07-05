// src/renderers/LaserRenderer.jsx

import { useMemo, useRef } from 'react'
import { createRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laserState } from '../state/laserState.js'
import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/constants/weapons.js'

const CORE_WIDTH_MULT = 1
const GLOW_WIDTH_MULT = 2.6
const HALO_WIDTH_MULT = 4.5

const MAX_BEAMS = 3   // matches the highest beamCount across all beam weapons (prism beam)

export function LaserRenderer() {

    // one {core, glow, halo} ref-set per possible simultaneous beam slot
    const beamRefs = useRef(
        Array.from({ length: MAX_BEAMS }, () => ({
            core: createRef(),
            glow: createRef(),
            halo: createRef(),
        }))
    )

    // unit cylinder, height 1, axis along Y by default — scale.y stretches it to beam length
    const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), [])

    useFrame(() => {

        const weapon = getWeapon(gameState.currentWeapon)
        const isBeamWeapon = weapon.category === "beam"
        const active = isBeamWeapon && laserState.active && laserState.hits && laserState.hits.length > 0

        for (let slot = 0; slot < MAX_BEAMS; slot++) {

            const refs = beamRefs.current[slot]
            if (!refs.core.current || !refs.glow.current || !refs.halo.current) continue

            const hitData = active ? laserState.hits[slot] : null
            const visible = !!hitData && hitData.hitT > 0.01

            refs.core.current.visible = visible
            refs.glow.current.visible = visible
            refs.halo.current.visible = visible

            if (!visible) continue

            const dirX = hitData.dirX
            const dirY = hitData.dirY
            const length = hitData.hitT

            const midX = laserState.originX + dirX * length * 0.5
            const midY = laserState.originY + dirY * length * 0.5

            const angle = Math.atan2(dirY, dirX) - Math.PI / 2   // align cylinder's Y axis with beam direction
            const width = weapon.beamWidth

            refs.core.current.position.set(midX, midY, 0.02)
            refs.glow.current.position.set(midX, midY, 0.015)
            refs.halo.current.position.set(midX, midY, 0.01)

            refs.core.current.rotation.set(0, 0, angle)
            refs.glow.current.rotation.set(0, 0, angle)
            refs.halo.current.rotation.set(0, 0, angle)

            refs.core.current.scale.set(width * CORE_WIDTH_MULT, length, width * CORE_WIDTH_MULT)
            refs.glow.current.scale.set(width * GLOW_WIDTH_MULT, length, width * GLOW_WIDTH_MULT)
            refs.halo.current.scale.set(width * HALO_WIDTH_MULT, length, width * HALO_WIDTH_MULT)

            // colors now driven by the equipped weapon's own palette instead of a fixed red/pink
            refs.core.current.material.color.set(weapon.color)
            refs.glow.current.material.color.set(weapon.glowColor)
            refs.halo.current.material.color.set(weapon.haloColor)
        }

    })

    return (
        <>
            {beamRefs.current.map((refs, i) => (
                <group key={i}>
                    <mesh ref={refs.halo} geometry={geometry} frustumCulled={false}>
                        <meshBasicMaterial
                            transparent
                            opacity={0.18}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    <mesh ref={refs.glow} geometry={geometry} frustumCulled={false}>
                        <meshBasicMaterial
                            transparent
                            opacity={0.4}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    <mesh ref={refs.core} geometry={geometry} frustumCulled={false}>
                        <meshBasicMaterial
                            transparent
                            opacity={0.95}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </group>
            ))}
        </>
    )
}