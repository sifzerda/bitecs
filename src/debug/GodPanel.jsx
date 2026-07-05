// src/debug/GodPanel.jsx

import { useEffect } from 'react'
import { useControls, button } from 'leva'
import { WEAPONS } from '../ecs/constants/weapons.js'
import { gameState } from '../state/gameState.js'
import { spawnDrone, spawnBoss } from '../ecs/spawn.js'
import { droneQuery, playerQuery } from '../ecs/constants/queries.js'
import { world } from '../ecs/constants/world.js'
import { removeEntity } from 'bitecs'
import { Position } from '../ecs/constants/components.js'

// Leva needs a { label: value } map for its dropdown options.
// Using weapon.name as the label and weapon.id as the underlying value
// means this list updates itself automatically as you add more weapons —
// no manual syncing needed here.
const weaponOptions = WEAPONS.reduce((acc, weapon) => {
    acc[`${weapon.id} — ${weapon.name}`] = weapon.id
    return acc
}, {})

export function GodPanel() {

    const { weapon } = useControls('Weapon Test', {
        weapon: {
            options: weaponOptions,
            value: gameState.currentWeapon,
        },
    })

    // gameState isn't reactive React state — it's a plain object your ECS
    // systems read directly every frame — so pushing the Leva value into it
    // just needs a side effect, not a re-render.
    useEffect(() => {
        gameState.currentWeapon = weapon
    }, [weapon])

    useControls('Weapon Test', {
        'Force Redeploy Drones': button(() => {

            const players = playerQuery()
            if (players.length === 0) return
            const pid = players[0]

            // clear any existing drones first, so this always gives you a
            // fresh, correctly-positioned set rather than adding more on top
            const existing = droneQuery()
            for (let i = 0; i < existing.length; i++) {
                removeEntity(world, existing[i])
            }

            const droneWeapon = WEAPONS.find(w => w.category === 'drone')
            if (!droneWeapon) return   // safety check in case the weapon entry gets renamed/removed later

            for (let i = 0; i < droneWeapon.droneCount; i++) {
                spawnDrone(Position.x[pid], Position.y[pid], droneWeapon.id, i, droneWeapon.droneCount)
            }
        }),
    })

    const { bossWeapon } = useControls('Boss Test', {
        bossWeapon: {
            options: weaponOptions,
            value: 0,
        },
        'Spawn Boss': button((get) => {
            spawnBoss(get('Boss Test.bossWeapon'))
        }),
    })

    return null   // this component only exists to drive the Leva panels + side effects
}