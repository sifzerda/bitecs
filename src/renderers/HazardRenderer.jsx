// src/renderers/HazardRenderer.jsx

import { useMemo, useRef } from 'react'
import { createRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../ecs/constants/world.js'
import { hazardQuery } from '../ecs/constants/queries.js'
import { Position, HazardZone, Lifetime } from '../ecs/constants/components.js'
import { getWeapon } from '../ecs/constants/weapons.js'

const MAX_HAZARDS = 32   // generous pool — bump if you ever expect more on screen at once

export function HazardRenderer() {

    const slotRefs = useRef(
        Array.from({ length: MAX_HAZARDS }, () => ({
            fill: createRef(),
            ring: createRef(),
        }))
    )

    const circleGeo = useMemo(() => new THREE.CircleGeometry(1, 24), [])
    const ringGeo = useMemo(() => new THREE.RingGeometry(0.9, 1, 24), [])

    useFrame(() => {

        const hazards = hazardQuery()

        for (let slot = 0; slot < MAX_HAZARDS; slot++) {

            const refs = slotRefs.current[slot]
            if (!refs.fill.current || !refs.ring.current) continue

            const hid = slot < hazards.length ? hazards[slot] : null

            refs.fill.current.visible = hid !== null
            refs.ring.current.visible = hid !== null

            if (hid === null) continue

            const weapon = getWeapon(HazardZone.weaponType[hid])
            const radius = weapon.hazardRadius ?? 1.5

            // fade in/out over the last 0.5s of life so hazards don't just pop away
            const fadeWindow = 0.5
            const life = Lifetime.remaining[hid]
            const opacity = Math.min(1, life / fadeWindow)

            refs.fill.current.position.set(Position.x[hid], Position.y[hid], -0.05)
            refs.ring.current.position.set(Position.x[hid], Position.y[hid], -0.04)

            refs.fill.current.scale.set(radius, radius, 1)
            refs.ring.current.scale.set(radius, radius, 1)

            refs.fill.current.material.color.set(weapon.color)
            refs.fill.current.material.opacity = 0.22 * opacity

            refs.ring.current.material.color.set(weapon.glowColor)
            refs.ring.current.material.opacity = 0.8 * opacity
        }
    })

    return (
        <>
            {slotRefs.current.map((refs, i) => (
                <group key={i}>
                    <mesh ref={refs.fill} geometry={circleGeo} frustumCulled={false}>
                        <meshBasicMaterial
                            transparent
                            opacity={0.22}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                    <mesh ref={refs.ring} geometry={ringGeo} frustumCulled={false}>
                        <meshBasicMaterial
                            transparent
                            opacity={0.8}
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