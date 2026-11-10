// src/ecs/constants/asteroidWaves.js

import { ASTEROID_TYPE as T } from "./asteroidTypes.js"

// Weights are relative probabilities.
// Each zone introduces new types gradually.
const ZONE_WEIGHTS = [
    { [T.NORMAL]: 85, [T.HEAVY]: 15 },
    { [T.NORMAL]: 65, [T.HEAVY]: 25, [T.FAST]: 10 },
    { [T.NORMAL]: 55, [T.HEAVY]: 20, [T.FAST]: 25 },
    { [T.NORMAL]: 45, [T.HEAVY]: 25, [T.FAST]: 30 },

    { [T.NORMAL]: 45, [T.FAST]: 20, [T.ERRATIC]: 25, [T.SPLITTER]: 10 },
    { [T.NORMAL]: 35, [T.HEAVY]: 15, [T.ERRATIC]: 30, [T.SPLITTER]: 20 },

    { [T.NORMAL]: 40, [T.FAST]: 20, [T.HUNTER]: 20, [T.SPLITTER]: 20 },
    { [T.NORMAL]: 30, [T.ERRATIC]: 20, [T.HUNTER]: 30, [T.SPLITTER]: 20 },

    { [T.NORMAL]: 25, [T.FAST]: 25, [T.ERRATIC]: 20, [T.HUNTER]: 30 },
    { [T.NORMAL]: 20, [T.HEAVY]: 20, [T.SPLITTER]: 30, [T.HUNTER]: 30 },

    { [T.NORMAL]: 15, [T.FAST]: 25, [T.ERRATIC]: 20, [T.SPLITTER]: 20, [T.HUNTER]: 20 },
    { [T.NORMAL]: 10, [T.HEAVY]: 15, [T.FAST]: 15, [T.ERRATIC]: 20, [T.SPLITTER]: 20, [T.HUNTER]: 20 },
]

export function selectAsteroidType(zoneIndex) {
    const index = Math.max(0, Math.min(ZONE_WEIGHTS.length - 1, Math.trunc(Number(zoneIndex) || 0)))
    const weights = ZONE_WEIGHTS[index]
    const entries = Object.entries(weights)
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0)

    let roll = Math.random() * total

    for (const [type, weight] of entries) {
        roll -= weight

        if (roll < 0) {
            return Number(type)
        }
    }

    return T.NORMAL
}
