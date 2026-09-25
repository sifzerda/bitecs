// src/debug/GodPanel.jsx

import { useEffect } from 'react'
import { useControls, button } from 'leva'
import { WEAPONS } from '../ecs/weapons/config/weapons.js'
import { BOSSES } from '../ecs/constants/bosses.js'
import { gameState } from '../state/gameState.js'
import { spawnBoss, spawnOctopus } from '../ecs/spawn.js'
import { playerQuery } from '../ecs/constants/queries.js'
import { world } from '../ecs/constants/world.js'
import { removeEntity } from 'bitecs'
import { Position } from '../ecs/constants/components.js'

export function GodPanel() {

    {/*    }, [weapon])        */}

 

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