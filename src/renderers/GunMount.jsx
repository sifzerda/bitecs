// src/renderers/GunMount.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation } from '../ecs/constants/components.js'
import { gameState } from '../state/gameState.js'
import { getGunTypeByWeaponId } from '../ecs/constants/gunConfigs.js'
import { GunRenderer } from './GunRenderer.jsx'

// Gun local +X = forward. Ship's forward convention (matches laserSystem/
// flameSystem/spawnBullet) is sin(-rot)/cos(-rot), i.e. ship nose is +Y
// locally — so each gun gets a fixed -90° twist to point its muzzle the
// same way the ship's nose points, then inherits the ship's live rotation.
const GUN_ORIENTATION = Math.PI / 2

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
                rotation={[0, 0, GUN_ORIENTATION]}
                scale={mount.scale}
            />
            {/* Right hardpoint (mirrored) */}
            <GunRenderer
                config={gunType.config}
                position={[mount.offsetX, mount.offsetY, 0.04]}
                rotation={[0, 0, GUN_ORIENTATION]}
                scale={mount.scale}
            />
        </group>
    )
}