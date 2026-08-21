// src/ecs/pools/createPool.js

import { addEntity, addComponent, removeEntity } from 'bitecs'
import { world } from '../constants/world'

export function createPool({ size, components, activeField, resetFields }) {

    const [ActiveComponent, activeKey] = activeField

    const pool = []
    const active = []

    // free-list: stack of currently-unused pool indices.
    // acquire() pops, release() pushes — both O(1)
    // regardless of how full the pool is.
    const freeList = []
    let initialized = false

    function initialize() {
        if (initialized) return
        initialized = true

        for (let i = 0; i < size; i++) {
            const id = addEntity(world)
            for (const c of components) addComponent(world, id, c)
            ActiveComponent[activeKey][id] = 0
            pool.push(id)
            freeList.push(i)
        }
    }

    function dispose() {
        if (!initialized) return

        for (const id of pool) {
            removeEntity(world, id)
        }

        pool.length = 0
        active.length = 0
        freeList.length = 0
        initialized = false
    }

    function acquire() {
        if (freeList.length === 0) {
            return -1
        }

        const poolIndex = freeList.pop()
        const id = pool[poolIndex]

        ActiveComponent[activeKey][id] = 1
        active.push(id)

        return id
    }

    function release(id) {
        if (!ActiveComponent[activeKey][id]) return

        ActiveComponent[activeKey][id] = 0

        const index = active.indexOf(id)
        if (index !== -1) {
            active[index] = active[active.length - 1]
            active.pop()
        }

        resetFields?.(id)

        // return this id's pool slot to the free list.
        // pool[] never reorders, so the slot index is just
        // this id's position in pool[].
        freeList.push(pool.indexOf(id))
    }

    return { initialize, dispose, acquire, release, active, pool }
}