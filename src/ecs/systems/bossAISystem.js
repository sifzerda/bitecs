// src/ecs/systems/bossAISystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"
import { Position, Velocity, BossAI, BULLET_OWNER } from "../constants/components.js"
import { spawnBullet } from "../spawn.js"
import { getWeapon } from "../constants/weapons.js"

const MOVE_SPEED = 4
const MOVE_INTERVAL = 2.0
const SHOOT_INTERVAL = 1.4

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

            const weapon = getWeapon(BossAI.weapon[id])

            if (weapon.category !== "beam") {

                const dx = Position.x[pid] - Position.x[id]
                const dy = Position.y[pid] - Position.y[id]
                const rot = -Math.atan2(dx, dy)

                spawnBullet(Position.x[id], Position.y[id], rot, weapon.id, BULLET_OWNER.ENEMY)
            }

            BossAI.shootTimer[id] = SHOOT_INTERVAL
        }
    }
}