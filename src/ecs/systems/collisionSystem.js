
// src/ecs/systems/collisionSystem.js

import { playerQuery, bossQuery } from "../constants/queries.js"
import { Asteroid, Position, Velocity, Health, Invulnerability, BossType } from "../constants/components.js"
import { BOSSES } from "../constants/bosses.js"
import { applyPlayerAngularImpulse } from "./playerControlSystem.js"
import { killBoss } from "./entityDeath.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { useGameStore } from "../../../store/gameStore.js"
import { startState } from "../../state/startState.js"

// ============================================================
// COLLISION CONFIGURATION
// ============================================================

const PLAYER_RADIUS = 0.6

// Asteroid collisions
const ASTEROID_RESTITUTION = 1.0
const PLAYER_SPIN_FACTOR = 0.35

const PLAYER_MASS = 4.0
const ASTEROID_MASS = 1.0

const PLAYER_RESTITUTION = 1.0
const PLAYER_KNOCKBACK = 2.0
const TANGENTIAL_IMPULSE = 0.25

const PLAYER_INERTIA = 0.5 * PLAYER_MASS * PLAYER_RADIUS * PLAYER_RADIUS

// Boss collisions
const DEFAULT_BOSS_RADIUS = 2.0
const BOSS_MASS = 12.0
const BOSS_RESTITUTION = 0.8

const BOSS_PLAYER_KNOCKBACK = 2.0
const BOSS_CONTACT_DAMAGE = 1.0

// Player protection after any collision.
const PLAYER_INVULNERABILITY_DURATION = 2.0

// ============================================================
// HELPERS
// ============================================================

function getBossHitRadius(id) {
    return BOSSES[BossType.typeIndex[id]]?.hitRadius ?? DEFAULT_BOSS_RADIUS
}

function separateEntities(a, b, nx, ny, overlap, massA, massB) {
    const totalMass = massA + massB

    const correctionA = overlap * (massB / totalMass)
    const correctionB = overlap * (massA / totalMass)

    Position.x[a] -= nx * correctionA
    Position.y[a] -= ny * correctionA

    Position.x[b] += nx * correctionB
    Position.y[b] += ny * correctionB
}

function getCollisionNormal(dx, dy) {
    const distance = Math.hypot(dx, dy)

    if (distance < 0.0001) {
        return {
            nx: 1,
            ny: 0,
            distance: 0.0001,
        }
    }

    return {
        nx: dx / distance,
        ny: dy / distance,
        distance,
    }
}

// ============================================================
// ASTEROID <-> ASTEROID
// ============================================================

function resolveAsteroidCollisions(asteroids) {

    for (let i = 0; i < asteroids.length; i++) {

        const a = asteroids[i]

        for (let j = i + 1; j < asteroids.length; j++) {

            const b = asteroids[j]

            const dx = Position.x[b] - Position.x[a]
            const dy = Position.y[b] - Position.y[a]

            const radiusA = Asteroid.radius[a]
            const radiusB = Asteroid.radius[b]

            const minDistance = radiusA + radiusB
            const distSq = dx * dx + dy * dy

            if (distSq >= minDistance * minDistance) {
                continue
            }

            const collision = getCollisionNormal(dx, dy)
            const { nx, ny, distance } = collision

            // Separate.
            const overlap = minDistance - distance

            Position.x[a] -= nx * overlap * 0.5
            Position.y[a] -= ny * overlap * 0.5

            Position.x[b] += nx * overlap * 0.5
            Position.y[b] += ny * overlap * 0.5

            // Relative velocity.
            const relativeVx = Velocity.x[b] - Velocity.x[a]
            const relativeVy = Velocity.y[b] - Velocity.y[a]

            const velocityAlongNormal = relativeVx * nx + relativeVy * ny

            if (velocityAlongNormal > 0) {
                continue
            }

            // Equal-mass collision impulse.
            const impulse = -(1 + ASTEROID_RESTITUTION) * velocityAlongNormal / 2

            const impulseX = impulse * nx
            const impulseY = impulse * ny

            Velocity.x[a] -= impulseX
            Velocity.y[a] -= impulseY

            Velocity.x[b] += impulseX
            Velocity.y[b] += impulseY
        }
    }
}

// ============================================================
// PLAYER LIFE LOSS
// ============================================================

function losePlayerLife(pid) {

    startState.lives--

    if (startState.lives <= 0) {

        useGameStore
            .getState()
            .gameOver()

        return false
    }

    Health.current[pid] = Health.max[pid]
    Invulnerability.remaining[pid] = PLAYER_INVULNERABILITY_DURATION

    return true
}

// ============================================================
// ASTEROID <-> PLAYER
// ============================================================

function resolveAsteroidPlayerCollisions(pid, asteroids) {

    for (let i = 0; i < asteroids.length; i++) {

        const aid = asteroids[i]
        const asteroidRadius = Asteroid.radius[aid]
        const collisionDistance = PLAYER_RADIUS + asteroidRadius

        const dx = Position.x[pid] - Position.x[aid]
        const dy = Position.y[pid] - Position.y[aid]

        const distSq = dx * dx + dy * dy

        if (distSq >= collisionDistance * collisionDistance) {
            continue
        }

        const { nx, ny, distance } = getCollisionNormal(dx, dy)

        // Separate objects.
        const overlap = collisionDistance - distance

        separateEntities(aid, pid, nx, ny, overlap, ASTEROID_MASS, PLAYER_MASS)

        // Relative velocity.
        const relativeVx = Velocity.x[pid] - Velocity.x[aid]
        const relativeVy = Velocity.y[pid] - Velocity.y[aid]
        const velocityAlongNormal = relativeVx * nx + relativeVy * ny

        if (velocityAlongNormal < 0) {

            const restitution = Math.min(PLAYER_RESTITUTION, ASTEROID_RESTITUTION)

            const impulse = -(1 + restitution) * velocityAlongNormal / (1 / PLAYER_MASS + 1 / ASTEROID_MASS)

            const impulseX = impulse * nx
            const impulseY = impulse * ny

            // Asteroid knockback.
            Velocity.x[aid] -= impulseX / ASTEROID_MASS
            Velocity.y[aid] -= impulseY / ASTEROID_MASS

            // Player knockback.
            Velocity.x[pid] += impulseX / PLAYER_MASS * PLAYER_KNOCKBACK
            Velocity.y[pid] += impulseY / PLAYER_MASS * PLAYER_KNOCKBACK

            // Tangential impact.
            const tangentX = -ny
            const tangentY = nx

            const tangentialVelocity = relativeVx * tangentX + relativeVy * tangentY
            const tangentImpulse = tangentialVelocity * TANGENTIAL_IMPULSE
            const angularImpulse = -tangentImpulse * PLAYER_RADIUS * PLAYER_SPIN_FACTOR / PLAYER_INERTIA

            applyPlayerAngularImpulse(angularImpulse)

            Velocity.x[pid] += tangentX * tangentImpulse / PLAYER_MASS
            Velocity.y[pid] += tangentY * tangentImpulse / PLAYER_MASS
            Velocity.x[aid] -= tangentX * tangentImpulse / ASTEROID_MASS
            Velocity.y[aid] -= tangentY * tangentImpulse / ASTEROID_MASS
        }

        losePlayerLife(pid)

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

        const bossRadius = getBossHitRadius(bid)
        const collisionDistance = PLAYER_RADIUS + bossRadius
        const dx = Position.x[pid] - Position.x[bid]
        const dy = Position.y[pid] - Position.y[bid]

        const distSq = dx * dx + dy * dy

        if (distSq >= collisionDistance * collisionDistance) {
            continue
        }

        const { nx, ny, distance } = getCollisionNormal(dx, dy)

        // ----------------------------------------------------
        // Separate player and boss
        // ----------------------------------------------------

        const overlap = collisionDistance - distance
        separateEntities(bid, pid, nx, ny, overlap, BOSS_MASS, PLAYER_MASS)

        // ----------------------------------------------------
        // Relative velocity
        // ----------------------------------------------------

        const relativeVx = Velocity.x[pid] - Velocity.x[bid]
        const relativeVy = Velocity.y[pid] - Velocity.y[bid]
        const velocityAlongNormal = relativeVx * nx + relativeVy * ny

        // ----------------------------------------------------
        // Knockback
        // ----------------------------------------------------

        if (velocityAlongNormal < 0) {

            const impulse = -(1 + BOSS_RESTITUTION) * velocityAlongNormal / (1 / PLAYER_MASS + 1 / BOSS_MASS)

            const impulseX = impulse * nx
            const impulseY = impulse * ny

            // Boss receives a smaller knockback.
            Velocity.x[bid] -= impulseX / BOSS_MASS
            Velocity.y[bid] -= impulseY / BOSS_MASS

            // Player receives stronger knockback.
            Velocity.x[pid] += impulseX / PLAYER_MASS * BOSS_PLAYER_KNOCKBACK
            Velocity.y[pid] += impulseY / PLAYER_MASS * BOSS_PLAYER_KNOCKBACK
        }

        // ----------------------------------------------------
        // Boss takes minor contact damage
        // ----------------------------------------------------

        Health.current[bid] -= BOSS_CONTACT_DAMAGE

        if (Health.current[bid] <= 0) {

            killBoss(bid, Position.x[bid], Position.y[bid])
        }

        // ----------------------------------------------------
        // Player loses a life
        // ----------------------------------------------------

        losePlayerLife(pid)

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

    const pid = players.length > 0 ? players[0] : null

    // --------------------------------------------------------
    // ASTEROID <-> ASTEROID
    // --------------------------------------------------------

    resolveAsteroidCollisions(asteroids)

    if (pid === null) {
        return
    }

    // Dead or invulnerable players cannot take collision damage.
    if (Health.current[pid] <= 0 || Invulnerability.remaining[pid] > 0) {
        return
    }

    // --------------------------------------------------------
    // ASTEROID <-> PLAYER
    // --------------------------------------------------------

    if (resolveAsteroidPlayerCollisions(pid, asteroids)) {
        return
    }

    // --------------------------------------------------------
    // BOSS <-> PLAYER
    // --------------------------------------------------------

    resolveBossPlayerCollisions(pid, bosses)
}
