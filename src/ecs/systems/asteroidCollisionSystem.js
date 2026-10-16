// src/ecs/systems/asteroidCollisionSystem.js

import { playerQuery } from "../constants/queries.js"
import { Asteroid, Position, Velocity, Health, Invulnerability } from "../constants/components.js"
import { applyPlayerAngularImpulse } from "./playerControlSystem.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { useGameStore } from "../../../store/gameStore.js"
import { simState } from "../../state/simState.js"

const PLAYER_RADIUS = 0.6
const ASTEROID_RESTITUTION = 1.0
const PLAYER_SPIN_FACTOR = 0.35

// Collision tuning
const PLAYER_MASS = 4.0
const ASTEROID_MASS = 1.0
const PLAYER_RESTITUTION = 1.0
const PLAYER_KNOCKBACK = 2.0
const TANGENTIAL_IMPULSE = 0.25

const PLAYER_INERTIA = 0.5 * PLAYER_MASS * PLAYER_RADIUS * PLAYER_RADIUS

export function asteroidCollisionSystem() {

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
            // Separate
            // ----------------------------------------------------

            const overlap = minDistance - dist
            const correction = overlap * 0.5

            Position.x[a] -= nx * correction
            Position.y[a] -= ny * correction

            Position.x[b] += nx * correction
            Position.y[b] += ny * correction

            // ----------------------------------------------------
            // Relative velocity
            // ----------------------------------------------------

            const relativeVx = Velocity.x[b] - Velocity.x[a]
            const relativeVy = Velocity.y[b] - Velocity.y[a]
            const velocityAlongNormal = relativeVx * nx + relativeVy * ny

            if (velocityAlongNormal > 0) {
                continue
            }

            // Equal-mass collision.
            const impulse = -(1 + ASTEROID_RESTITUTION) * velocityAlongNormal / 2
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

    if (pid === null) return
    if (Health.current[pid] <= 0) return
    if (Invulnerability.remaining[pid] > 0) return

    for (let i = 0; i < asteroids.length; i++) {

        const aid = asteroids[i]

        const asteroidRadius = Asteroid.radius[aid]
        const collisionDistance = PLAYER_RADIUS + asteroidRadius

        let dx = Position.x[pid] - Position.x[aid]
        let dy = Position.y[pid] - Position.y[aid]

        const distSq = dx * dx + dy * dy

        if (distSq >= collisionDistance * collisionDistance) {
            continue
        }

        let dist = Math.sqrt(distSq)

        let nx
        let ny

        if (dist < 0.0001) {
            nx = 1
            ny = 0
            dist = 0.0001
        } else {
            nx = dx / dist
            ny = dy / dist
        }

        // --------------------------------------------------------
        // Separate objects
        // --------------------------------------------------------

        const overlap = collisionDistance - dist
        const totalMass = PLAYER_MASS + ASTEROID_MASS

        const playerCorrection = overlap * (ASTEROID_MASS / totalMass)
        const asteroidCorrection = overlap * (PLAYER_MASS / totalMass)

        Position.x[pid] += nx * playerCorrection
        Position.y[pid] += ny * playerCorrection

        Position.x[aid] -= nx * asteroidCorrection
        Position.y[aid] -= ny * asteroidCorrection

        // --------------------------------------------------------
        // Relative velocity
        // --------------------------------------------------------

        const relativeVx = Velocity.x[pid] - Velocity.x[aid]
        const relativeVy = Velocity.y[pid] - Velocity.y[aid]

        const velocityAlongNormal = relativeVx * nx + relativeVy * ny

        // --------------------------------------------------------
        // Collision impulse
        // --------------------------------------------------------

        if (velocityAlongNormal < 0) {

            const restitution = Math.min(PLAYER_RESTITUTION, ASTEROID_RESTITUTION)

            const impulse = -(1 + restitution) * velocityAlongNormal / (1 / PLAYER_MASS + 1 / ASTEROID_MASS)

            const impulseX = impulse * nx
            const impulseY = impulse * ny

            // Asteroid gets propelled away from ship
            Velocity.x[aid] -= impulseX / ASTEROID_MASS
            Velocity.y[aid] -= impulseY / ASTEROID_MASS

            // Ship gets knocked backwards
            Velocity.x[pid] += impulseX / PLAYER_MASS * PLAYER_KNOCKBACK
            Velocity.y[pid] += impulseY / PLAYER_MASS * PLAYER_KNOCKBACK

            // ----------------------------------------------------
            // Tangential impact (sideways deviation)
            // ----------------------------------------------------

            const tangentX = -ny
            const tangentY = nx

            const tangentialVelocity = relativeVx * tangentX + relativeVy * tangentY
            const tangentImpulse = tangentialVelocity * TANGENTIAL_IMPULSE

            // Off-centre impact creates rotational momentum
            const angularImpulse = -tangentImpulse * PLAYER_RADIUS * PLAYER_SPIN_FACTOR / PLAYER_INERTIA

            applyPlayerAngularImpulse(angularImpulse)

            Velocity.x[pid] += tangentX * tangentImpulse / PLAYER_MASS
            Velocity.y[pid] += tangentY * tangentImpulse / PLAYER_MASS
            Velocity.x[aid] -= tangentX * tangentImpulse / ASTEROID_MASS
            Velocity.y[aid] -= tangentY * tangentImpulse / ASTEROID_MASS
        }

        // --------------------------------------------------------
        // Player loses a life
        // --------------------------------------------------------

        Health.current[pid] = 0

        simState.lives--

        if (simState.lives <= 0) {
            useGameStore.getState().gameOver()
            return
        }

        // --------------------------------------------------------
        // Player survived
        // --------------------------------------------------------

        Health.current[pid] = Health.max[pid]
        Invulnerability.remaining[pid] = 2.0

        return
    }

}