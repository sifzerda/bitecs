// src/ecs/pools/asteroidPool.js
import { createPool } from "./createPool.js"

import {
    Position,
    Velocity,
    Health,
    AsteroidTag,
    StatusEffect,
    Asteroid,
} from "../constants/components.js"

export const ASTEROID_POOL_SIZE = 128

const pool = createPool({
    size: ASTEROID_POOL_SIZE,

    components: [
        Position,
        Velocity,
        Health,
        AsteroidTag,
        StatusEffect,
        Asteroid,
    ],

    activeField: [Asteroid, "active"],

    resetFields(id) {
        // Position
        Position.x[id] = 0
        Position.y[id] = 0

        // Velocity
        Velocity.x[id] = 0
        Velocity.y[id] = 0

        // Health
        Health.current[id] = 0
        Health.max[id] = 0

        // Status effects
        StatusEffect.frozen[id] = 0
        StatusEffect.corrosionDamage[id] = 0
        StatusEffect.corrosionRemaining[id] = 0

        // Physical properties
        Asteroid.scale[id] = 0
        Asteroid.radius[id] = 0

        // Classification
        Asteroid.type[id] = 0

        // AI
        Asteroid.behaviourTimer[id] = 0
        Asteroid.turnRate[id] = 0
        Asteroid.acceleration[id] = 0
        Asteroid.maxSpeed[id] = 0

        // Appearance
        Asteroid.visualRotation[id] = 0
        Asteroid.spinSpeed[id] = 0

        // Splitting
        Asteroid.generation[id] = 0

        // IMPORTANT:
        // Do not reset Asteroid.spawnVersion[id].
        // It must persist across pool reuse.
    },
})

export const activeAsteroids = pool.active

export const initializeAsteroidPool = pool.initialize
export const disposeAsteroidPool = pool.dispose

export const acquireAsteroidEntity = pool.acquire
export const releaseAsteroidEntity = pool.release

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        pool.dispose()
    })
}