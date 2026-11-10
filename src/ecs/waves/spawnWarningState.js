// src/ecs/waves/spawnWarningState.js

const warnings = []

let nextId = 1

export function getSpawnWarnings() {
    return warnings
}

export function addSpawnWarnings(positions, duration = 0.75) {
    const lifetime = Math.max(0.01, duration)

    for (const position of positions) {
        warnings.push({
            id: nextId++,
            x: position.x,
            y: position.y,
            remaining: lifetime,
            duration: lifetime,
        })
    }
}

export function updateSpawnWarnings(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return

    for (let i = warnings.length - 1; i >= 0; i--) {
        warnings[i].remaining -= dt

        if (warnings[i].remaining <= 0) {
            warnings.splice(i, 1)
        }
    }
}

export function clearSpawnWarnings() {
    warnings.length = 0
}
