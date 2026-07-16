// src/renderers/BossMount.jsx

import { createRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { bossQuery } from '../ecs/constants/queries.js'
import { Position, Rotation, BossType } from '../ecs/constants/components.js'
import { BOSSES } from '../ecs/constants/bosses.js'
import { WeaponMount } from './WeaponMount.jsx'

const MAX_BOSSES = 4

export function BossMount() {

    // groupRefs[slot][bossType] — one outer group per boss slot (follows
    // that slot's active entity), containing one inner group per boss
    // type; only the slot's currently-active type is made visible.
    const groupRefs = useMemo(
        () => Array.from({ length: MAX_BOSSES }, () => BOSSES.map(() => createRef())),
        []
    )

    useFrame(() => {
        const bosses = bossQuery()

        for (let slot = 0; slot < MAX_BOSSES; slot++) {
            const eid = slot < bosses.length ? bosses[slot] : null
            const activeType = eid !== null ? BossType.typeIndex[eid] : -1

            for (let t = 0; t < BOSSES.length; t++) {
                const group = groupRefs[slot][t].current
                if (!group) continue

                if (t === activeType) {
                    group.visible = true
                    group.position.set(Position.x[eid], Position.y[eid], 0)
                    group.rotation.set(0, 0, Rotation[eid])
                } else {
                    group.visible = false
                }
            }
        }
    })

    return (
        <>
            {groupRefs.map((slotRefs, slot) =>
                BOSSES.map((bossCfg, t) => (
                    <group key={`${slot}-${bossCfg.key}`} ref={slotRefs[t]} visible={false}>
                        <WeaponMount gunCfg={bossCfg.gun} />
                    </group>
                ))
            )}
        </>
    )
}