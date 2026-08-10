// src/ecs/systems/playerControlSystem.js

import { playerQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"
import { Position, Velocity, Rotation, BULLET_OWNER } from "../constants/components.js"
import { spawnPlayerBullet } from "../spawn.js"
import { input, isMouseControlEnabled } from "./input.js"
import { gameState } from "../../state/gameState.js"
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
// how quickly the ship turns toward the mouse (rad/s scale factor)
const MOUSE_TURN_SPEED = 8

export default function playerControlSystem(shootState) {

    const dt = world.time.delta
    const players = playerQuery()
    if (players.length === 0) return
    const pid = players[0]

    //----------------------------------
    // Turn
    //----------------------------------

    if (isMouseControlEnabled()) {
        // aim toward mouse world position
        const dx = input.worldX - Position.x[pid]
        const dy = input.worldY - Position.y[pid]

        // target angle matching the ship's Rotation convention
        // (same basis used by thrust: sin(-rot), cos(-rot))
        const targetRot = -Math.atan2(dx, dy)

        // shortest-path delta into [-PI, PI]
        let delta = targetRot - Rotation[pid]
        delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI
        if (delta < -Math.PI) delta += Math.PI * 2

        // smooth turn toward target
        const maxStep = MOUSE_TURN_SPEED * dt
        if (Math.abs(delta) <= maxStep) {
            Rotation[pid] = targetRot
        } else {
            Rotation[pid] += Math.sign(delta) * maxStep
        }
    } else {
        // keyboard-only rotation
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

    gameState.deflectBufferTime = Math.max(0, gameState.deflectBufferTime - dt)
    gameState.deflectFlashTimer = Math.max(0, gameState.deflectFlashTimer - dt)

    if (input.deflect) {
        gameState.deflectBufferTime = DEFLECT_BUFFER
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

    const weapon = getWeapon(gameState.currentWeapon)

    if (!getAction(weapon).continuous) {
        shootState.timer -= dt
        if (input.fire && shootState.timer <= 0) {

            const rot = Rotation[pid]
            const angle = Math.atan2(Math.cos(-rot), Math.sin(-rot)) // same fwd dir bullets use
            const size = 0.8 + (weapon.hitRadius ?? 0.5) * 0.6

            const { origins } = spawnPlayerBullet(
                Position.x[pid],
                Position.y[pid],
                rot,
                weapon.id,
                BULLET_OWNER.PLAYER,
                pid
            )

            for (const o of origins) {
                emitEffect(EFFECT.FLASH, {
                    x: o.x,
                    y: o.y,
                    angle,
                    size,
                    color: weapon.glowColor,
                })
            }

            shootState.timer = weapon.fireRate
        }
    }

}