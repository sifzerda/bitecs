// src/ecs/constants/emission.js

import { BOSSES } from './bosses.js'
import { BossType } from './components.js'

/*
============================================================
EMISSION COORDINATES
============================================================
*/

// ============================================================
// PLAYER
// ============================================================

export const PLAYER_CONFIG = {
    emission: {

        exhaust: {
            offsetX: 0,
            offsetY: -0.57,
            engineGap: 0.29,
            nozzleOffset: 0,
        },

        projectile: {
            offsetX: 0,
            offsetY: 0.9,
            gunGap: 0.495,
        },

        beam: {
            offsetX: 0,
            offsetY: 0.695,
            gunGap: 0.495,
        },

        missile: {
            offsetX: 0,
            offsetY: 0.695,
            gunGap: 0.495,
        },

        thrower: {
            offsetX: 0,
            offsetY: 0.695,
            gunGap: 0.495,
        },

    },
}

// ============================================================
// LOCAL -> WORLD
// ============================================================

export function localToWorldOffset(offsetX = 0, offsetY = 0, rot = 0) {
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)

    return {
        x: offsetX * cos - offsetY * sin,
        y: offsetX * sin + offsetY * cos,
    }
}

// ============================================================
// SINGLE EMISSION POINT
// ============================================================

export function getEmissionPoint(x, y, rot, config = {}, side = 0) {
    const gap = config.gunGap ?? config.engineGap ?? 0
    const sideOffset = side * gap

    const offset = localToWorldOffset((config.offsetX ?? 0) + sideOffset, (config.offsetY ?? 0) + (config.nozzleOffset ?? 0), rot)

    return {
        x: x + offset.x,
        y: y + offset.y,
    }
}


// ============================================================
// PAIRED POINTS
// ============================================================

export function getEmissionPair(x, y, rot, config = {}) {
    return {
        left: getEmissionPoint(x, y, rot, config, -1),
        right: getEmissionPoint(x, y, rot, config, 1),
    }
}

// ============================================================
// PLAYER CONFIG
// ============================================================

export function getPlayerEmissionConfig(type = 'projectile') {
    return PLAYER_CONFIG.emission[type] ?? {}
}


// ============================================================
// BOSS CONFIG
// ============================================================

export function getBossEmissionConfig(id, type = 'projectile') {
    const bossIndex = BossType.typeIndex[id] ?? 0
    const boss = BOSSES[bossIndex]
    return boss?.emission?.[type] ?? {}
}