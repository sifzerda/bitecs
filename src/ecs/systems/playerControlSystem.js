// src/ecs/systems/playerControlSystem.js

import { playerQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"
import { Position, Velocity, Rotation, BULLET_OWNER } from "../constants/components.js"
import { spawnPlayerBullet } from "../spawn.js"
import { input, isMouseControlEnabled } from "./input.js"
import { startState } from "../../state/startState.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { getAction } from "../weapons/config/weaponActions.js"
import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

// ============================================================
// HELPER
// ============================================================

let angularVelocity = 0
let activePlayerId = null

export function getAngularVelocity() {
    return angularVelocity
}

export function setAngularVelocity(value) {
    angularVelocity = value
}

export function applyPlayerAngularImpulse(value) {
    angularVelocity += value
}

export function resetPlayerMotion(playerId = null) {
    angularVelocity = 0
    activePlayerId = playerId
}

export function syncPlayerMotion(playerId) {
    if (activePlayerId !== playerId) {
        angularVelocity = 0
        activePlayerId = playerId
    }
}

// ============================================================
// FLIGHT PHYSICS
// ============================================================

// Linear movement
const THRUST = 20
const MAX_SPEED = 22
// Passive space drag
const LINEAR_DRAG = 0.8
// Active braking
const ACTIVE_BRAKE = 3.5
// Rotational movement
const MAX_TURN_SPEED = 8
const TURN_ACCELERATION = 24
const TURN_DAMPING = 5.5
// Mouse steering
const MOUSE_TURN_GAIN = 20
// Keyboard steering
const KEYBOARD_TURN_ACCELERATION = 22

// ============================================================
// OTHER SETTINGS
// ============================================================

const DEFLECT_BUFFER = 0.18
const DEFLECT_COOLDOWN = 0.7

export default function playerControlSystem(shootState) {

    const dt = Math.min(world.time.delta, 0.05)

    const players = playerQuery()

    if (players.length === 0) return

    const pid = players[0]

    syncPlayerMotion(pid)

    let angularVelocity = getAngularVelocity()

    // ========================================================
    // ROTATIONAL PHYSICS
    // ========================================================

    let angularAcceleration = 0

    if (isMouseControlEnabled()) {

        const dx = input.worldX - Position.x[pid]
        const dy = input.worldY - Position.y[pid]

        const targetRot = -Math.atan2(dx, dy)

        // Shortest angular distance to target
        let delta = targetRot - Rotation[pid]

        delta = Math.atan2(Math.sin(delta), Math.cos(delta))
        // Proportional steering with rotational damping
        angularAcceleration = delta * MOUSE_TURN_GAIN - angularVelocity * TURN_DAMPING

    } else {

        // Keyboard rotation
        const turnInput = (input.left ? 1 : 0) - (input.right ? 1 : 0)

        angularAcceleration = turnInput * KEYBOARD_TURN_ACCELERATION - angularVelocity * TURN_DAMPING
    }

    // Limit angular acceleration
    angularAcceleration = Math.max(-TURN_ACCELERATION, Math.min(TURN_ACCELERATION, angularAcceleration))
    // Integrate angular velocity
    angularVelocity += angularAcceleration * dt
    // Limit maximum rotation speed
    angularVelocity = Math.max(-MAX_TURN_SPEED, Math.min(MAX_TURN_SPEED, angularVelocity))

    // Apply rotation
    Rotation[pid] += angularVelocity * dt

    setAngularVelocity(angularVelocity)

    // ========================================================
    // LINEAR THRUST
    // ========================================================

    const forwardX = Math.sin(-Rotation[pid])
    const forwardY = Math.cos(-Rotation[pid])

    if (input.thrust) {

        Velocity.x[pid] += forwardX * THRUST * dt
        Velocity.y[pid] += forwardY * THRUST * dt
    }

    // ========================================================
    // REVERSE THRUST / BRAKING
    // ========================================================

    if (input.brake) {
        const brakeFactor = Math.exp(-ACTIVE_BRAKE * dt)

        Velocity.x[pid] *= brakeFactor
        Velocity.y[pid] *= brakeFactor
    }

    // ========================================================
    // LINEAR SPEED LIMIT
    // ========================================================

    const speed = Math.hypot(Velocity.x[pid], Velocity.y[pid])

    if (speed > MAX_SPEED) {

        const scale = MAX_SPEED / speed

        Velocity.x[pid] *= scale
        Velocity.y[pid] *= scale
    }

    // ========================================================
    // SPACE DRAG
    // ========================================================

    const drag = Math.exp(-LINEAR_DRAG * dt)

    Velocity.x[pid] *= drag
    Velocity.y[pid] *= drag

    // ========================================================
    // DEFLECT
    // ========================================================

    startState.deflectBufferTime = Math.max(0, startState.deflectBufferTime - dt)
    startState.deflectCooldownTime = Math.max(0, startState.deflectCooldownTime - dt)
    startState.deflectFlashTimer = Math.max(0, startState.deflectFlashTimer - dt)

    if (input.deflect) {
        if (startState.deflectCooldownTime === 0) {
            startState.deflectBufferTime = DEFLECT_BUFFER
            startState.deflectCooldownTime = DEFLECT_COOLDOWN
        }

        // Input is an activation request, not a held action.
        input.deflect = false
    }

    // ========================================================
    // SHOOTING
    // ========================================================

    const weapon = getWeapon(startState.currentWeapon)

    if (!weapon) return

    const action = getAction(weapon)

    if (!action || action.continuous) {
        shootState.timer = 0
        return
    }

    // Reset cooldown when the equipped weapon changes.
    if (shootState.weaponId !== weapon.id) {
        shootState.weaponId = weapon.id
        shootState.timer = 0
    }

    shootState.timer = Math.max(-dt, shootState.timer - dt)

    if (!input.fire) {
        shootState.timer = Math.max(0, shootState.timer)

        return
    }

    if (shootState.timer > 0) return

    const rot = Rotation[pid]
    const angle = Math.atan2(Math.cos(-rot), Math.sin(-rot))
    const size = 0.8 + (weapon.hitRadius ?? 0.5) * 0.6
    const result = spawnPlayerBullet(Position.x[pid], Position.y[pid], rot, weapon.id, BULLET_OWNER.PLAYER, pid)

    if (result.ids.length > 0) {
        for (const origin of result.origins) {
            emitEffect(EFFECT.FLASH, {
                x: origin.x,
                y: origin.y,
                angle,
                size,
                color: weapon.glowColor,
            })
        }
    }

    // Add the interval instead of discarding timing overshoot.
    shootState.timer += Math.max(dt, weapon.fireRate ?? 0.15)
}
