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

        // free-list: stack of currently-unused slot ids.
        // allocate() pops, kill() pushes — both O(1) regardless
        // of how full the pool is.
        freeList: new Int32Array(capacity),
        freeCount: capacity,

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

    for (let i = 0; i < capacity; i++) {
        pool.freeList[i] = i
    }

    // extra scalar attributes
    for (const name of scalarFields) {
        pool[name] = new Float32Array(capacity)
    }

    // extra vec3 attributes
    for (const name of vec3Fields) {
        pool[name] = new Float32Array(capacity * 3)
    }

    // allocate — O(1)

    pool.allocate = () => {

        if (pool.freeCount === 0) {
            return -1
        }

        pool.freeCount--
        const id = pool.freeList[pool.freeCount]

        pool.alive[id] = 1

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

    // swap-remove kill — O(1)

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

        // reset simulation fields so a reused slot
        // never inherits the previous occupant's data
        pool.x[id] = 0
        pool.y[id] = 0
        pool.vx[id] = 0
        pool.vy[id] = 0
        pool.life[id] = 0
        pool.maxLife[id] = 0

        for (const name of scalarFields) {
            pool[name][id] = 0
        }

        for (const name of vec3Fields) {
            const vp = id * 3
            pool[name][vp] = 0
            pool[name][vp + 1] = 0
            pool[name][vp + 2] = 0
        }

        const p = id * 3

        pool.instancePosition[p] = 0
        pool.instancePosition[p + 1] = 0
        pool.instancePosition[p + 2] = 0

        pool.instanceScale[id] = 0
        pool.instanceAlpha[id] = 0

        pool.dirty = true

        // return the id to the free list
        pool.freeList[pool.freeCount] = id
        pool.freeCount++
    }

    pool.clear = () => {

        pool.alive.fill(0)
        pool.activeCount = 0

        for (let i = 0; i < capacity; i++) {
            pool.freeList[i] = i
        }
        pool.freeCount = capacity

        pool.instancePosition.fill(0)
        pool.instanceColor.fill(0)
        pool.instanceScale.fill(0)
        pool.instanceRotation.fill(0)
        pool.instanceAlpha.fill(0)

        pool.dirty = true

    }

    return pool

}