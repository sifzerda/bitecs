// src/debug/GodPanel.jsx

import { useEffect } from 'react'
import { useControls, button } from 'leva'
import { WEAPONS } from '../ecs/constants/weapons.js'
import { gameState } from '../state/gameState.js'
import { spawnBoss } from '../ecs/spawn.js'
import { playerQuery } from '../ecs/constants/queries.js'
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

    {/*
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
    }, [weapon])        */}


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