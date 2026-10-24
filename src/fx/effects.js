// src/fx/effects.js

const registry = new Map()
const missing = new Set()

export function registerEffect(type, manager) {
    registry.set(type, manager)
}
export function emitEffect(type, data) {
    const manager = registry.get(type)
    if (manager) manager.emit(data)
    else if (import.meta.env.DEV && !missing.has(type)) {
        missing.add(type); console.warn("Unknown effect:", type)
    }
}

export function updateEffects(dt) { 
    for (const manager of registry.values()) manager.update?.(dt) 
    }
export function clearEffects() { 
    for (const manager of registry.values()) manager.clear?.() 
    }
