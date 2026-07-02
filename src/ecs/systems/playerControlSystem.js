// src/ecs/systems/playerControlSystem.js

import { playerQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"
import { Position, Velocity, Rotation } from "../constants/components.js"
import { spawnBullet } from "../spawn.js"

const TURN_SPEED = 4.5
const THRUST = 28
const BRAKE = 18
const MAX_SPEED = 24
const DRAG = 0.995
const FIRE_RATE = 0.15

export default function playerControlSystem(keys, shootState) {

    const dt = world.time.delta

    const players = playerQuery(world)

    if (players.length === 0) return

    const pid = players[0]

    // Turn
    if (keys["ArrowLeft"] || keys["a"])
        Rotation[pid] += TURN_SPEED * dt

    if (keys["ArrowRight"] || keys["d"])
        Rotation[pid] -= TURN_SPEED * dt

    // Forward thrust
    if (keys["ArrowUp"] || keys["w"]) {
        Velocity.x[pid] += Math.sin(-Rotation[pid]) * THRUST * dt
        Velocity.y[pid] += Math.cos(-Rotation[pid]) * THRUST * dt
    }

    // Reverse thrust
    if (keys["ArrowDown"] || keys["s"]) {
        Velocity.x[pid] -= Math.sin(-Rotation[pid]) * BRAKE * dt
        Velocity.y[pid] -= Math.cos(-Rotation[pid]) * BRAKE * dt
    }

    // Clamp speed
    const speed = Math.hypot(
        Velocity.x[pid],
        Velocity.y[pid]
    )

    if (speed > MAX_SPEED) {
        const scale = MAX_SPEED / speed
        Velocity.x[pid] *= scale
        Velocity.y[pid] *= scale
    }

    // Drag
    Velocity.x[pid] *= DRAG
    Velocity.y[pid] *= DRAG

    // Shooting
    shootState.timer -= dt

    if (keys[" "] && shootState.timer <= 0) {

        spawnBullet(
            Position.x[pid],
            Position.y[pid],
            Rotation[pid]
        )

        shootState.timer = FIRE_RATE
    }
}