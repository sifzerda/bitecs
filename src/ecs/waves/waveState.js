// src/ecs/waves/waveState.js

import { activeAsteroids } from "../pools/asteroidPool.js"

let pendingWave = null

export function setPendingWave(wave) {
    pendingWave = wave
}

export function getPendingWave() {
    return pendingWave
}

export function clearPendingWave() {
    pendingWave = null
}

export function getPendingAsteroidCount() {
    return getPendingWave()?.queue.length ?? 0
}

export function hasPendingAsteroids() {
    return getPendingAsteroidCount() > 0
}

export function getRemainingAsteroidCount() {
    return activeAsteroids.length + getPendingAsteroidCount()
}

export function resetWaveState() {
    pendingWave = null
}
