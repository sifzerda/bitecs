// src/debug/GodPanel.jsx

import { useEffect } from 'react'
import { useControls, button } from 'leva'
import { WEAPONS } from '../ecs/constants/weapons.js'
import { BOSSES } from '../ecs/constants/bosses.js'
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

// Same self-updating pattern for bosses — new entries added to BOSSES
// automatically show up here. "player" is excluded since it's the
// player ship config, not a spawnable boss.
const bossOptions = BOSSES.reduce((acc, boss) => {
    if (boss.key === "player") return acc
    acc[boss.name] = boss.key
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


    // Boss weapon is no longer chosen separately — spawnBoss derives the
    // fired weapon from whichever gun the selected boss visually carries
    // (bossCfg.gun.typeId), so this panel only needs to pick which boss.
    useControls('Boss Test', {
        bossKey: {
            label: 'Boss',
            options: bossOptions,
            value: Object.values(bossOptions)[0],
        },
        'Spawn Boss': button((get) => {
            spawnBoss(get('Boss Test.bossKey'))
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