// src/debug/GodPanel.jsx

import { useEffect } from 'react'
import { useControls, button } from 'leva'
import { WEAPONS } from '../ecs/constants/weapons.js'
import { gameState } from '../state/gameState.js'
import { spawnBoss, spawnOctopus } from '../ecs/spawn.js'
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

        const { octopusEnabled } = useControls('Eldritch / Octopuses', {
        octopusEnabled: {
            label: 'Octopuses Active',
            value: true,
        },
    })

       useEffect(() => {
        gameState.octopusEnabled = octopusEnabled
    }, [octopusEnabled])

    useControls('Octopus Test', {
        octopusSpawnCount: { value: 3, min: 1, max: 6, step: 1, label: 'spawn count' },
        'Spawn Octopuses': button((get) => {
            const count = get('Octopus Test.octopusSpawnCount')
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2
                const dist = Math.random() * 8
                spawnOctopus(Math.cos(angle) * dist, Math.sin(angle) * dist)
            }
        }),
    })

    //const { tentaclesEnabled } = useControls('Eldritch Boss', {
    //    tentaclesEnabled: {
    //        label: 'Tentacles Active',
    //        value: false,
    //    },
    // })

    // useEffect(() => {
    //     gameState.tentaclesEnabled = tentaclesEnabled
    // }, [tentaclesEnabled])


    return null
}