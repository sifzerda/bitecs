// src/fx/effectPool.js

export function createTypedEffectPool(
    capacity,
    scalarFields = [],
    vec3Fields = []
) {

    const pool = {

        capacity,

        // ==========================================================
        // Simulation data
        // ==========================================================

        alive: new Uint8Array(capacity),

        x: new Float32Array(capacity),
        y: new Float32Array(capacity),

        vx: new Float32Array(capacity),
        vy: new Float32Array(capacity),

        life: new Float32Array(capacity),
        maxLife: new Float32Array(capacity),

        cursor: 0,

        // ==========================================================
        // GPU instance data
        // ==========================================================

        // xyz
        instancePosition: new Float32Array(capacity * 3),
        // rgb
        instanceColor: new Float32Array(capacity * 3),
        // scalar
        instanceScale: new Float32Array(capacity),
        instanceRotation: new Float32Array(capacity),
        instanceAlpha: new Float32Array(capacity),
        
        instanceStretch: new Float32Array(capacity),

        // lets renderers know something changed
        dirty: true

    }

    // ----------------------------------------------------------
    // Extra scalar attributes
    // ----------------------------------------------------------

    for (const name of scalarFields) {
        pool[name] = new Float32Array(capacity)
    }

    // ----------------------------------------------------------
    // Extra vec3 attributes
    // ----------------------------------------------------------

    for (const name of vec3Fields) {
        pool[name] = new Float32Array(capacity * 3)
    }

    // ==========================================================
    // Allocate
    // ==========================================================

    pool.allocate = () => {

        for (let i = 0; i < capacity; i++) {

            const id = (pool.cursor + i) % capacity

            if (!pool.alive[id]) {

                pool.alive[id] = 1
                pool.cursor = (id + 1) % capacity

                // reset GPU attributes

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

                pool.dirty = true

                return id

            }

        }

        return -1

    }

    // ==========================================================
    // Kill
    // ==========================================================

    pool.kill = (id) => {

        if (!pool.alive[id])
            return

        pool.alive[id] = 0

        const p = id * 3

        pool.instanceScale[id] = 0
        pool.instanceAlpha[id] = 0

        pool.instancePosition[p] = 0
        pool.instancePosition[p + 1] = 0
        pool.instancePosition[p + 2] = 0

        pool.dirty = true

    }

    // ==========================================================
    // Clear
    // ==========================================================

    pool.clear = () => {

        pool.alive.fill(0)

        pool.instancePosition.fill(0)
        pool.instanceColor.fill(0)

        pool.instanceScale.fill(0)
        pool.instanceRotation.fill(0)
        pool.instanceAlpha.fill(0)

        pool.dirty = true

    }

    return pool

}