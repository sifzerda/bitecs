// src/ecs/systems/bossAISystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"
import { Position, Velocity, BossAI } from "../constants/components.js"
import { spawnBossBullet } from "../spawn.js"

const MOVE_SPEED = 4
const MOVE_INTERVAL = 2.0      // seconds between direction changes
const SHOOT_INTERVAL = 1.4     // seconds between shots
const BULLET_SPEED = 10

export function bossAISystem() {

    const dt = world.time.delta
    const bosses = bossAIQuery()
    if (bosses.length === 0) return

    const players = playerQuery()
    const hasPlayer = players.length > 0
    const pid = hasPlayer ? players[0] : null

    for (let i = 0; i < bosses.length; i++) {

        const id = bosses[i]

        //----------------------------------
        // Movement: wander — new random heading each interval
        //----------------------------------

        BossAI.moveTimer[id] -= dt

        if (BossAI.moveTimer[id] <= 0) {

            const angle = Math.random() * Math.PI * 2

            Velocity.x[id] = Math.cos(angle) * MOVE_SPEED
            Velocity.y[id] = Math.sin(angle) * MOVE_SPEED

            BossAI.moveTimer[id] = MOVE_INTERVAL
        }

        //----------------------------------
        // Shooting: aim at player, fire on a timer
        //----------------------------------

        BossAI.shootTimer[id] -= dt

        if (BossAI.shootTimer[id] <= 0 && hasPlayer) {

            const dx = Position.x[pid] - Position.x[id]
            const dy = Position.y[pid] - Position.y[id]
            const dist = Math.hypot(dx, dy) || 1

            spawnBossBullet(
                Position.x[id],
                Position.y[id],
                (dx / dist) * BULLET_SPEED,
                (dy / dist) * BULLET_SPEED
            )

            BossAI.shootTimer[id] = SHOOT_INTERVAL
        }
    }
}