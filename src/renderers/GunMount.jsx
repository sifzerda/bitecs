// src/renderers/GunMount.jsx

import { world } from '../ecs/constants/world.js'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerQuery, bossQuery } from '../ecs/constants/queries.js'
import { Position, Rotation, BossType, Invulnerability } from '../ecs/constants/components.js'
import { BOSSES } from '../ecs/constants/bosses.js'
import { startState } from '../state/startState.js'
import { getGunTypeByWeaponId, getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'
import { WeaponMount } from './WeaponMount.jsx'

function FollowingGuns({ eid, gunCfg, player = false }) {

    const ref = useRef()

    useFrame(() => {

        const g = ref.current; if (!g) return
        const ids = player ? playerQuery() : bossQuery()
        const id = player ? ids[0] : eid

        if (id === undefined || (!player && !ids.includes(id))) {
            g.visible = false; return
        }

        g.visible = !player
            || Invulnerability.remaining[id] <= 0
            || Math.floor(world.time.elapsed * 10) % 2 === 0
        g.position.set(Position.x[id], Position.y[id], player ? 0 : 0.15)
        g.rotation.z = Rotation[id]
    })

    return <group ref={ref} visible={false}>
        <WeaponMount gunCfg={gunCfg} />

    </group>
}

export function GunMount() {
    const [weapon, setWeapon] = useState(() => ({
        id: startState.currentWeapon,
        skin: startState.gunSkinOverride
    }))

    const [bosses, setBosses] = useState([])
    const cache = useRef({ id: weapon.id, skin: weapon.skin, bosses: "" })

    useFrame(() => {
        const c = cache.current
        if (c.id !== startState.currentWeapon || c.skin !== startState.gunSkinOverride) {
            c.id = startState.currentWeapon; c.skin = startState.gunSkinOverride; setWeapon({ id: c.id, skin: c.skin })
        }
        const ids = bossQuery(), key = ids.map(id => `${id}:${BossType.typeIndex[id]}`).join(",")
        if (key !== c.bosses) { c.bosses = key; setBosses(ids.map(eid => ({ eid, type: BossType.typeIndex[eid] }))) }
    })

    const type = weapon.skin != null ? getGunTypeById(weapon.skin) : getGunTypeByWeaponId(weapon.id)
    return (
        <>
            {type &&
                <FollowingGuns player gunCfg={{ typeId: type.id, enabled: true, mirrored: true }} />
            }
            {bosses.map(({ eid, type }) => {
                const cfg = BOSSES[type];

                return (
                    cfg?.isShip !== false && cfg?.gunVisible !== false && cfg?.gun ?
                        <FollowingGuns key={`${eid}:${type}`} eid={eid} gunCfg={cfg.gun} />
                        : null
                )
            })}
        </>
    )
}
