// src/ecs/systems/asteroidCollisionSystem.js

import { world } from "../constants/world.js"
import { playerQuery } from "../constants/queries.js"
import {
    Asteroid,
    Position,
    Velocity,
    Health,
    Invulnerability,
} from "../constants/components.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { gameState, SCREEN } from "../../state/gameState.js"
import { notifyUIChanged } from "../../state/uiState.js"

const PLAYER_RADIUS = 0.6

// Small amount of bounce energy retained/lost.
// 1.0 = perfectly elastic.
const ASTEROID_RESTITUTION = 1.0

// Prevents an asteroid collision from completely stopping the player.
const PLAYER_BOUNCE = 0.35

export function asteroidCollisionSystem() {

    const dt = world.time.delta
    const asteroids = activeAsteroids
    const players = playerQuery()

    const pid = players.length > 0 ? players[0] : null

    // ============================================================
    // ASTEROID <-> ASTEROID
    // ============================================================

    for (let i = 0; i < asteroids.length; i++) {

        const a = asteroids[i]

        for (let j = i + 1; j < asteroids.length; j++) {

            const b = asteroids[j]

            let dx = Position.x[b] - Position.x[a]
            let dy = Position.y[b] - Position.y[a]

            let distSq = dx * dx + dy * dy

            const radiusA = Asteroid.radius[a]
            const radiusB = Asteroid.radius[b]

            const minDistance = radiusA + radiusB

            if (distSq >= minDistance * minDistance) {
                continue
            }

            // Prevent divide-by-zero if two asteroids occupy
            // exactly the same position.
            let dist = Math.sqrt(distSq)

            let nx
            let ny

            if (dist < 0.0001) {

                const angle = Math.random() * Math.PI * 2

                nx = Math.cos(angle)
                ny = Math.sin(angle)

                dist = 0.0001

            } else {

                nx = dx / dist
                ny = dy / dist
            }

            // ----------------------------------------------------
            // Separate the asteroids
            // ----------------------------------------------------

            const overlap = minDistance - dist
            const correction = overlap * 0.5

            Position.x[a] -= nx * correction
            Position.y[a] -= ny * correction

            Position.x[b] += nx * correction
            Position.y[b] += ny * correction

            // ----------------------------------------------------
            // Relative velocity along collision normal
            // ----------------------------------------------------

            const relativeVx = Velocity.x[b] - Velocity.x[a]
            const relativeVy = Velocity.y[b] - Velocity.y[a]

            const velocityAlongNormal =
                relativeVx * nx +
                relativeVy * ny

            // Already moving apart.
            if (velocityAlongNormal > 0) {
                continue
            }

            // Equal-mass collision.
            const impulse =
                -(1 + ASTEROID_RESTITUTION) *
                velocityAlongNormal /
                2

            const impulseX = impulse * nx
            const impulseY = impulse * ny

            Velocity.x[a] -= impulseX
            Velocity.y[a] -= impulseY

            Velocity.x[b] += impulseX
            Velocity.y[b] += impulseY
        }
    }

    // ============================================================
    // ASTEROID <-> PLAYER
    // ============================================================

    if (pid === null) {
        return
    }

    // If the player is already dead, don't process collisions.
    if (Health.current[pid] <= 0) {
        return
    }

    // Player is temporarily protected after being hit.
    if (Invulnerability.remaining[pid] > 0) {
        return
    }

    for (let i = 0; i < asteroids.length; i++) {

        const aid = asteroids[i]

        // Each asteroid gets its own collision radius.
        const asteroidRadius = Asteroid.radius[aid]

        const collisionDistance =
            PLAYER_RADIUS + asteroidRadius

        const collisionDistanceSq =
            collisionDistance * collisionDistance

        let dx =
            Position.x[pid] -
            Position.x[aid]

        let dy =
            Position.y[pid] -
            Position.y[aid]

        const distSq =
            dx * dx +
            dy * dy

        if (distSq >= collisionDistanceSq) {
            continue
        }

        let dist = Math.sqrt(distSq)

        let nx
        let ny

        if (dist < 0.0001) {

            const angle = Math.random() * Math.PI * 2

            nx = Math.cos(angle)
            ny = Math.sin(angle)

            dist = 0.0001

        } else {

            nx = dx / dist
            ny = dy / dist
        }

        // --------------------------------------------------------
        // Push player and asteroid apart.
        // --------------------------------------------------------

        const overlap = collisionDistance - dist

        const playerCorrection = overlap * 0.75
        const asteroidCorrection = overlap * 0.25

        Position.x[pid] += nx * playerCorrection
        Position.y[pid] += ny * playerCorrection

        Position.x[aid] -= nx * asteroidCorrection
        Position.y[aid] -= ny * asteroidCorrection

        // --------------------------------------------------------
        // Bounce the asteroid away from the player.
        // --------------------------------------------------------

        const relativeVx =
            Velocity.x[aid] -
            Velocity.x[pid]

        const relativeVy =
            Velocity.y[aid] -
            Velocity.y[pid]

        const velocityAlongNormal =
            relativeVx * nx +
            relativeVy * ny

        if (velocityAlongNormal < 0) {

            const impulse =
                -(1 + ASTEROID_RESTITUTION) *
                velocityAlongNormal

            Velocity.x[aid] += nx * impulse
            Velocity.y[aid] += ny * impulse

            Velocity.x[pid] -=
                nx * impulse * PLAYER_BOUNCE

            Velocity.y[pid] -=
                ny * impulse * PLAYER_BOUNCE
        }

        // --------------------------------------------------------
        // Player loses a life.
        // --------------------------------------------------------

        Health.current[pid] = 0

        gameState.lives--

        if (gameState.lives <= 0) {

            gameState.screen = SCREEN.GAME_OVER

            notifyUIChanged()

            return
        }

        // --------------------------------------------------------
        // Player survived.
        // --------------------------------------------------------

        Health.current[pid] = Health.max[pid]

        // 2 seconds of invulnerability.
        Invulnerability.remaining[pid] = 2.0

        notifyUIChanged()

        return
    }
}