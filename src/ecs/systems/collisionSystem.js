// src/ecs/systems/collisionSystem.js

import {
    playerQuery,
    bossQuery,
} from "../constants/queries.js"

import {
    Asteroid,
    Position,
    Velocity,
    Health,
    Invulnerability,
    BossType,
} from "../constants/components.js"

import { BOSSES } from "../constants/bosses.js"

import {
    forEachAsteroidPair,
    forEachAsteroidNear,
} from "../constants/spatialGrid.js"

import {
    applyPlayerAngularImpulse,
} from "./playerControlSystem.js"

import { killBoss } from "./entityDeath.js"
import { damagePlayer } from "./playerDamage.js"

import {
    invalidateNearMiss,
} from "../combat/nearMissSystem.js"

// ============================================================
// CONFIGURATION
// ============================================================

const PLAYER_RADIUS = 0.6

const ASTEROID_RESTITUTION = 0.9
const ASTEROID_MASS = 1.0

const PLAYER_MASS = 4.0
const PLAYER_RESTITUTION = 1.0
const PLAYER_KNOCKBACK = 2.0
const PLAYER_SPIN_FACTOR = 0.35
const TANGENTIAL_IMPULSE = 0.25

const PLAYER_INERTIA =
    0.5 * PLAYER_MASS * PLAYER_RADIUS * PLAYER_RADIUS

const DEFAULT_BOSS_RADIUS = 2.0
const BOSS_MASS = 12.0
const BOSS_RESTITUTION = 0.8

const BOSS_PLAYER_KNOCKBACK = 2.0
const BOSS_CONTACT_DAMAGE = 1.0

const EPSILON = 0.0001

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

function separateEntities(
    a,
    b,
    nx,
    ny,
    overlap,
    massA,
    massB
) {
    if (overlap <= 0) return

    const totalMass = massA + massB
    if (totalMass <= 0) return

    const correctionA = overlap * (massB / totalMass)
    const correctionB = overlap * (massA / totalMass)

    Position.x[a] -= nx * correctionA
    Position.y[a] -= ny * correctionA

    Position.x[b] += nx * correctionB
    Position.y[b] += ny * correctionB
}

// ============================================================
// ASTEROID VS ASTEROID
// ============================================================

function resolveAsteroidPair(a, b) {
    const dx = Position.x[b] - Position.x[a]
    const dy = Position.y[b] - Position.y[a]

    const minDistance =
        Asteroid.radius[a] + Asteroid.radius[b]

    const distSq = dx * dx + dy * dy

    if (distSq >= minDistance * minDistance) {
        return
    }

    const distance = Math.sqrt(distSq)

    const nx = distance > EPSILON ? dx / distance : 1
    const ny = distance > EPSILON ? dy / distance : 0

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

    const relativeVx =
        Velocity.x[b] - Velocity.x[a]

    const relativeVy =
        Velocity.y[b] - Velocity.y[a]

    const velocityAlongNormal =
        relativeVx * nx + relativeVy * ny

    if (velocityAlongNormal >= 0) return

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

    Velocity.x[a] -= impulseX * inverseMassA
    Velocity.y[a] -= impulseY * inverseMassA

    Velocity.x[b] += impulseX * inverseMassB
    Velocity.y[b] += impulseY * inverseMassB
}

function resolveAsteroidCollisions() {
    forEachAsteroidPair(resolveAsteroidPair)
}

// ============================================================
// ASTEROID VS PLAYER
// ============================================================

function resolveAsteroidPlayerCollision(pid, aid) {
    const asteroidRadius = Asteroid.radius[aid]

    const collisionDistance =
        PLAYER_RADIUS + asteroidRadius

    const dx = Position.x[pid] - Position.x[aid]
    const dy = Position.y[pid] - Position.y[aid]

    const distSq = dx * dx + dy * dy

    if (distSq >= collisionDistance * collisionDistance) {
        return false
    }

    // A real collision disqualifies this near miss.
    invalidateNearMiss(aid)

    const distance = Math.sqrt(distSq)

    const nx = distance > EPSILON ? dx / distance : 1
    const ny = distance > EPSILON ? dy / distance : 0

    const asteroidMass = getAsteroidMass(aid)

    const overlap = collisionDistance - distance

    separateEntities(
        aid,
        pid,
        nx,
        ny,
        overlap,
        asteroidMass,
        PLAYER_MASS
    )

    const relativeVx =
        Velocity.x[pid] - Velocity.x[aid]

    const relativeVy =
        Velocity.y[pid] - Velocity.y[aid]

    const velocityAlongNormal =
        relativeVx * nx + relativeVy * ny

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

        Velocity.x[aid] -= impulseX / asteroidMass
        Velocity.y[aid] -= impulseY / asteroidMass

        Velocity.x[pid] +=
            (impulseX / PLAYER_MASS) *
            PLAYER_KNOCKBACK

        Velocity.y[pid] +=
            (impulseY / PLAYER_MASS) *
            PLAYER_KNOCKBACK

        // Tangential impulse and player spin.
        const tangentX = -ny
        const tangentY = nx

        const tangentialVelocity =
            relativeVx * tangentX +
            relativeVy * tangentY

        const tangentImpulse =
            tangentialVelocity * TANGENTIAL_IMPULSE

        const angularImpulse =
            (
                -tangentImpulse *
                PLAYER_RADIUS *
                PLAYER_SPIN_FACTOR
            ) /
            PLAYER_INERTIA

        applyPlayerAngularImpulse(angularImpulse)

        Velocity.x[pid] +=
            (tangentX * tangentImpulse) / PLAYER_MASS

        Velocity.y[pid] +=
            (tangentY * tangentImpulse) / PLAYER_MASS

        Velocity.x[aid] -=
            (tangentX * tangentImpulse) / asteroidMass

        Velocity.y[aid] -=
            (tangentY * tangentImpulse) / asteroidMass
    }

    damagePlayer(pid, 25)

    return true
}

function resolveAsteroidPlayerCollisions(pid) {
    let collided = false

    forEachAsteroidNear(
        Position.x[pid],
        Position.y[pid],
        PLAYER_RADIUS,
        (aid) => {
            if (resolveAsteroidPlayerCollision(pid, aid)) {
                collided = true
                return false
            }
        }
    )

    return collided
}

// ============================================================
// BOSS VS PLAYER
// ============================================================

function resolveBossPlayerCollisions(pid, bosses) {
    for (let i = 0; i < bosses.length; i++) {
        const bid = bosses[i]

        if (
            BOSSES[BossType.typeIndex[bid]]?.key ===
            "octopus"
        ) {
            continue
        }

        const bossRadius = getBossHitRadius(bid)

        const collisionDistance =
            PLAYER_RADIUS + bossRadius

        const dx = Position.x[pid] - Position.x[bid]
        const dy = Position.y[pid] - Position.y[bid]

        const distSq = dx * dx + dy * dy

        if (
            distSq >=
            collisionDistance * collisionDistance
        ) {
            continue
        }

        const distance = Math.sqrt(distSq)

        const nx = distance > EPSILON ? dx / distance : 1
        const ny = distance > EPSILON ? dy / distance : 0

        const overlap = collisionDistance - distance

        separateEntities(
            bid,
            pid,
            nx,
            ny,
            overlap,
            BOSS_MASS,
            PLAYER_MASS
        )

        const relativeVx =
            Velocity.x[pid] - Velocity.x[bid]

        const relativeVy =
            Velocity.y[pid] - Velocity.y[bid]

        const velocityAlongNormal =
            relativeVx * nx + relativeVy * ny

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

            Velocity.x[bid] -= impulseX / BOSS_MASS
            Velocity.y[bid] -= impulseY / BOSS_MASS

            Velocity.x[pid] +=
                (impulseX / PLAYER_MASS) *
                BOSS_PLAYER_KNOCKBACK

            Velocity.y[pid] +=
                (impulseY / PLAYER_MASS) *
                BOSS_PLAYER_KNOCKBACK
        }

        Health.current[bid] -= BOSS_CONTACT_DAMAGE

        if (Health.current[bid] <= 0) {
            killBoss(
                bid,
                Position.x[bid],
                Position.y[bid]
            )
        }

        damagePlayer(pid, 40)
        return true
    }

    return false
}

// ============================================================
// MAIN SYSTEM
// ============================================================

export function collisionSystem() {
    // Spatial grid must already be built for this frame.
    // Pair separation changes positions, but the grid is still the pre-solve
    // broad-phase snapshot. Keep the existing resolution order for now;
    // rebuild the grid after this system before projectile queries.
    resolveAsteroidCollisions()

    const players = playerQuery()

    if (players.length === 0) return

    const pid = players[0]

    if (
        Health.current[pid] <= 0 ||
        Invulnerability.remaining[pid] > 0
    ) {
        return
    }

    if (resolveAsteroidPlayerCollisions(pid)) {
        return
    }

    resolveBossPlayerCollisions(pid, bossQuery())
}
