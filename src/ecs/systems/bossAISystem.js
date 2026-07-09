// src/ecs/systems/bossAISystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery, bossQuery } from "../constants/queries.js"
import { Position, Velocity, Rotation, BossAI, BULLET_OWNER } from "../constants/components.js"
import { spawnBullet, spawnHazard } from "../spawn.js"
import { getWeapon } from "../constants/weapons.js"
import { explodeAt } from "./weaponEffects.js"

const TURN_SPEED = 2.0          // rad/sec — slower than the player's 4.5, reads as heavier/bulkier
const THRUST = 16
const MAX_SPEED = 9
const DRAG = 0.99

const MOVE_INTERVAL_MIN = 1.4    // pick a new target heading somewhere in this range
const MOVE_INTERVAL_MAX = 2.6
const SHOOT_INTERVAL = 1.4

function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2
    while (a < -Math.PI) a += Math.PI * 2
    return a
}

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
        // Pick a new target heading periodically
        //----------------------------------

        BossAI.moveTimer[id] -= dt

        if (BossAI.moveTimer[id] <= 0) {
            BossAI.targetRotation[id] = Math.random() * Math.PI * 2 - Math.PI
            BossAI.moveTimer[id] = MOVE_INTERVAL_MIN + Math.random() * (MOVE_INTERVAL_MAX - MOVE_INTERVAL_MIN)
        }

        //----------------------------------
        // Turn toward target heading at a limited rate
        //----------------------------------

        const diff = normalizeAngle(BossAI.targetRotation[id] - Rotation[id])
        const maxStep = TURN_SPEED * dt

        if (Math.abs(diff) <= maxStep) {
            Rotation[id] = BossAI.targetRotation[id]
        } else {
            Rotation[id] += Math.sign(diff) * maxStep
        }

        //----------------------------------
        // Thrust forward along current facing (same convention as player)
        //----------------------------------

        Velocity.x[id] += Math.sin(-Rotation[id]) * THRUST * dt
        Velocity.y[id] += Math.cos(-Rotation[id]) * THRUST * dt

        //----------------------------------
        // Clamp speed + drag
        //----------------------------------

        const speed = Math.hypot(Velocity.x[id], Velocity.y[id])
        if (speed > MAX_SPEED) {
            const scale = MAX_SPEED / speed
            Velocity.x[id] *= scale
            Velocity.y[id] *= scale
        }

        Velocity.x[id] *= DRAG
        Velocity.y[id] *= DRAG

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