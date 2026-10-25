// src/ecs/pools/createPool.js

import { addEntity, addComponent, removeEntity } from "bitecs"
import { world } from "../constants/world.js"

export function createPool({ size, components, activeField, resetFields }) {

    const [component, key] = activeField
    const pool = []
    const active = []
    const free = []
    const slotById = new Map()
    const indexById = new Map()

    let initialized = false

    function initialize() {

        if (initialized)
            return

        for (let i = 0; i < size; i++) {
            const id = addEntity(world)

            for (const c of components)
                addComponent(world, id, c)
            component[key][id] = 0;
            resetFields?.(id)
            pool.push(id);
            free.push(i);
            slotById.set(id, i)
        }
        initialized = true
    }

    function acquire() {

        if (!free.length)
            return -1

        const id = pool[free.pop()]

        resetFields?.(id);
        component[key][id] = 1
        indexById.set(id, active.length);
        active.push(id)

        return id
    }

    function release(id) {
        const index = indexById.get(id)

        if (index === undefined)
            return

        const moved = active.pop()
        if (index < active.length) {
            active[index] = moved;
            indexById.set(moved, index)
        }
        indexById.delete(id);
        component[key][id] = 0; 
        resetFields?.(id);
        free.push(slotById.get(id))
    }

    function dispose() {

        if (!initialized)
            return
        for (const id of pool) removeEntity(world, id)

        pool.length = active.length = free.length = 0;

        slotById.clear();
        indexById.clear();
        initialized = false
    }
    return { initialize, dispose, acquire, release, active, pool }
}
