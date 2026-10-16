// src/ecs/systems/bossAISystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"
import { Position, Velocity, Rotation, BossAI, BossType } from "../constants/components.js"
import { BOSS_INDEX_BY_KEY } from "../constants/bosses.js"
import { spawnBossBullet } from "../spawn.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { getAction } from "../weapons/config/weaponActions.js"

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {

    movement: {
        thrust: 12,
        maxSpeed: 7.5,
        drag: 0.985,
    },

    turning: {
        speed: 4.5,
        fireAngle: 0.16,
    },

    combat: {
        minRange: 5.5,
        idealRange: 9,
        maxRange: 14,
    },

    decisions: {
        minDuration: 1.5,
        maxDuration: 2.8,
    },

    shooting: {
        defaultInterval: 0.45,
        minInterval: 0.12,
    },
}

// ============================================================
// ANGLE HELPERS
// ============================================================

function normalizeAngle(angle) {

    while (angle > Math.PI) angle -= Math.PI * 2
    while (angle < -Math.PI) angle += Math.PI * 2

    return angle
}

function angleDifference(target, current) {
    return normalizeAngle(target - current)
}

function rotateToward(current, target, maxStep) {

    const difference = angleDifference(target, current)

    if (Math.abs(difference) <= maxStep) {
        return target
    }

    return current + Math.sign(difference) * maxStep
}

function randomRange(min, max) {
    return min + Math.random() * (max - min)
}

function randomSign() {
    return Math.random() < 0.5 ? -1 : 1
}

// ============================================================
// TARGET INFORMATION
// ============================================================

function getTargetInfo(id, pid) {

    const dx = Position.x[pid] - Position.x[id]
    const dy = Position.y[pid] - Position.y[id]

    const distance = Math.hypot(dx, dy) || 0.001

    return {
        dx,
        dy,
        distance,
        directionX: dx / distance,
        directionY: dy / distance,
        angle: Math.atan2(dy, dx),
    }
}

// ============================================================
// MOVEMENT AI
//
// The boss has independent movement and aiming.
//
// It can move sideways while keeping its weapons aimed
// at the player, like a strafing spaceship.
// ============================================================

function chooseMovement(id, target, dt) {

    const {
        distance,
        directionX,
        directionY,
        angle,
    } = target

    BossAI.stateTimer[id] -= dt

    const tooClose = distance < CONFIG.combat.minRange
    const tooFar = distance > CONFIG.combat.maxRange

    // --------------------------------------------------------
    // Choose a new movement state
    // --------------------------------------------------------

    if (tooClose) {

        BossAI.state[id] = 1

    } else if (tooFar) {

        BossAI.state[id] = 0

    } else if (BossAI.stateTimer[id] <= 0) {

        BossAI.state[id] = 2

        // Occasionally reverse orbit direction.
        if (Math.random() < 0.3) {
            BossAI.strafeDirection[id] *= -1
        }

        BossAI.stateTimer[id] = randomRange(
            CONFIG.decisions.minDuration,
            CONFIG.decisions.maxDuration
        )
    }

    // --------------------------------------------------------
    // Determine movement direction
    //
    // 0 = approach
    // 1 = retreat
    // 2 = orbit / strafe
    // --------------------------------------------------------

    let moveX = 0
    let moveY = 0

    if (BossAI.state[id] === 0) {

        // Move towards player.

        moveX = directionX
        moveY = directionY

    } else if (BossAI.state[id] === 1) {

        // Move away from player.

        moveX = -directionX
        moveY = -directionY

    } else {

        // Circle around the player.

        const orbitAngle =
            angle +
            BossAI.strafeDirection[id] * Math.PI / 2

        moveX = Math.cos(orbitAngle)
        moveY = Math.sin(orbitAngle)

        // Correct the orbit radius.
        // Approach slightly if too far away.
        // Retreat slightly if too close.

        const rangeDifference =
            distance - CONFIG.combat.idealRange

        const correction = THREEClamp(
            rangeDifference * 0.12,
            -0.65,
            0.65
        )

        moveX += directionX * correction
        moveY += directionY * correction
    }

    // --------------------------------------------------------
    // Normalize movement direction
    // --------------------------------------------------------

    const length = Math.hypot(moveX, moveY) || 1

    moveX /= length
    moveY /= length

    BossAI.moveRotation[id] = Math.atan2(moveY, moveX)

    return { moveX, moveY }
}

function THREEClamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

// ============================================================
// MOVEMENT PHYSICS
// ============================================================

function updateMovement(id, direction, dt) {

    const { moveX, moveY } = direction

    // Continuous thrust.

    Velocity.x[id] += moveX * CONFIG.movement.thrust * dt
    Velocity.y[id] += moveY * CONFIG.movement.thrust * dt

    // Maximum speed.

    const speed = Math.hypot(
        Velocity.x[id],
        Velocity.y[id]
    )

    if (speed > CONFIG.movement.maxSpeed) {

        const scale =
            CONFIG.movement.maxSpeed / speed

        Velocity.x[id] *= scale
        Velocity.y[id] *= scale
    }

    // Frame-rate-independent drag.

    const drag = Math.pow(
        CONFIG.movement.drag,
        dt * 60
    )

    Velocity.x[id] *= drag
    Velocity.y[id] *= drag
}

// ============================================================
// AIMING
// ============================================================

function calculateAim(id, pid, weapon, action) {

    let aimX = Position.x[pid]
    let aimY = Position.y[pid]

    const dx = aimX - Position.x[id]
    const dy = aimY - Position.y[id]

    // Predict player movement for projectile weapons.

    const leadTarget = action?.ai?.leadTarget

    if (leadTarget && weapon.speed > 0) {

        const distance = Math.hypot(dx, dy)

        const travelTime = Math.min(
            distance / weapon.speed,
            1.2
        )

        aimX += Velocity.x[pid] * travelTime
        aimY += Velocity.y[pid] * travelTime
    }

    // Ship rotation convention:
    // Rotation 0 points upwards (+Y).

    return -Math.atan2(
        aimX - Position.x[id],
        aimY - Position.y[id]
    )
}

function updateAiming(id, aimRotation, dt) {

    BossAI.targetRotation[id] = aimRotation

    Rotation[id] = rotateToward(
        Rotation[id],
        aimRotation,
        CONFIG.turning.speed * dt
    )

    const error = Math.abs(
        angleDifference(aimRotation, Rotation[id])
    )

    return error <= CONFIG.turning.fireAngle
}

// ============================================================
// SHOOTING
// ============================================================

function fireProjectile(id, weapon, aimRotation, action) {

    const ai = action?.ai ?? {}

    const jitter =
        weapon.aiSpreadJitter ??
        ai.spreadJitter ??
        0

    const fireRotation =
        aimRotation +
        (Math.random() - 0.5) * 2 * jitter

    spawnBossBullet(
        Position.x[id],
        Position.y[id],
        fireRotation,
        weapon.id,
        id
    )
}

function updateShooting(id, weapon, action, aligned, dt) {

    // Beam and thrower weapons use their own systems.

    if (
        !action ||
        action.continuous ||
        weapon.category === "beam" ||
        weapon.category === "thrower"
    ) {
        return
    }

    // Keep the firing timer running.

    BossAI.shootTimer[id] -= dt

    // Do not fire until properly aimed.

    if (!aligned) {
        return
    }

    // --------------------------------------------------------
    // Start a new burst
    // --------------------------------------------------------

    if (BossAI.burstRemaining[id] === 0) {

        if (BossAI.shootTimer[id] > 0) {
            return
        }

        const ai = action.ai ?? {}

        const burstCount =
            weapon.aiBurstCount ??
            ai.burstCount ??
            1

        BossAI.burstRemaining[id] = burstCount
        BossAI.burstGapTimer[id] = 0
    }

    // --------------------------------------------------------
    // Fire burst
    // --------------------------------------------------------

    BossAI.burstGapTimer[id] -= dt

    if (BossAI.burstGapTimer[id] > 0) {
        return
    }

    fireProjectile(
        id,
        weapon,
        BossAI.targetRotation[id],
        action
    )

    BossAI.burstRemaining[id]--

    const ai = action.ai ?? {}

    const burstGap =
        weapon.aiBurstGap ??
        ai.burstGap ??
        0.08

    BossAI.burstGapTimer[id] = burstGap

    // --------------------------------------------------------
    // Finish burst
    // --------------------------------------------------------

    if (BossAI.burstRemaining[id] <= 0) {

        BossAI.burstRemaining[id] = 0

        BossAI.shootTimer[id] = Math.max(
            CONFIG.shooting.minInterval,
            weapon.fireRate ??
            CONFIG.shooting.defaultInterval
        )
    }
}

// ============================================================
// BOSS UPDATE
// ============================================================

function updateBoss(id, pid, dt) {

    // --------------------------------------------------------
    // Identify weapon
    // --------------------------------------------------------

    const weapon = getWeapon(BossAI.weapon[id])

    if (!weapon) {
        return
    }

    const action = getAction(weapon)

    // --------------------------------------------------------
    // Target information
    // --------------------------------------------------------

    const target = getTargetInfo(id, pid)

    // --------------------------------------------------------
    // Movement
    // --------------------------------------------------------

    const movementDirection = chooseMovement(
        id,
        target,
        dt
    )

    updateMovement(
        id,
        movementDirection,
        dt
    )

    // --------------------------------------------------------
    // Aiming
    // --------------------------------------------------------

    const aimRotation = calculateAim(
        id,
        pid,
        weapon,
        action
    )

    const aligned = updateAiming(
        id,
        aimRotation,
        dt
    )

    // --------------------------------------------------------
    // Shooting
    // --------------------------------------------------------

    updateShooting(
        id,
        weapon,
        action,
        aligned,
        dt
    )

    BossAI.attackTimer[id] += dt
}

// ============================================================
// MAIN SYSTEM
// ============================================================

export function bossAISystem() {

    const dt = Math.min(world.time.delta, 0.05)

    if (dt <= 0) return

    const bosses = bossAIQuery()
    const players = playerQuery()

    if (bosses.length === 0 || players.length === 0) {
        return
    }

    const pid = players[0]

    for (let i = 0; i < bosses.length; i++) {

        const id = bosses[i]

        // The central octopus has its own dedicated AI.
        if (
            BossType.typeIndex[id] ===
            BOSS_INDEX_BY_KEY.octopus
        ) {
            continue
        }

        updateBoss(id, pid, dt)
    }
}
