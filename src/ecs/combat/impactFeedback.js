import { Asteroid, Position, Velocity } from "../constants/components.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

export const IMPACT = Object.freeze({
    FLASH_DURATION: 0.14,
    DAMAGE_REFERENCE: 30,
    MAX_KNOCKBACK: 2.5,
    MAX_SHAKE: 0.22,
    SHAKE_DECAY: 12,
    CONTINUOUS_FX_INTERVAL: 0.09,
})

let shake = 0
let elapsed = 0
const lastFxTime = new Float64Array(Asteroid.active.length)
const fxVersion = new Uint32Array(Asteroid.active.length)
lastFxTime.fill(-Infinity)

export function getCameraShake() { return shake }
export function addCameraShake(amount) {
    if (Number.isFinite(amount) && amount > 0)
        shake = Math.min(IMPACT.MAX_SHAKE, shake + amount)
}
export function resetImpactFeedback() {
    shake = 0
    elapsed = 0
    lastFxTime.fill(-Infinity)
    fxVersion.fill(0)
    for (const id of activeAsteroids) {
        Asteroid.hitFlash[id] = 0
        Asteroid.hitIntensity[id] = 0
    }
}
export function registerAsteroidImpact({
    id, damage, directionX = 0, directionY = 0,
    x, y, continuous = false, sparks = true,
} = {}) {
    if (!Number.isInteger(id) || id < 0 || id >= Asteroid.active.length ||
        Asteroid.active[id] !== 1 || !Number.isFinite(damage) || damage <= 0) return false

    const version = Asteroid.spawnVersion[id]
    if (fxVersion[id] !== version) {
        fxVersion[id] = version
        lastFxTime[id] = -Infinity
    }
    const length = Math.hypot(directionX, directionY)
    const nx = length > 1e-6 ? directionX / length : 0
    const ny = length > 1e-6 ? directionY / length : 0
    const intensity = Math.min(1, damage / IMPACT.DAMAGE_REFERENCE)
    const size = Math.max(0.4, Asteroid.scale[id])

    Asteroid.hitFlash[id] = IMPACT.FLASH_DURATION
    Asteroid.hitIntensity[id] = Math.max(Asteroid.hitIntensity[id], intensity)

    const knockback = Math.min(IMPACT.MAX_KNOCKBACK, damage * 0.035 / (size * size))
    Velocity.x[id] += nx * knockback
    Velocity.y[id] += ny * knockback

    if (continuous && elapsed - lastFxTime[id] < IMPACT.CONTINUOUS_FX_INTERVAL)
        return true
    lastFxTime[id] = elapsed

    const px = Number.isFinite(x) ? x : Position.x[id]
    const py = Number.isFinite(y) ? y : Position.y[id]
    const angle = length > 1e-6 ? Math.atan2(ny, nx) : null
    if (sparks) {
        emitEffect(EFFECT.SPARK_BURST, {
            x: px, y: py, direction: angle, spread: Math.PI * 0.65,
            count: Math.round(4 + intensity * 12), speed: 5 + intensity * 7,
            big: intensity > 0.65,
        })
        emitEffect(EFFECT.FLASH, {
            x: px, y: py, angle: angle ?? 0,
            size: 0.25 + intensity * 0.65,
            maxLife: 0.05 + intensity * 0.05,
            color: "#fff5d6",
        })
    }
    addCameraShake(0.008 + intensity * 0.045)
    return true
}
export function updateImpactFeedback(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return
    elapsed += dt
    for (const id of activeAsteroids) {
        if (Asteroid.hitFlash[id] <= 0) continue
        Asteroid.hitFlash[id] = Math.max(0, Asteroid.hitFlash[id] - dt)
        if (Asteroid.hitFlash[id] === 0) Asteroid.hitIntensity[id] = 0
    }
    shake *= Math.exp(-IMPACT.SHAKE_DECAY * dt)
    if (shake < 0.0001) shake = 0
}
