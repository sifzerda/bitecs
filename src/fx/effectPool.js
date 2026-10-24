// src/fx/effectPool.js

export function createTypedEffectPool(capacity, scalarFields = [], vec3Fields = []) {

    if (!Number.isInteger(capacity) || capacity < 1)
        throw new Error("Invalid effect capacity")

    const p = { capacity, activeCount: 0, freeCount: capacity, dirty: true }

    p.alive = new Uint8Array(capacity)
    p.freeList = new Int32Array(capacity)
    p.activeIds = new Int32Array(capacity)
    p.activeIndex = new Int32Array(capacity).fill(-1)

    const scalars = new Set(["x", "y", "vx", "vy", "life", "maxLife", "instanceScale", "instanceRotation", "instanceAlpha", "instanceStretch", ...scalarFields])
    const vectors = new Set(["instancePosition", "instanceColor", ...vec3Fields])

    for (const name of scalars) {
        if (vectors.has(name) || name in p) throw new Error(`Duplicate effect field: ${name}`)
        p[name] = new Float32Array(capacity)
    }
    for (const name of vectors) {
        if (name in p) throw new Error(`Duplicate effect field: ${name}`)
        p[name] = new Float32Array(capacity * 3)
    }
    function reset(id) {
        for (const name of scalars) p[name][id] = 0
        for (const name of vectors) p[name].fill(0, id * 3, id * 3 + 3)
    }
    p.allocate = () => {

        if (!p.freeCount) return -1
        const id = p.freeList[--p.freeCount]
        reset(id)

        p.alive[id] = 1
        p.activeIndex[id] = p.activeCount
        p.activeIds[p.activeCount++] = id
        p.instanceScale[id] = p.instanceAlpha[id] = 1
        p.instanceColor.fill(1, id * 3, id * 3 + 3)
        p.dirty = true

        return id
    }
    p.kill = id => {

        if (!Number.isInteger(id) || id < 0 || id >= capacity || !p.alive[id]) return

        const index = p.activeIndex[id]
        const moved = p.activeIds[--p.activeCount]

        if (index < p.activeCount) {
            p.activeIds[index] = moved; p.activeIndex[moved] = index
        }
        p.activeIndex[id] = -1
        p.alive[id] = 0
        p.freeList[p.freeCount++] = id
        reset(id)

        p.dirty = true
    }
    p.clear = () => {
        p.alive.fill(0);
        p.activeIndex.fill(-1);
        p.activeIds.fill(0)

        for (const name of scalars) p[name].fill(0)
        for (const name of vectors) p[name].fill(0)
        for (let id = 0; id < capacity; id++)
            p.freeList[id] = id
        p.activeCount = 0;
        p.freeCount = capacity;
        p.dirty = true
    }

    p.clear()

    return p
}