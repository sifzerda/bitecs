// src/ecs/pools/sparkPool.js

import { createPool } from './createPool'
import { Position, Velocity, Lifetime, Spark, SparkTag } from '../constants/components'

const pool = createPool({
    size: 1500,
    components: [Position, Velocity, Lifetime, Spark, SparkTag],
    activeField: [Spark, 'active'],
    resetFields(id) {
        Position.x[id] = 0
        Position.y[id] = 0
        Velocity.x[id] = 0
        Velocity.y[id] = 0
        Lifetime.remaining[id] = 0
        Spark.maxLife[id] = 0
        Spark.size[id] = 0
    }
})

export const activeSparks = pool.active
export const initializeSparkPool = pool.initialize
export const acquireSparkEntity = pool.acquire
export const releaseSparkEntity = pool.release