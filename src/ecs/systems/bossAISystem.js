// src/ecs/systems/bossAISystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"

import {
    Position,
    Velocity,
    Rotation,
    BossAI,
    BULLET_OWNER,
} from "../constants/components.js"

import { spawnBossBullet } from "../spawn.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { getAction } from "../weapons/config/weaponActions.js"


// ============================================================
// Tuning
// ============================================================

const TURN_SPEED = 3.8

const THRUST = 16
const MAX_SPEED = 9
const DRAG = 0.985

// How close the boss tries to remain to the player
const MIN_COMBAT_RANGE = 5.5
const IDEAL_COMBAT_RANGE = 9.0
const MAX_COMBAT_RANGE = 14.0

// If player is moving toward boss faster than this,
// boss considers it an aggressive approach.
const PLAYER_APPROACH_SPEED = 3.0

// How accurately the boss needs to face the player before shooting.
const FIRE_ANGLE = 0.22

// Random behavior changes
const DECISION_MIN = 0.45
const DECISION_MAX = 1.35

// Evade strength
const EVADE_BIAS = 0.85

// Strafing
const STRAFE_BIAS = 0.9

// Boss doesn't constantly shoot even when aligned.
const OPPORTUNITY_FIRE_CHANCE = 0.82

const SHOOT_INTERVAL = 1.4


// ============================================================
// Helpers
// ============================================================

function normalizeAngle(a) {

    while (a > Math.PI)
        a -= Math.PI * 2

    while (a < -Math.PI)
        a += Math.PI * 2

    return a
}


function angleDifference(a, b) {
    return normalizeAngle(a - b)
}


function rotateToward(current, target, maxStep) {

    const diff = angleDifference(target, current)

    if (Math.abs(diff) <= maxStep)
        return target

    return current + Math.sign(diff) * maxStep
}


function randomRange(min, max) {
    return min + Math.random() * (max - min)
}


function randomSign() {
    return Math.random() < 0.5 ? -1 : 1
}


// ============================================================
// Tactical decision
// ============================================================

function chooseTacticalState(id, pid) {

    const dx = Position.x[pid] - Position.x[id]
    const dy = Position.y[pid] - Position.y[id]

    const dist = Math.hypot(dx, dy) || 1

    const toPlayerX = dx / dist
    const toPlayerY = dy / dist

    const playerVX = Velocity.x[pid]
    const playerVY = Velocity.y[pid]

    const playerSpeed = Math.hypot(playerVX, playerVY)

    // --------------------------------------------------------
    // Is player moving toward the boss?
    // --------------------------------------------------------

    const playerTowardBoss =
        (playerVX * -toPlayerX) +
        (playerVY * -toPlayerY)

    const aggressiveApproach =
        playerTowardBoss > PLAYER_APPROACH_SPEED


    // --------------------------------------------------------
    // Distance pressure
    // --------------------------------------------------------

    const tooClose = dist < MIN_COMBAT_RANGE
    const tooFar = dist > MAX_COMBAT_RANGE


    // --------------------------------------------------------
    // Boss personality
    // --------------------------------------------------------

    const aggression = BossAI.aggression[id]

    // --------------------------------------------------------
    // Strong defensive reaction
    //
    // If player is charging directly toward boss,
    // get out of the way.
    // --------------------------------------------------------

    if (aggressiveApproach && dist < IDEAL_COMBAT_RANGE + 4) {

        BossAI.state[id] = 1
        BossAI.stateTimer[id] = randomRange(0.6, 1.4)

        // Face away from player.
        const awayAngle =
            Math.atan2(-toPlayerY, -toPlayerX)

        // Add some random lateral escape.
        const lateral =
            randomSign() * randomRange(0.25, 0.8)

        BossAI.moveRotation[id] =
            awayAngle + lateral

        return
    }


    // --------------------------------------------------------
    // Too close = escape
    // --------------------------------------------------------

    if (tooClose) {

        BossAI.state[id] = 1
        BossAI.stateTimer[id] = randomRange(0.5, 1.1)

        BossAI.moveRotation[id] =
            Math.atan2(-toPlayerY, -toPlayerX)

        return
    }


    // --------------------------------------------------------
    // Too far = approach
    // --------------------------------------------------------

    if (tooFar) {

        BossAI.state[id] = 0
        BossAI.stateTimer[id] = randomRange(0.7, 1.4)

        BossAI.moveRotation[id] =
            Math.atan2(toPlayerY, toPlayerX)

        return
    }


    // ========================================================
    // Combat range
    //
    // Now choose something less predictable.
    // ========================================================

    const roll = Math.random()

    // Aggressive bosses attack more often.
    const attackChance =
        0.35 + aggression * 0.30

    if (roll < attackChance) {

        // ----------------------------------------------
        // Attack
        // ----------------------------------------------

        BossAI.state[id] = 0
        BossAI.stateTimer[id] =
            randomRange(0.45, 1.0)

        BossAI.moveRotation[id] =
            Math.atan2(toPlayerY, toPlayerX)

        return
    }


    if (roll < attackChance + 0.35) {

        // ----------------------------------------------
        // Strafe
        // ----------------------------------------------

        BossAI.state[id] = 2
        BossAI.stateTimer[id] =
            randomRange(0.7, 1.6)

        const towardAngle =
            Math.atan2(toPlayerY, toPlayerX)

        BossAI.strafeDirection[id] =
            randomSign()

        BossAI.moveRotation[id] =
            towardAngle +
            BossAI.strafeDirection[id] * Math.PI / 2

        return
    }


    // ----------------------------------------------
    // Reposition
    //
    // Move diagonally around the player.
    // ----------------------------------------------

    BossAI.state[id] = 3

    BossAI.stateTimer[id] =
        randomRange(0.8, 1.8)

    const playerAngle =
        Math.atan2(toPlayerY, toPlayerX)

    BossAI.moveRotation[id] =
        playerAngle +
        randomSign() * randomRange(0.8, 1.5)
}


// ============================================================
// Main system
// ============================================================

export function bossAISystem() {

    const dt = world.time.delta

    const bosses = bossAIQuery()

    if (bosses.length === 0)
        return

    const players = playerQuery()

    if (players.length === 0)
        return

    const pid = players[0]


    for (let i = 0; i < bosses.length; i++) {

        const id = bosses[i]

        // ====================================================
        // Player information
        // ====================================================

        const dx = Position.x[pid] - Position.x[id]
        const dy = Position.y[pid] - Position.y[id]

        const distance = Math.hypot(dx, dy) || 1

        const toPlayerAngle =
            Math.atan2(dy, dx)


        // ====================================================
        // Tactical state timer
        // ====================================================

        BossAI.stateTimer[id] -= dt
        BossAI.decisionCooldown[id] -= dt

        if (
            BossAI.stateTimer[id] <= 0 &&
            BossAI.decisionCooldown[id] <= 0
        ) {

            chooseTacticalState(id, pid)

            BossAI.decisionCooldown[id] =
                randomRange(0.15, 0.35)
        }


        // ====================================================
        // Movement
        // ====================================================

        const movementAngle =
            BossAI.moveRotation[id]

        const movementDiff =
            angleDifference(
                movementAngle,
                Rotation[id]
            )

        const turnAmount =
            TURN_SPEED * dt

        if (Math.abs(movementDiff) <= turnAmount) {

            Rotation[id] = movementAngle

        } else {

            Rotation[id] +=
                Math.sign(movementDiff) * turnAmount
        }


        // ====================================================
        // Thrust
        // ====================================================

        Velocity.x[id] +=
            Math.sin(-Rotation[id]) *
            THRUST *
            dt

        Velocity.y[id] +=
            Math.cos(-Rotation[id]) *
            THRUST *
            dt


        // ====================================================
        // Speed clamp
        // ====================================================

        const speed =
            Math.hypot(
                Velocity.x[id],
                Velocity.y[id]
            )

        if (speed > MAX_SPEED) {

            const scale =
                MAX_SPEED / speed

            Velocity.x[id] *= scale
            Velocity.y[id] *= scale
        }


        Velocity.x[id] *= DRAG
        Velocity.y[id] *= DRAG


        // ====================================================
        // SHOOTING
        // ====================================================

        BossAI.shootTimer[id] -= dt

        if (BossAI.shootTimer[id] > 0)
            continue


        const weapon =
            getWeapon(BossAI.weapon[id])

        if (!weapon)
            continue


        const action =
            getAction(weapon)

        if (!action || action.continuous)
            continue


        const ai =
            action.ai ?? {}


        // ====================================================
        // Calculate predicted player position
        // ====================================================

        let aimX = Position.x[pid]
        let aimY = Position.y[pid]


        if (ai.leadTarget && weapon.speed) {

            const dist =
                Math.hypot(dx, dy)

            // Don't over-lead at extreme distances.
            const travelTime =
                Math.min(
                    dist / weapon.speed,
                    1.2
                )

            aimX +=
                Velocity.x[pid] *
                travelTime

            aimY +=
                Velocity.y[pid] *
                travelTime
        }


        const aimDX =
            aimX - Position.x[id]

        const aimDY =
            aimY - Position.y[id]


        // IMPORTANT:
        // This matches the game's Rotation convention.
        //
        // rot 0 = +Y
        // rot +/-PI/2 = horizontal
        //
        const aimRotation =
            -Math.atan2(
                aimDX,
                aimDY
            )


        // ====================================================
        // How well is the boss currently lined up?
        // ====================================================

        const aimError =
            Math.abs(
                angleDifference(
                    aimRotation,
                    Rotation[id]
                )
            )


        // ====================================================
        // The boss has a firing opportunity.
        //
        // Don't force it to shoot every time it faces the
        // player. It should feel like a human choosing when
        // to pull the trigger.
        // ====================================================

        const aligned =
            aimError <= FIRE_ANGLE


        if (!aligned) {

            // Wait briefly while turning.
            BossAI.shootTimer[id] = 0.04

            continue
        }


        // ====================================================
        // Tactical firing chance
        //
        // Attack states are much more willing to fire.
        // During evasive movement the boss may occasionally
        // get a shot off if the player crosses its nose.
        // ====================================================

        let fireChance =
            OPPORTUNITY_FIRE_CHANCE


        if (BossAI.state[id] === 1)
            fireChance *= 0.35


        if (BossAI.state[id] === 2)
            fireChance *= 0.75


        // Very close combat becomes more desperate.
        if (distance < MIN_COMBAT_RANGE)
            fireChance *= 1.15


        fireChance =
            Math.min(1, fireChance)


        if (Math.random() > fireChance) {

            BossAI.shootTimer[id] =
                randomRange(0.08, 0.25)

            continue
        }


        // ====================================================
        // Fire burst
        // ====================================================

        const burstCount =
            weapon.aiBurstCount ??
            ai.burstCount ??
            1

        const burstGap =
            weapon.aiBurstGap ??
            ai.burstGap ??
            0.08


        if (BossAI.burstRemaining[id] === 0) {

            BossAI.burstRemaining[id] =
                burstCount
        }


        BossAI.burstGapTimer[id] -= dt


        if (BossAI.burstGapTimer[id] <= 0) {

            // Small aim error.
            //
            // This makes the boss feel human rather than
            // perfectly calculated.
            const jitter =
                weapon.aiSpreadJitter ??
                ai.spreadJitter ??
                0

            const fireRotation =
                aimRotation +
                (Math.random() - 0.5) *
                2 *
                jitter


            // IMPORTANT:
            // Use the actual firing angle, not Rotation[id].
            //
            // This also means the bullet originates from the
            // boss's correctly rotated front/gun positions.
            spawnBossBullet(
                Position.x[id],
                Position.y[id],
                fireRotation,
                weapon.id,
                id
            )


            BossAI.burstRemaining[id]--

            BossAI.burstGapTimer[id] =
                burstGap
        }


        // ====================================================
        // Burst continuation
        // ====================================================

        if (BossAI.burstRemaining[id] > 0) {

            BossAI.shootTimer[id] = 0.01

        } else {

            // After shooting, don't immediately shoot again.
            //
            // The next tactical decision may cause the boss
            // to break away.
            BossAI.shootTimer[id] =
                weapon.fireRate ??
                SHOOT_INTERVAL
        }
    }
}