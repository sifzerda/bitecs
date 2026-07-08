// src/ecs/systems/bossAISystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery, bossQuery } from "../constants/queries.js"
import { Position, Velocity, Rotation, BossAI, BULLET_OWNER } from "../constants/components.js"
import { spawnBullet, spawnHazard } from "../spawn.js"
import { getWeapon } from "../constants/weapons.js"
import { explodeAt } from "./weaponEffects.js"

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

        // face the direction of travel — same convention as the player
        // (Velocity.x = sin(-rot), Velocity.y = cos(-rot)) so both ships'
        // rotation math stays consistent across the codebase
        if (Velocity.x[id] !== 0 || Velocity.y[id] !== 0) {
            Rotation[id] = -Math.atan2(Velocity.x[id], Velocity.y[id])
        }

        //----------------------------------
        // Shooting: aim at player, fire on a timer
        //----------------------------------

        BossAI.shootTimer[id] -= dt

        if (BossAI.shootTimer[id] <= 0 && hasPlayer) {

            const weapon = getWeapon(BossAI.weapon[id])

            const dx = Position.x[pid] - Position.x[id]
            const dy = Position.y[pid] - Position.y[id]
            const rot = -Math.atan2(dx, dy)

            switch (weapon.category) {

                case "beam":
                    break

                case "mine":
                    spawnHazard(Position.x[id], Position.y[id], weapon.id, BULLET_OWNER.ENEMY, -1)
                    break

                default:
                    spawnBullet(Position.x[id], Position.y[id], rot, weapon.id, BULLET_OWNER.ENEMY)
                    break
            }

            BossAI.shootTimer[id] = SHOOT_INTERVAL
        }
    }
}