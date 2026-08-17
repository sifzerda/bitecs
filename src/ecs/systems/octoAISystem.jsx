// src/ecs/systems/octoAISystem.js
//
// Fully self-contained behavior for the octopus boss — deliberately NOT
// part of bossAISystem, since its movement (drifting/holding range, no
// strafing runs or evasion) has nothing in common with the ship
// tactical AI.
//
// bossThrowerSystem.js fires the ink spray automatically whenever the
// player is within weapon.range of the boss — it doesn't read any
// "attack state" flag from here. So this system's only job is
// movement/facing: hold the octopus near its own spray range and let
// the spray system take care of the rest.
//
// IMPORTANT: bossAISystem.js must skip this entity or the two systems
// will fight over Velocity/Rotation every frame — already handled via
// `if (isOctopusType(BossType.typeIndex[id])) continue` in its loop.

import { world } from "../constants/world.js"
import { Position, Velocity, Rotation, BossType, BossAI } from "../constants/components.js"
import { bossQuery, playerQuery } from "../constants/queries.js"
import { isOctopusType } from "../constants/bosses.js"
import { getWeapon } from "../weapons/config/weapons.js"

const RANGE_TOLERANCE = 2
const DRIFT_SPEED = 2.5
const TURN_RATE = 2.0 // rad/s toward facing the player
const FALLBACK_RANGE = 7 // only used if the weapon config has no `range`

export function octoAISystem() {

    const dt = world.time.delta
    const bosses = bossQuery()
    const players = playerQuery()

    if (players.length === 0) return
    const pid = players[0]

    for (let i = 0; i < bosses.length; i++) {

        const id = bosses[i]

        if (!isOctopusType(BossType.typeIndex[id])) continue

        const weapon = getWeapon(BossAI.weapon[id])
        const preferredRange = weapon?.range ?? FALLBACK_RANGE

        // --------------------------------------------------------
        // Facing — smoothly turn toward the player, same convention
        // as playerControlSystem's mouse-aim smoothing.
        // --------------------------------------------------------

        const dx = Position.x[pid] - Position.x[id]
        const dy = Position.y[pid] - Position.y[id]
        const dist = Math.hypot(dx, dy) || 0.0001

        const targetRot = -Math.atan2(dx, dy)

        let delta = targetRot - Rotation[id]
        delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI
        if (delta < -Math.PI) delta += Math.PI * 2

        const maxStep = TURN_RATE * dt
        Rotation[id] += Math.abs(delta) <= maxStep ? delta : Math.sign(delta) * maxStep

        // --------------------------------------------------------
        // Movement — only sets Velocity. Position integration is
        // handled generically by movementSystem() later in the game
        // loop, same as every other moving entity.
        // --------------------------------------------------------

        let vx
        let vy

        if (dist > preferredRange + RANGE_TOLERANCE) {
            // out of spray range — close the distance
            vx = (dx / dist) * DRIFT_SPEED
            vy = (dy / dist) * DRIFT_SPEED
        } else if (dist < preferredRange - RANGE_TOLERANCE) {
            // too close — back off so the spray cone has room to read
            vx = -(dx / dist) * DRIFT_SPEED
            vy = -(dy / dist) * DRIFT_SPEED
        } else {
            // holding spray range — gentle orbit so it isn't static
            vx = (-dy / dist) * DRIFT_SPEED * 0.35
            vy = (dx / dist) * DRIFT_SPEED * 0.35
        }

        Velocity.x[id] = vx
        Velocity.y[id] = vy
    }
}