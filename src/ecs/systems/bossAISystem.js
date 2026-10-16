// src/ecs/systems/bossAISystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"
import { Position, Velocity, Rotation, BossAI, BossType } from "../constants/components.js"
import { BOSS_INDEX_BY_KEY } from "../constants/bosses.js"
import { spawnBossBullet } from "../spawn.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { getAction } from "../weapons/config/weaponActions.js"

import { updateBossBehavior } from "./bossBehaviorTree.js"

import {
    updateBossSteering,
    cleanupBossSteering,
} from "./bossSteeringSystem.js"

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {

    turning: {
        speed: 4.5,
        fireAngle: 0.28,
    },

    shooting: {
        defaultInterval: 1.1,
        minInterval: 0.65,
    },

    aiming: {
        accuracy: 0.75,
        trackingError: 0.25,
        //aimDelay: 0.35,
        errorChangeInterval: 0.8,
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


// ============================================================
// AIMING
// ============================================================

function updateAimError(id, dt) {

    BossAI.aimErrorTimer[id] -= dt

    if (BossAI.aimErrorTimer[id] <= 0) {

        const accuracy = CONFIG.aiming.accuracy

        const maxError =
            (1 - accuracy) * CONFIG.aiming.trackingError * 4

        BossAI.aimError[id] =
            randomRange(-maxError, maxError)

        BossAI.aimErrorTimer[id] =
            CONFIG.aiming.errorChangeInterval
    }

    return BossAI.aimError[id]
}

function calculateAim(id, pid, weapon, action, dt) {

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

    const perfectAim = -Math.atan2(
        aimX - Position.x[id],
        aimY - Position.y[id]
    )

    const aimError = updateAimError(id, dt)

    return perfectAim + aimError
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

    if (!action || action.continuous || weapon.category === "beam" || weapon.category === "thrower") {
        return
    }

    // Give the player an opportunity to approach.
    if (BossAI.state[id] === 1) {
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
        const burstCount = weapon.aiBurstCount ?? ai.burstCount ?? 1

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

        // Additional breathing room after firing.
        BossAI.shootTimer[id] += randomRange(0.4, 0.9)
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

    // Behaviour state timer.
    // Previously handled by chooseMovement(), which was removed
    // when Yuka took over movement.
    BossAI.stateTimer[id] = Math.max(
        0,
        BossAI.stateTimer[id] - dt
    )

    updateBossBehavior(id, target, BossAI)

    // --------------------------------------------------------
    // YUKA STEERING
    // --------------------------------------------------------

    updateBossSteering(
        id,
        pid,
        target,
        dt,
        BossAI.state[id],
        BossAI.strafeDirection[id]
    )

    if (
        Velocity.x[id] !== 0 ||
        Velocity.y[id] !== 0
    ) {
        BossAI.moveRotation[id] = Math.atan2(
            Velocity.y[id],
            Velocity.x[id]
        )
    }

    // --------------------------------------------------------
    // Aiming
    // --------------------------------------------------------

    const aimRotation = calculateAim(
        id,
        pid,
        weapon,
        action,
        dt
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

    // Remove steering agents belonging to destroyed bosses.
    cleanupBossSteering(bosses)

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
