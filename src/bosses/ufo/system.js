//src/bosses/ufo/system.js

import { world } from "../../ecs/constants/world"
import { ufoQuery } from "../../ecs/constants/queries"
import { Position, Velocity } from "../../ecs/components"
import { UFO_CONFIG } from "./config"

const wanderState = new Map()

export function ufoBossSystem() {
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

        if (s.timer <= 0) {
            const angle = Math.random() * Math.PI * 2
            const dist = Math.random() * UFO_CONFIG.wanderRadius

            s.targetX = s.anchorX + Math.cos(angle) * dist
            s.targetY = s.anchorY + Math.sin(angle) * dist

            s.timer = UFO_CONFIG.directionChangeInterval
        }

        const dx = s.targetX - Position.x[id]
        const dy = s.targetY - Position.y[id]
        const dist = Math.hypot(dx, dy) || 1

        const desiredX = (dx / dist) * UFO_CONFIG.maxSpeed
        const desiredY = (dy / dist) * UFO_CONFIG.maxSpeed

        Velocity.x[id] += (desiredX - Velocity.x[id]) * UFO_CONFIG.steerStrength * dt
        Velocity.y[id] += (desiredY - Velocity.y[id]) * UFO_CONFIG.steerStrength * dt

        Position.x[id] += Velocity.x[id] * dt
        Position.y[id] += Velocity.y[id] * dt
    }
}