// src/ecs/pools/createPool.js

import { addEntity, addComponent } from 'bitecs'
import { world } from '../constants/world'

export function createPool({ size, components, activeField, resetFields }) {

    const [ActiveComponent, activeKey] = activeField

    const pool = []
    const active = []
    let initialized = false

    function initialize() {
        if (initialized) return
        initialized = true

        for (let i = 0; i < size; i++) {
            const id = addEntity(world)
            for (const c of components) addComponent(world, id, c)
            ActiveComponent[activeKey][id] = 0
            pool.push(id)
        }
    }

    function acquire() {
        for (let i = 0; i < pool.length; i++) {
            const id = pool[i]
            if (!ActiveComponent[activeKey][id]) {
                ActiveComponent[activeKey][id] = 1
                active.push(id)
                return id
            }
        }
        return -1
    }

    function release(id) {
        ActiveComponent[activeKey][id] = 0

        const index = active.indexOf(id)
        if (index !== -1) {
            active[index] = active[active.length - 1]
            active.pop()
        }

        resetFields?.(id)
    }

    return { initialize, acquire, release, active, pool }
}