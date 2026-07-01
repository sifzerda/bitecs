// src/bosses/ufo/movement.js

import { Position, Velocity } from "../../ecs/components"
import { UFO_BOSS } from "./config"
import { getBossState } from "./state"

export function updateMovement(id, dt) {

    const state = getBossState(id)

    if (state.anchorX === 0 && state.anchorY === 0) {

        state.anchorX = Position.x[id]
        state.anchorY = Position.y[id]

    }

    state.moveTimer -= dt

    if (state.moveTimer <= 0) {

        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * UFO_BOSS.wanderRadius

        state.targetX = state.anchorX + Math.cos(angle) * distance
        state.targetY = state.anchorY + Math.sin(angle) * distance
        state.moveTimer = UFO_BOSS.directionChangeInterval

    }

    const dx = state.targetX - Position.x[id]
    const dy = state.targetY - Position.y[id]

    const length = Math.hypot(dx, dy) || 1

    const desiredX = dx / length * UFO_BOSS.maxSpeed
    const desiredY = dy / length * UFO_BOSS.maxSpeed

    Velocity.x[id] += (desiredX - Velocity.x[id]) * UFO_BOSS.steerStrength * dt
    Velocity.y[id] += (desiredY - Velocity.y[id]) * UFO_BOSS.steerStrength * dt

    Position.x[id] += Velocity.x[id] * dt
    Position.y[id] += Velocity.y[id] * dt

}