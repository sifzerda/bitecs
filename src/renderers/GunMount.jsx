// src/renderers/GunMount.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation } from '../ecs/constants/components.js'
import { gameState } from '../state/gameState.js'
import { getGunTypeByWeaponId, getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'
import { WeaponMount } from './WeaponMount.jsx'

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

    const gunType = gameState.gunSkinOverride
        ? getGunTypeById(gameState.gunSkinOverride)
        : getGunTypeByWeaponId(gameState.currentWeapon)

    const { mount } = gunType.config

    const gunCfg = {
        enabled: true,
        typeId: gunType.id,
        offsetX: mount.offsetX,
        offsetY: mount.offsetY,
        scale: mount.scale,
        mirrored: true,
    }

    return (
        <group ref={groupRef}>
            <WeaponMount gunCfg={gunCfg} />
        </group>
    )
}