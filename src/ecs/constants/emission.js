// src/ecs/constants/emission.js

import { BOSSES } from './bosses.js'
import { BossType } from './components.js'

/*
    All offsets are LOCAL TO THE SHIP.

    x = sideways
    y = forward

    Positive Y = ship nose
    Negative Y = ship rear

    The offsets rotate automatically with the ship.
*/

export const PLAYER_CONFIG = {
    emission: {

        exhaust: {
            offsetX: 0,
            offsetY: -0.70,
            engineGap: 0.15,
            nozzleOffset: 0,
        },

        projectile: {
            offsetX: 0,
            offsetY: 0.55,
        },

        beam: {
            offsetX: 0,
            offsetY: 0.55,
        },

        thrower: {
            offsetX: 0,
            offsetY: 0.55,
        },
    },
}

export function localToWorldOffset(offsetX = 0, offsetY = 0, rot = 0) {
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)

    return {
        x: offsetX * cos - offsetY * sin,
        y: offsetX * sin + offsetY * cos,
    }
}

export function getEmissionPoint(x, y, rot, config = {}) {
    const offset = localToWorldOffset(
        config.offsetX ?? 0,
        config.offsetY ?? 0,
        rot
    )

    return {
        x: x + offset.x,
        y: y + offset.y,
    }
}

export function getBossEmissionConfig(id, type = 'projectile') {
    const bossIndex = BossType.typeIndex[id] ?? 0
    const boss = BOSSES[bossIndex]

    return boss?.emission?.[type] ?? {}
}