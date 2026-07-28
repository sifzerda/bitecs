// src/fx/effectPool.js

export function createTypedEffectPool(capacity, scalarFields = [], vec3Fields = []) {

    const pool = {

        capacity,

        // simulation
        alive: new Uint8Array(capacity),
        x: new Float32Array(capacity),
        y: new Float32Array(capacity),
        vx: new Float32Array(capacity),
        vy: new Float32Array(capacity),
        life: new Float32Array(capacity),
        maxLife: new Float32Array(capacity),

        cursor: 0,

        // active tracking
        activeIds: new Int32Array(capacity),
        activeIndex: new Int32Array(capacity),
        activeCount: 0,

        // gpu data

        instancePosition: new Float32Array(capacity * 3),
        instanceColor: new Float32Array(capacity * 3),
        instanceScale: new Float32Array(capacity),
        instanceRotation: new Float32Array(capacity),
        instanceAlpha: new Float32Array(capacity),
        instanceStretch: new Float32Array(capacity),

        dirty: true

    }

    // extra scalar attributes
    for (const name of scalarFields) {
        pool[name] = new Float32Array(capacity)
    }

    // extra vec3 attributes
    for (const name of vec3Fields) {
        pool[name] = new Float32Array(capacity * 3)
    }

    // allocate

    pool.allocate = () => {

        for (let i = 0; i < capacity; i++) {

            const id = (pool.cursor + i) % capacity


            if (!pool.alive[id]) {

                pool.alive[id] = 1
                pool.cursor = (id + 1) % capacity

                const index = pool.activeCount
                pool.activeIds[index] = id
                pool.activeIndex[id] = index
                pool.activeCount++

                const p = id * 3

                pool.instancePosition[p] = 0
                pool.instancePosition[p + 1] = 0
                pool.instancePosition[p + 2] = 0

                pool.instanceColor[p] = 1
                pool.instanceColor[p + 1] = 1
                pool.instanceColor[p + 2] = 1

                pool.instanceScale[id] = 1
                pool.instanceRotation[id] = 0
                pool.instanceAlpha[id] = 1
                pool.instanceStretch[id] = 0

                pool.dirty = true

                return id
            }
        }

        return -1

    }

    // swap-remove kill

    pool.kill = (id) => {

        if (!pool.alive[id])
            return

        pool.alive[id] = 0

        const index = pool.activeIndex[id]
        const lastIndex = pool.activeCount - 1

        if (index !== lastIndex) {

            const moved = pool.activeIds[lastIndex]

            pool.activeIds[index] = moved
            pool.activeIndex[moved] = index
        }

        pool.activeCount--

        const p = id * 3

        pool.instancePosition[p] = 0
        pool.instancePosition[p + 1] = 0
        pool.instancePosition[p + 2] = 0

        pool.instanceScale[id] = 0
        pool.instanceAlpha[id] = 0

        pool.dirty = true
    }

    pool.clear = () => {

        pool.alive.fill(0)
        pool.activeCount = 0
        pool.instancePosition.fill(0)
        pool.instanceColor.fill(0)
        pool.instanceScale.fill(0)
        pool.instanceRotation.fill(0)
        pool.instanceAlpha.fill(0)

        pool.dirty = true

    }

    return pool

}