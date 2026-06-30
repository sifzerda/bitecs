// src/ecs/systems/ufoMovementSystem.js

import { world } from "../constants/world"
import { ufoQuery } from "../constants/queries"
import { Position, Velocity } from "../components"

const WANDER_RADIUS = 9        // how far from spawn point it roams
const MAX_SPEED = 2.2
const STEER_STRENGTH = 1.4     // how eagerly it changes direction
const DIRECTION_CHANGE_INTERVAL = 1.4 // seconds between picking a new wander target

// Per-entity wander state, keyed by entity id
const wanderState = new Map()

export function ufoMovementSystem() {
    const dt = world.time.delta
    const ufos = ufoQuery()

    for (let i = 0; i < ufos.length; i++) {
        const id = ufos[i]

        let s = wanderState.get(id)
        if (!s) {
            s = {
                anchorX: Position.x[id],
                anchorY: Position.y[id],
                targetX: Position.x[id],
                targetY: Position.y[id],
                timer: 0
            }
            wanderState.set(id, s)
        }

        s.timer -= dt

        // Pick a new random point to drift toward within wander radius
        if (s.timer <= 0) {
            const angle = Math.random() * Math.PI * 2
            const dist = Math.random() * WANDER_RADIUS

            s.targetX = s.anchorX + Math.cos(angle) * dist
            s.targetY = s.anchorY + Math.sin(angle) * dist
            s.timer = DIRECTION_CHANGE_INTERVAL + Math.random() * 0.8
        }

        // Steer velocity gently toward the current wander target
        const dx = s.targetX - Position.x[id]
        const dy = s.targetY - Position.y[id]
        const dist = Math.hypot(dx, dy) || 1

        const desiredX = (dx / dist) * MAX_SPEED
        const desiredY = (dy / dist) * MAX_SPEED

        Velocity.x[id] += (desiredX - Velocity.x[id]) * STEER_STRENGTH * dt
        Velocity.y[id] += (desiredY - Velocity.y[id]) * STEER_STRENGTH * dt

        // Apply movement directly here (UFO isn't in your generic movementSystem's query
        // unless you add UfoTag there — keeping it self-contained for now)
        Position.x[id] += Velocity.x[id] * dt
        Position.y[id] += Velocity.y[id] * dt
    }
}