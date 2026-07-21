// src/effects/effects.js

const registry = new Map()

export function registerEffect(type, manager) {
    registry.set(type, manager)
}

export function emitEffect(type, data) {

    const manager = registry.get(type)

    if (!manager) {
        console.warn(`Unknown effect: ${type}`)
        return
    }

    manager.emit(data)
}

export function updateEffects() {

    for (const manager of registry.values()) {
        manager.update?.()
    }

}

export function clearEffects() {

    for (const manager of registry.values()) {
        manager.clear?.()
    }

}