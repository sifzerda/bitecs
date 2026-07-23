// src/fx/effectPool.js

export function createTypedEffectPool(capacity, fields = []) {

    const pool = {

        capacity,

        alive: new Uint8Array(capacity),
        x: new Float32Array(capacity),
        y: new Float32Array(capacity),
        vx: new Float32Array(capacity),
        vy: new Float32Array(capacity),
        life: new Float32Array(capacity),
        maxLife: new Float32Array(capacity),

        cursor: 0

    }

    pool.allocate = () => {

        for (let i = 0; i < capacity; i++) {

            const id = (pool.cursor + i) % capacity

            if (!pool.alive[id]) {

                pool.alive[id] = 1
                pool.cursor = (id + 1) % capacity

                return id
            }

        }

        return -1
    }

    pool.kill = (id) => {
        pool.alive[id] = 0
    }

    pool.clear = () => {
        pool.alive.fill(0)
    }

    for (const name of fields) {
        pool[name] = new Float32Array(capacity)
    }

    return pool
}