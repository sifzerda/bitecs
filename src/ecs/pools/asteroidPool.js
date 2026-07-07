// src/ecs/pools/asteroidPool.js

import { createPool } from './createPool'
import { Position, Velocity, Health, AsteroidTag, StatusEffect, Asteroid } from '../constants/components'

const pool = createPool({
    size: 64,   // tune to your max concurrent asteroid count
    components: [Position, Velocity, Health, AsteroidTag, StatusEffect, Asteroid],
    activeField: [Asteroid, 'active'],
    resetFields(id) {
        Position.x[id] = 0
        Position.y[id] = 0
        Velocity.x[id] = 0
        Velocity.y[id] = 0
        Health.current[id] = 0
        Health.max[id] = 0
        StatusEffect.frozen[id] = 0
    }
})

export const activeAsteroids = pool.active
export const initializeAsteroidPool = pool.initialize
export const acquireAsteroidEntity = pool.acquire
export const releaseAsteroidEntity = pool.release