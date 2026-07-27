// src/ecs/systems/bossAISystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"
import { Position, Velocity, Rotation, BossAI, BULLET_OWNER } from "../constants/components.js"
import { spawnBullet } from "../spawn.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { getAction } from "../weapons/config/weaponActions.js"

const TURN_SPEED = 2.0
const THRUST = 16
const MAX_SPEED = 9
const DRAG = 0.99

const MOVE_INTERVAL_MIN = 1.4
const MOVE_INTERVAL_MAX = 2.6
const SHOOT_INTERVAL = 1.4   // fallback only, for weapons missing fireRate

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
        // Wander
        //----------------------------------

        BossAI.moveTimer[id] -= dt

        if (BossAI.moveTimer[id] <= 0) {

            const weapon = getWeapon(BossAI.weapon[id])
            const ai = getAction(weapon).ai
            const preferredRange = weapon.aiPreferredRange ?? ai.preferredRange ?? 10

            if (hasPlayer) {
                const dx = Position.x[pid] - Position.x[id]
                const dy = Position.y[pid] - Position.y[id]
                const dist = Math.hypot(dx, dy) || 1
                const toPlayerAngle = Math.atan2(dy, dx)

                // if too far, bias movement toward the player; too close, bias away;
                // roughly in-band, wander more freely with a wider random spread
                const rangeError = dist - preferredRange
                const bias = Math.abs(rangeError) > 2
                    ? (rangeError > 0 ? toPlayerAngle : toPlayerAngle + Math.PI)
                    : Math.random() * Math.PI * 2 - Math.PI

                const spread = Math.abs(rangeError) > 2 ? 0.6 : Math.PI * 2 // tight bias vs free wander
                BossAI.targetRotation[id] = bias + (Math.random() - 0.5) * spread
            } else {
                BossAI.targetRotation[id] = Math.random() * Math.PI * 2 - Math.PI
            }

            BossAI.moveTimer[id] = MOVE_INTERVAL_MIN + Math.random() * (MOVE_INTERVAL_MAX - MOVE_INTERVAL_MIN)
        }

        const diff = normalizeAngle(BossAI.targetRotation[id] - Rotation[id])
        const maxStep = TURN_SPEED * dt

        if (Math.abs(diff) <= maxStep) {
            Rotation[id] = BossAI.targetRotation[id]
        } else {
            Rotation[id] += Math.sign(diff) * maxStep
        }

        //----------------------------------
        // Thrust / speed clamp / drag
        //----------------------------------

        Velocity.x[id] += Math.sin(-Rotation[id]) * THRUST * dt
        Velocity.y[id] += Math.cos(-Rotation[id]) * THRUST * dt

        const speed = Math.hypot(Velocity.x[id], Velocity.y[id])
        if (speed > MAX_SPEED) {
            const scale = MAX_SPEED / speed
            Velocity.x[id] *= scale
            Velocity.y[id] *= scale
        }

        Velocity.x[id] *= DRAG
        Velocity.y[id] *= DRAG

        //----------------------------------
        //----------------------------------

        BossAI.shootTimer[id] -= dt

        if (BossAI.shootTimer[id] <= 0 && hasPlayer) {

            const weapon = getWeapon(BossAI.weapon[id])
            const ai = getAction(weapon).ai

            let aimX = Position.x[pid]
            let aimY = Position.y[pid]

            if (ai.leadTarget && weapon.speed) {
                // simple linear lead: project player position forward by roughly
                // the time it'll take this weapon's bullet to cross the gap
                const dx0 = Position.x[pid] - Position.x[id]
                const dy0 = Position.y[pid] - Position.y[id]
                const dist = Math.hypot(dx0, dy0)
                const travelTime = dist / weapon.speed

                aimX += Velocity.x[pid] * travelTime
                aimY += Velocity.y[pid] * travelTime
            }

            const dx = aimX - Position.x[id]
            const dy = aimY - Position.y[id]
            let rot = -Math.atan2(dx, dy)

            // aim jitter — small random aim error so bosses aren't laser-precise
            const jitter = weapon.aiSpreadJitter ?? ai.spreadJitter ?? 0
            if (jitter > 0) rot += (Math.random() - 0.5) * 2 * jitter

            if (!getAction(weapon).continuous) {

                const burstCount = weapon.aiBurstCount ?? ai.burstCount ?? 1
                const burstGap = weapon.aiBurstGap ?? ai.burstGap ?? 0.08

                if (BossAI.burstRemaining[id] === 0) {
                    // starting a fresh burst
                    BossAI.burstRemaining[id] = burstCount
                }

                BossAI.burstGapTimer[id] -= dt

                if (BossAI.burstGapTimer[id] <= 0) {
                    spawnBullet(Position.x[id], Position.y[id], rot, weapon.id, BULLET_OWNER.ENEMY)
                    BossAI.burstRemaining[id]--
                    BossAI.burstGapTimer[id] = burstGap
                }

                if (BossAI.burstRemaining[id] > 0) {
                    // still mid-burst — recheck soon rather than waiting a full fireRate
                    BossAI.shootTimer[id] = 0.01
                } else {
                    // burst finished — full cooldown before the next one starts
                    BossAI.shootTimer[id] = weapon.fireRate ?? SHOOT_INTERVAL
                }
            }
        }
    }
}