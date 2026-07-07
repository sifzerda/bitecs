// src/renderers/GunMount.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation } from '../ecs/constants/components.js'
import { gameState } from '../state/gameState.js'
import { getGunTypeByWeaponId } from '../ecs/constants/gunConfigs.js'
import { GunRenderer } from './GunRenderer.jsx'

const GUN_DIRECTION = Math.PI / 2

export function GunMount() {

    const groupRef = useRef()

    useFrame(() => {
        const group = groupRef.current
        if (!group) return

        const players = playerQuery()
        if (players.length === 0) {
            group.visible = false
            return
        }
        group.visible = true

        const pid = players[0]
        group.position.set(Position.x[pid], Position.y[pid], 0)
        group.rotation.set(0, 0, Rotation[pid])
    })

    const gunType = getGunTypeByWeaponId(gameState.currentWeapon)
    const { mount } = gunType.config

    return (
        <group ref={groupRef}>
            {/* Left hardpoint */}
            <GunRenderer
                config={gunType.config}
                position={[-mount.offsetX, mount.offsetY, 0.04]}
                rotation={[0, 0, GUN_DIRECTION]}
                scale={mount.scale}
            />
            {/* Right hardpoint (mirrored) */}
            <GunRenderer
                config={gunType.config}
                position={[mount.offsetX, mount.offsetY, 0.04]}
                rotation={[0, 0, GUN_DIRECTION]}
                scale={mount.scale}
            />
        </group>
    )
}