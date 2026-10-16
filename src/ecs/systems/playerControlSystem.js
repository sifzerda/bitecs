// src/ecs/systems/playerControlSystem.js

import { playerQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"
import { Position, Velocity, Rotation, BULLET_OWNER } from "../constants/components.js"
import { spawnPlayerBullet } from "../spawn.js"
import { input, isMouseControlEnabled } from "./input.js"
import { simState } from "../../state/simState.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { getAction } from "../weapons/config/weaponActions.js"

import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

const TURN_SPEED = 4.5
const THRUST = 28
const BRAKE = 18
const MAX_SPEED = 24
const DRAG = 0.995
const DEFLECT_BUFFER = 0.6

// Mouse steering physics
const MOUSE_MAX_TURN_SPEED = 5.5
const MOUSE_TURN_ACCELERATION = 20
const MOUSE_TURN_GAIN = 12
const MOUSE_TURN_DAMPING = 2.0

let mouseTurnVelocity = 0

export default function playerControlSystem(shootState) {

    const dt = world.time.delta
    const players = playerQuery()
    if (players.length === 0) return
    const pid = players[0]

    //----------------------------------
    // Turn
    //----------------------------------

    if (isMouseControlEnabled()) {

        const dx = input.worldX - Position.x[pid]
        const dy = input.worldY - Position.y[pid]

        const targetRot = -Math.atan2(dx, dy)

        // Shortest angular distance to target
        let delta = targetRot - Rotation[pid]

        delta = Math.atan2(Math.sin(delta), Math.cos(delta))

        // Calculate desired angular velocity.
        // Damping prevents excessive overshooting.
        let desiredTurnVelocity = delta * MOUSE_TURN_GAIN - mouseTurnVelocity * MOUSE_TURN_DAMPING

        // Maximum rotation speed
        desiredTurnVelocity = Math.max(-MOUSE_MAX_TURN_SPEED, Math.min(MOUSE_MAX_TURN_SPEED, desiredTurnVelocity))

        // Angular acceleration
        const velocityDifference = desiredTurnVelocity - mouseTurnVelocity
        const maxAcceleration = MOUSE_TURN_ACCELERATION * dt

        mouseTurnVelocity += Math.max(-maxAcceleration, Math.min(maxAcceleration, velocityDifference))

        // Apply rotational momentum
        Rotation[pid] += mouseTurnVelocity * dt

    } else {

        // Keyboard-only rotation
        mouseTurnVelocity = 0

        if (input.left)
            Rotation[pid] += TURN_SPEED * dt

        if (input.right)
            Rotation[pid] -= TURN_SPEED * dt
    }

    //----------------------------------
    // Thrust
    //----------------------------------

    if (input.thrust) {
        Velocity.x[pid] += Math.sin(-Rotation[pid]) * THRUST * dt
        Velocity.y[pid] += Math.cos(-Rotation[pid]) * THRUST * dt
    }

    //----------------------------------
    // Reverse thrust
    //----------------------------------

    if (input.brake) {
        Velocity.x[pid] -= Math.sin(-Rotation[pid]) * BRAKE * dt
        Velocity.y[pid] -= Math.cos(-Rotation[pid]) * BRAKE * dt
    }

    //----------------------------------
    // Deflect
    //----------------------------------

    simState.deflectBufferTime = Math.max(0, simState.deflectBufferTime - dt)
    simState.deflectFlashTimer = Math.max(0, simState.deflectFlashTimer - dt)

    if (input.deflect) {
        simState.deflectBufferTime = DEFLECT_BUFFER
        input.deflect = false
    }

    //----------------------------------
    // Clamp speed
    //----------------------------------

    const speed = Math.hypot(Velocity.x[pid], Velocity.y[pid])

   if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed
        Velocity.x[pid] *= scale
        Velocity.y[pid] *= scale
    }

    //----------------------------------
    // Drag
    //----------------------------------

    Velocity.x[pid] *= DRAG
    Velocity.y[pid] *= DRAG

    //----------------------------------
    // Shooting
    //----------------------------------

    const weapon = getWeapon(simState.currentWeapon)

    if (!getAction(weapon).continuous) {
        shootState.timer -= dt
        if (input.fire && shootState.timer <= 0) {

            const rot = Rotation[pid]
            const angle = Math.atan2(Math.cos(-rot), Math.sin(-rot)) // same fwd dir bullets use
            const size = 0.8 + (weapon.hitRadius ?? 0.5) * 0.6

            const { origins } = spawnPlayerBullet(Position.x[pid], Position.y[pid], rot, weapon.id, BULLET_OWNER.PLAYER, pid)

            for (const o of origins) {
                emitEffect(EFFECT.FLASH, { x: o.x, y: o.y, angle, size, color: weapon.glowColor })
            }

            shootState.timer = weapon.fireRate
        }
    }

}