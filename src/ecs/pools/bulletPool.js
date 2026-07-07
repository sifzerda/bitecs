// src/ecs/pools/bulletPool.js

// src/ecs/pools/bulletPool.js

import { createPool } from './createPool'
import { Position, Velocity, Lifetime, Bullet, BulletTag } from '../constants/components'

const pool = createPool({
    size: 2000,
    components: [Position, Velocity, Lifetime, Bullet, BulletTag],
    activeField: [Bullet, 'active'],
    resetFields(id) {
        Position.x[id] = 0
        Position.y[id] = 0
        Velocity.x[id] = 0
        Velocity.y[id] = 0
        Lifetime.remaining[id] = 0
        Bullet.type[id] = 0
        Bullet.owner[id] = 0
        Bullet.bounces[id] = 0
        Bullet.colorR[id] = 0
        Bullet.colorG[id] = 0
        Bullet.colorB[id] = 0
    }
})

export const activeBullets = pool.active
export const initializeBulletPool = pool.initialize
export const acquireBulletEntity = pool.acquire
export const releaseBulletEntity = pool.release