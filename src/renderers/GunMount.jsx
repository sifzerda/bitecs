// src/renderers/GunMount.jsx

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerQuery, bossQuery } from '../ecs/constants/queries.js'
import { Position, Rotation, BossType } from '../ecs/constants/components.js'
import { BOSSES } from '../ecs/constants/bosses.js'
import { gameState } from '../state/gameState.js'
import { getGunTypeByWeaponId, getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'
import { WeaponMount } from './WeaponMount.jsx'

const MAX_BOSSES = 4

export function GunMount() {

    const playerGroupRef = useRef()
    const bossRefsByEid = useRef(new Map())
    const [activeBosses, setActiveBosses] = useState([])

    useFrame(() => {
        const pGroup = playerGroupRef.current
        if (pGroup) {
            const players = playerQuery()
            if (players.length === 0) {
                pGroup.visible = false
            } else {
                const pid = players[0]
                pGroup.visible = true
                pGroup.position.set(Position.x[pid], Position.y[pid], 0)
                pGroup.rotation.set(0, 0, Rotation[pid])
            }
        }

        const bosses = bossQuery()
        const currentEids = bosses.slice(0, MAX_BOSSES)

        for (const eid of currentEids) {
            const group = bossRefsByEid.current.get(eid)
            if (group?.current) {
                group.current.visible = true
                group.current.position.set(Position.x[eid], Position.y[eid], 0)
                group.current.rotation.set(0, 0, Rotation[eid])
            }
        }

        // only trigger a re-render (mount/unmount) when the SET of active
        // eids actually changes — not on every reorder
        const prevIds = activeBosses.map(b => b.eid).sort().join(',')
        const nextIds = currentEids.slice().sort().join(',')

        if (prevIds !== nextIds) {
            const next = currentEids.map(eid => ({ eid, type: BossType.typeIndex[eid] }))
            setActiveBosses(next)
        }
    })

    const gunType = gameState.gunSkinOverride
        ? getGunTypeById(gameState.gunSkinOverride)
        : getGunTypeByWeaponId(gameState.currentWeapon)

    const { mount } = gunType.config
    const playerGunCfg = {
        enabled: true,
        typeId: gunType.id,
        offsetX: mount.offsetX,
        offsetY: mount.offsetY,
        scale: mount.scale,
        mirrored: true,
    }

    return (
        <>
            <group ref={playerGroupRef}>
                <WeaponMount gunCfg={playerGunCfg} />
            </group>

            {activeBosses.map(({ eid, type }) => {
                const bossCfg = BOSSES[type]
                console.log('boss gun mount', bossCfg?.key, bossCfg?.gun)
                if (!bossRefsByEid.current.has(eid)) {
                    bossRefsByEid.current.set(eid, { current: null })
                }
                const ref = bossRefsByEid.current.get(eid)
                return (
                    <group key={eid} ref={ref} visible={false}>
                        {bossCfg && <WeaponMount gunCfg={bossCfg.gun} />}
                    </group>
                )
            })}
        </>
    )
}