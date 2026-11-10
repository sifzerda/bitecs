// src/ecs/asteroids/AsteroidManager.js

import {
    Position,
    Velocity,
    Health,
    StatusEffect,
    Asteroid,
} from "../constants/components.js"

import {
    ASTEROID_TYPE,
    ASTEROID_TYPES,
} from "./asteroidTypes.js"

import {
    acquireAsteroidEntity,
    releaseAsteroidEntity,
    activeAsteroids,
} from "../pools/asteroidPool.js"

import { startState } from "../../state/startState.js"

import {
    applyAsteroidDifficulty,
    getAsteroidDifficulty,
    clearAsteroidDifficulty,
} from "../difficulty/asteroidDifficulty.js"

// ============================================================
// CONSTANTS
// ============================================================

const BASE_RADIUS = 0.55
const BASE_HEALTH = 20
const TAU = Math.PI * 2

const FRAGMENT = Object.freeze({
    count: 2,
    scaleMultiplier: 0.55,
    minScale: 0.35,
    spread: 0.65,
    speed: 2.4,
    inheritedVelocity: 0.35,
})

const MIN_SCALE = 0.3

// ============================================================
// HELPERS
// ============================================================

function randomRange(min, max) {
    return min + Math.random() * (max - min)
}

function getTypeConfig(requestedType) {
    const valid = Object.prototype.hasOwnProperty.call(
        ASTEROID_TYPES,
        requestedType
    )

    const type = valid
        ? Number(requestedType)
        : ASTEROID_TYPE.NORMAL

    return {
        type,
        config: ASTEROID_TYPES[type],
    }
}

function validAsteroidId(id) {
    return (
        Number.isInteger(id) &&
        id >= 0 &&
        id < Asteroid.active.length
    )
}

function getDirection(vx, vy) {
    if (vx === 0 && vy === 0) {
        return randomRange(0, TAU)
    }

    return Math.atan2(vy, vx)
}

// ============================================================
// ASTEROID SPAWNING
// ============================================================

export function spawnAsteroid(x, y, options = {}) {
    const requestedType =
        options.type ??
        (
            options.fast === true
                ? ASTEROID_TYPE.FAST
                : ASTEROID_TYPE.NORMAL
        )

    const { type, config } = getTypeConfig(
        requestedType
    )

    const id = acquireAsteroidEntity()

    if (!validAsteroidId(id)) {
        return -1
    }

    // --------------------------------------------------------
    // SPAWN IDENTITY
    // --------------------------------------------------------

    // Each acquisition represents a new asteroid.
    // The pool must never reset spawnVersion.
    Asteroid.spawnVersion[id] =
        (Asteroid.spawnVersion[id] + 1) >>> 0

    // Defensive cleanup in case an entity was previously
    // released through the pool rather than this manager.
    clearAsteroidDifficulty(id)

    // --------------------------------------------------------
    // TYPE AND PHYSICS
    // --------------------------------------------------------

    const scale = Math.max(
        MIN_SCALE,
        options.scale ??
        randomRange(...config.scale)
    )

    const angle =
        options.angle ??
        randomRange(0, TAU)

    const speed =
        options.speed ??
        randomRange(...config.speed)

    const vx =
        options.vx ??
        Math.cos(angle) * speed

    const vy =
        options.vy ??
        Math.sin(angle) * speed

    const velocityMagnitude = Math.hypot(vx, vy)

    const health =
        options.health ??
        Math.max(
            5,
            Math.round(
                BASE_HEALTH *
                Math.pow(scale, 1.5) *
                config.healthMultiplier
            )
        )

    // --------------------------------------------------------
    // TRANSFORM
    // --------------------------------------------------------

    Position.x[id] = x
    Position.y[id] = y

    Velocity.x[id] = vx
    Velocity.y[id] = vy

    // --------------------------------------------------------
    // HEALTH
    // --------------------------------------------------------

    Health.current[id] = health
    Health.max[id] = health

    // --------------------------------------------------------
    // STATUS EFFECTS
    // --------------------------------------------------------

    StatusEffect.frozen[id] = 0
    StatusEffect.corrosionDamage[id] = 0
    StatusEffect.corrosionRemaining[id] = 0

    // --------------------------------------------------------
    // ASTEROID DATA
    // --------------------------------------------------------

    Asteroid.active[id] = 1
    Asteroid.type[id] = type

    Asteroid.scale[id] = scale
    Asteroid.radius[id] = BASE_RADIUS * scale

    Asteroid.behaviourTimer[id] =
        randomRange(0.5, 1.5)

    Asteroid.turnRate[id] = config.turnRate
    Asteroid.acceleration[id] = config.acceleration

    Asteroid.maxSpeed[id] = Math.max(
        velocityMagnitude,
        config.speed[1]
    )

    Asteroid.visualRotation[id] =
        randomRange(0, TAU)

    Asteroid.spinSpeed[id] =
        randomRange(-0.8, 0.8)

    Asteroid.generation[id] =
        options.generation ?? 0

    // --------------------------------------------------------
    // OPTIONAL DIFFICULTY
    // --------------------------------------------------------

    // Allows callers to pass difficulty directly.
    // Existing callers without this option are unchanged.
    if (options.difficulty) {
        applyAsteroidDifficulty(
            id,
            options.difficulty
        )
    }

    return id
}

// ============================================================
// SPLITTER FRAGMENTS
// ============================================================

function spawnFragments({
    x,
    y,
    scale,
    vx,
    vy,
    generation,
    difficulty,
}) {
    const fragmentScale = Math.max(
        FRAGMENT.minScale,
        scale * FRAGMENT.scaleMultiplier
    )

    const baseAngle = getDirection(vx, vy)

    let spawned = 0

    for (let i = 0; i < FRAGMENT.count; i++) {
        const sign = i === 0 ? -1 : 1

        const angle =
            baseAngle +
            sign * FRAGMENT.spread

        // ----------------------------------------------------
        // FRAGMENT POSITION
        // ----------------------------------------------------

        const fragmentX =
            x +
            Math.cos(angle) * fragmentScale

        const fragmentY =
            y +
            Math.sin(angle) * fragmentScale

        // ----------------------------------------------------
        // FRAGMENT VELOCITY
        // ----------------------------------------------------

        const fragmentVX =
            vx * FRAGMENT.inheritedVelocity +
            Math.cos(angle) * FRAGMENT.speed

        const fragmentVY =
            vy * FRAGMENT.inheritedVelocity +
            Math.sin(angle) * FRAGMENT.speed

        // ----------------------------------------------------
        // SPAWN
        // ----------------------------------------------------

        const id = spawnAsteroid(
            fragmentX,
            fragmentY,
            {
                type: ASTEROID_TYPE.NORMAL,

                scale: fragmentScale,

                vx: fragmentVX,
                vy: fragmentVY,

                generation: generation + 1,

                difficulty,
            }
        )

        // Pool exhausted: stop trying.
        if (id === -1) {
            break
        }

        spawned++
    }

    return spawned
}

// ============================================================
// ASTEROID DESTRUCTION
// ============================================================

/**
 * Release an asteroid and optionally spawn fragments.
 *
 * Returns:
 *   null     - asteroid was already inactive
 *   snapshot - successfully destroyed asteroid
 */
export function destroyAsteroid(id, x, y) {
    if (
        !validAsteroidId(id) ||
        Asteroid.active[id] !== 1
    ) {
        return null
    }

    // --------------------------------------------------------
    // CAPTURE ENTITY DATA BEFORE RELEASE
    // --------------------------------------------------------

    const type = Asteroid.type[id]
    const scale = Asteroid.scale[id]
    const generation = Asteroid.generation[id]

    const vx = Velocity.x[id]
    const vy = Velocity.y[id]

    const direction = getDirection(vx, vy)

    const version = Asteroid.spawnVersion[id]

    // Capture the current difficulty before clearing
    // metadata or releasing the pooled entity.
    const inheritedDifficulty = {
        ...getAsteroidDifficulty(id),
    }

    const snapshot = {
        id,
        x,
        y,
        type,
        scale,
        generation,
        direction,
        version,
        fragmentsSpawned: 0,
    }

    // --------------------------------------------------------
    // DETERMINE WHETHER TO SPLIT
    // --------------------------------------------------------

    const shouldSplit =
        type === ASTEROID_TYPE.SPLITTER &&
        generation === 0 &&
        startState.encounterPhase === "active"

    // --------------------------------------------------------
    // RELEASE ENTITY
    // --------------------------------------------------------

    // Release first so its slot can be reused.
    // The snapshot and difficulty have already been saved.
    if (!releaseAsteroidEntity(id)) {
        return null
    }

    // Clear difficulty metadata only if it still belongs
    // to the destroyed spawn. The slot may be reused later.
    clearAsteroidDifficulty(id)

    // --------------------------------------------------------
    // SPAWN FRAGMENTS
    // --------------------------------------------------------

    if (shouldSplit) {
        snapshot.fragmentsSpawned = spawnFragments({
            x,
            y,
            scale,
            vx,
            vy,
            generation,
            difficulty: inheritedDifficulty,
        })
    }

    return snapshot
}

// ============================================================
// ASTEROID IDENTITY
// ============================================================

export function isAsteroidAlive(id, version) {
    if (!validAsteroidId(id)) {
        return false
    }

    return (
        Asteroid.active[id] === 1 &&
        Health.current[id] > 0 &&
        (
            version === undefined ||
            Asteroid.spawnVersion[id] === version
        )
    )
}

export function getAsteroidVersion(id) {
    if (!validAsteroidId(id)) {
        return -1
    }

    return Asteroid.spawnVersion[id]
}

/**
 * Remove an asteroid without triggering combat death
 * effects or spawning Splitter fragments.
 *
 * Intended for:
 * - Skipping waves
 * - Resetting encounters
 * - Clearing the arena
 * - Removing asteroids outside combat
 */
export function despawnAsteroid(id) {
    if (
        !validAsteroidId(id) ||
        Asteroid.active[id] !== 1
    ) {
        return false
    }

    if (!releaseAsteroidEntity(id)) {
        return false
    }

    clearAsteroidDifficulty(id)

    return true
}


// ============================================================
// POOL EXPORTS
// ============================================================

export {
    activeAsteroids,
}
