// src/ecs/systems/collisionSystem.js

import { playerQuery, bossQuery } from "../constants/queries.js"
import {
    Asteroid,
    Position,
    Velocity,
    Health,
    Invulnerability,
    BossType,
} from "../constants/components.js"

import { BOSSES } from "../constants/bosses.js"
import { applyPlayerAngularImpulse } from "./playerControlSystem.js"
import { killBoss } from "./entityDeath.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { damagePlayer } from "./playerDamage.js"

// ============================================================
// COLLISION CONFIGURATION
// ============================================================

const PLAYER_RADIUS = 0.6

// Asteroid collisions
const ASTEROID_RESTITUTION = 0.9
const ASTEROID_MASS = 1.0

// Player collisions
const PLAYER_MASS = 4.0
const PLAYER_RESTITUTION = 1.0
const PLAYER_KNOCKBACK = 2.0
const PLAYER_SPIN_FACTOR = 0.35
const TANGENTIAL_IMPULSE = 0.25

const PLAYER_INERTIA =
    0.5 * PLAYER_MASS * PLAYER_RADIUS * PLAYER_RADIUS

// Boss collisions
const DEFAULT_BOSS_RADIUS = 2.0
const BOSS_MASS = 12.0
const BOSS_RESTITUTION = 0.8

const BOSS_PLAYER_KNOCKBACK = 2.0
const BOSS_CONTACT_DAMAGE = 1.0

// ============================================================
// HELPERS
// ============================================================

function getBossHitRadius(id) {
    return (
        BOSSES[BossType.typeIndex[id]]?.hitRadius ??
        DEFAULT_BOSS_RADIUS
    )
}

function getAsteroidMass(id) {
    const scale = Math.max(0.3, Asteroid.scale[id])

    return ASTEROID_MASS * scale * scale
}

function getCollisionNormal(dx, dy) {
    const distance = Math.hypot(dx, dy)

    if (distance < 0.0001) {
        return {
            nx: 1,
            ny: 0,
            distance: 0,
        }
    }

    return {
        nx: dx / distance,
        ny: dy / distance,
        distance,
    }
}

/**
 * Separate two overlapping entities according to mass.
 *
 * The lighter entity moves farther than the heavier one.
 */
function separateEntities(
    a,
    b,
    nx,
    ny,
    overlap,
    massA,
    massB
) {
    const totalMass = massA + massB

    if (totalMass <= 0 || overlap <= 0) {
        return
    }

    const correctionA =
        overlap * (massB / totalMass)

    const correctionB =
        overlap * (massA / totalMass)

    Position.x[a] -= nx * correctionA
    Position.y[a] -= ny * correctionA

    Position.x[b] += nx * correctionB
    Position.y[b] += ny * correctionB
}

// ============================================================
// ASTEROID <-> ASTEROID
// ============================================================

function resolveAsteroidCollisions(asteroids) {
    const count = asteroids.length

    for (let i = 0; i < count; i++) {
        const a = asteroids[i]

        for (let j = i + 1; j < count; j++) {
            const b = asteroids[j]

            const dx =
                Position.x[b] - Position.x[a]

            const dy =
                Position.y[b] - Position.y[a]

            const minDistance =
                Asteroid.radius[a] +
                Asteroid.radius[b]

            const distSq = dx * dx + dy * dy

            if (
                distSq >=
                minDistance * minDistance
            ) {
                continue
            }

            const { nx, ny, distance } =
                getCollisionNormal(dx, dy)

            // --------------------------------------------
            // Resolve overlap
            // --------------------------------------------

            const overlap = minDistance - distance

            const massA = getAsteroidMass(a)
            const massB = getAsteroidMass(b)

            separateEntities(
                a,
                b,
                nx,
                ny,
                overlap,
                massA,
                massB
            )

            // --------------------------------------------
            // Relative velocity
            // --------------------------------------------

            const relativeVx =
                Velocity.x[b] - Velocity.x[a]

            const relativeVy =
                Velocity.y[b] - Velocity.y[a]

            const velocityAlongNormal =
                relativeVx * nx +
                relativeVy * ny

            // Objects are already moving apart.
            if (velocityAlongNormal >= 0) {
                continue
            }

            // --------------------------------------------
            // Mass-based collision impulse
            // --------------------------------------------

            const inverseMassA = 1 / massA
            const inverseMassB = 1 / massB

            const impulse =
                (
                    -(1 + ASTEROID_RESTITUTION) *
                    velocityAlongNormal
                ) /
                (inverseMassA + inverseMassB)

            const impulseX = impulse * nx
            const impulseY = impulse * ny

            Velocity.x[a] -=
                impulseX * inverseMassA

            Velocity.y[a] -=
                impulseY * inverseMassA

            Velocity.x[b] +=
                impulseX * inverseMassB

            Velocity.y[b] +=
                impulseY * inverseMassB
        }
    }
}

// ============================================================
// ASTEROID <-> PLAYER
// ============================================================

function resolveAsteroidPlayerCollisions(pid, asteroids) {
    for (let i = 0; i < asteroids.length; i++) {
        const aid = asteroids[i]

        const asteroidMass =
            getAsteroidMass(aid)

        const asteroidRadius =
            Asteroid.radius[aid]

        const collisionDistance =
            PLAYER_RADIUS + asteroidRadius

        const dx =
            Position.x[pid] - Position.x[aid]

        const dy =
            Position.y[pid] - Position.y[aid]

        const distSq = dx * dx + dy * dy

        if (
            distSq >=
            collisionDistance * collisionDistance
        ) {
            continue
        }

        const { nx, ny, distance } =
            getCollisionNormal(dx, dy)

        // --------------------------------------------
        // Separate player and asteroid
        // --------------------------------------------

        const overlap =
            collisionDistance - distance

        separateEntities(
            aid,
            pid,
            nx,
            ny,
            overlap,
            asteroidMass,
            PLAYER_MASS
        )

        // --------------------------------------------
        // Relative velocity
        // --------------------------------------------

        const relativeVx =
            Velocity.x[pid] - Velocity.x[aid]

        const relativeVy =
            Velocity.y[pid] - Velocity.y[aid]

        const velocityAlongNormal =
            relativeVx * nx +
            relativeVy * ny

        // --------------------------------------------
        // Knockback and angular impulse
        // --------------------------------------------

        if (velocityAlongNormal < 0) {
            const restitution = Math.min(
                PLAYER_RESTITUTION,
                ASTEROID_RESTITUTION
            )

            const impulse =
                (
                    -(1 + restitution) *
                    velocityAlongNormal
                ) /
                (
                    1 / PLAYER_MASS +
                    1 / asteroidMass
                )

            const impulseX = impulse * nx
            const impulseY = impulse * ny

            // Asteroid receives opposite impulse.
            Velocity.x[aid] -=
                impulseX / asteroidMass

            Velocity.y[aid] -=
                impulseY / asteroidMass

            // Player receives stronger knockback.
            Velocity.x[pid] +=
                (impulseX / PLAYER_MASS) *
                PLAYER_KNOCKBACK

            Velocity.y[pid] +=
                (impulseY / PLAYER_MASS) *
                PLAYER_KNOCKBACK

            // ----------------------------------------
            // Tangential collision and player spin
            // ----------------------------------------

            const tangentX = -ny
            const tangentY = nx

            const tangentialVelocity =
                relativeVx * tangentX +
                relativeVy * tangentY

            const tangentImpulse =
                tangentialVelocity *
                TANGENTIAL_IMPULSE

            const angularImpulse =
                (
                    -tangentImpulse *
                    PLAYER_RADIUS *
                    PLAYER_SPIN_FACTOR
                ) /
                PLAYER_INERTIA

            applyPlayerAngularImpulse(
                angularImpulse
            )

            Velocity.x[pid] +=
                (tangentX * tangentImpulse) /
                PLAYER_MASS

            Velocity.y[pid] +=
                (tangentY * tangentImpulse) /
                PLAYER_MASS

            Velocity.x[aid] -=
                (tangentX * tangentImpulse) /
                asteroidMass

            Velocity.y[aid] -=
                (tangentY * tangentImpulse) /
                asteroidMass
        }

        // --------------------------------------------
        // Contact damage
        // --------------------------------------------

        damagePlayer(pid, 25)

        return true
    }

    return false
}

// ============================================================
// BOSS <-> PLAYER
// ============================================================

function resolveBossPlayerCollisions(pid, bosses) {
    for (let i = 0; i < bosses.length; i++) {
        const bid = bosses[i]

        // Octopus boss has its own collision handling.
        if (
            BOSSES[BossType.typeIndex[bid]]?.key ===
            "octopus"
        ) {
            continue
        }

        const bossRadius =
            getBossHitRadius(bid)

        const collisionDistance =
            PLAYER_RADIUS + bossRadius

        const dx =
            Position.x[pid] - Position.x[bid]

        const dy =
            Position.y[pid] - Position.y[bid]

        const distSq = dx * dx + dy * dy

        if (
            distSq >=
            collisionDistance * collisionDistance
        ) {
            continue
        }

        const { nx, ny, distance } =
            getCollisionNormal(dx, dy)

        // --------------------------------------------
        // Separate player and boss
        // --------------------------------------------

        const overlap =
            collisionDistance - distance

        separateEntities(
            bid,
            pid,
            nx,
            ny,
            overlap,
            BOSS_MASS,
            PLAYER_MASS
        )

        // --------------------------------------------
        // Relative velocity
        // --------------------------------------------

        const relativeVx =
            Velocity.x[pid] - Velocity.x[bid]

        const relativeVy =
            Velocity.y[pid] - Velocity.y[bid]

        const velocityAlongNormal =
            relativeVx * nx +
            relativeVy * ny

        // --------------------------------------------
        // Knockback
        // --------------------------------------------

        if (velocityAlongNormal < 0) {
            const impulse =
                (
                    -(1 + BOSS_RESTITUTION) *
                    velocityAlongNormal
                ) /
                (
                    1 / PLAYER_MASS +
                    1 / BOSS_MASS
                )

            const impulseX = impulse * nx
            const impulseY = impulse * ny

            // Boss knockback.
            Velocity.x[bid] -=
                impulseX / BOSS_MASS

            Velocity.y[bid] -=
                impulseY / BOSS_MASS

            // Player knockback.
            Velocity.x[pid] +=
                (impulseX / PLAYER_MASS) *
                BOSS_PLAYER_KNOCKBACK

            Velocity.y[pid] +=
                (impulseY / PLAYER_MASS) *
                BOSS_PLAYER_KNOCKBACK
        }

        // --------------------------------------------
        // Boss contact damage
        // --------------------------------------------

        Health.current[bid] -=
            BOSS_CONTACT_DAMAGE

        if (Health.current[bid] <= 0) {
            killBoss(
                bid,
                Position.x[bid],
                Position.y[bid]
            )
        }

        // --------------------------------------------
        // Player contact damage
        // --------------------------------------------

        damagePlayer(pid, 40)

        return true
    }

    return false
}

// ============================================================
// MAIN COLLISION SYSTEM
// ============================================================

export function collisionSystem() {
    const asteroids = activeAsteroids
    const players = playerQuery()
    const bosses = bossQuery()

    // --------------------------------------------
    // Asteroid collisions
    // --------------------------------------------

    resolveAsteroidCollisions(asteroids)

    // --------------------------------------------
    // Player collisions
    // --------------------------------------------

    if (players.length === 0) {
        return
    }

    const pid = players[0]

    // Dead or invulnerable players cannot take
    // collision damage.
    if (
        Health.current[pid] <= 0 ||
        Invulnerability.remaining[pid] > 0
    ) {
        return
    }

    // --------------------------------------------
    // Asteroid-player collisions
    // --------------------------------------------

    if (
        resolveAsteroidPlayerCollisions(
            pid,
            asteroids
        )
    ) {
        return
    }

    // --------------------------------------------
    // Boss-player collisions
    // --------------------------------------------

    resolveBossPlayerCollisions(
        pid,
        bosses
    )
}
