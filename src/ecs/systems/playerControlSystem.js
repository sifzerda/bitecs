// src/ecs/systems/playerControlSystem.js

import { playerQuery, bossQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"
import { Position, Velocity, Rotation, BULLET_OWNER } from "../constants/components.js"
import { spawnBullet, spawnPlayerBullet, spawnHazard } from "../spawn.js"
import { input } from "./input.js"
import { gameState } from "../../state/gameState.js"
import { getWeapon } from "../constants/weapons.js"
import { explodeAt } from "./weaponEffects.js"

import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

const TURN_SPEED = 4.5
const THRUST = 28
const BRAKE = 18
const MAX_SPEED = 24
const DRAG = 0.995
const FIRE_RATE = 0.15

const BOOST_THRUST = 90       // 
const BOOST_MAX_SPEED = 40
export const BOOST_DURATION = 0.35
export const BOOST_COOLDOWN = 2.0

const DEFLECT_BUFFER = 0.6
const MUZZLE_OFFSET = 0.9

// helper to position twin muzzle flashes

function emitTwinFlash(pid, weapon) {

    const rot = Rotation[pid]

    // gunCfg.offsetX == gun side offset, offsetY == gun forward offset,
    // in the ship's local frame — same convention WeaponMount uses to
    // place the twin GunRenderer instances, so the flash always sits
    // exactly where the visible barrels are, even if mount tuning changes.
    const gunType = getGunTypeByWeaponId(weapon.id)
    const { offsetX: sideOffset, offsetY: forwardOffset } = gunType.config.mount

    const fwdX = Math.sin(-rot)
    const fwdY = Math.cos(-rot)
    const perpX = Math.cos(-rot)
    const perpY = -Math.sin(-rot)

    const baseX = Position.x[pid] + fwdX * forwardOffset
    const baseY = Position.y[pid] + fwdY * forwardOffset

    const angle = Math.atan2(fwdY, fwdX)
    const size = 0.8 + (weapon.hitRadius ?? 0.5) * 0.6
    const color = weapon.glowColor

    emitEffect(EFFECT.FLASH, {
        x: baseX + perpX * sideOffset,
        y: baseY + perpY * sideOffset,
        angle,
        size,
        color,
    })

    emitEffect(EFFECT.FLASH, {
        x: baseX - perpX * sideOffset,
        y: baseY - perpY * sideOffset,
        angle,
        size,
        color,
    })

}

export default function playerControlSystem(shootState) {

    const dt = world.time.delta
    const players = playerQuery()
    if (players.length === 0) return
    const pid = players[0]

    //----------------------------------
    // Turn
    //----------------------------------

    if (input.left)
        Rotation[pid] += TURN_SPEED * dt

    if (input.right)
        Rotation[pid] -= TURN_SPEED * dt

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
    // Boost
    //----------------------------------

    gameState.boostCooldown = Math.max(0, gameState.boostCooldown - dt)
    gameState.boostActive = Math.max(0, gameState.boostActive - dt)

    // trigger: only allowed to start a fresh boost window when off cooldown
    if (input.boost && gameState.boostCooldown <= 0 && gameState.boostActive <= 0) {
        gameState.boostActive = BOOST_DURATION
        gameState.boostCooldown = BOOST_COOLDOWN
    }

    // continuous thrust for as long as the boost window is active,
    // re-reads Rotation every frame so it curves with turning
    if (gameState.boostActive > 0) {
        Velocity.x[pid] += Math.sin(-Rotation[pid]) * BOOST_THRUST * dt
        Velocity.y[pid] += Math.cos(-Rotation[pid]) * BOOST_THRUST * dt
    }

    //----------------------------------
    // Deflect
    //----------------------------------

    gameState.deflectBufferTime = Math.max(0, gameState.deflectBufferTime - dt)
    gameState.deflectFlashTimer = Math.max(0, gameState.deflectFlashTimer - dt)

    if (input.deflectOn) {
        gameState.deflectBufferTime = DEFLECT_BUFFER
        input.deflectOn = false
    }

    //----------------------------------
    // Clamp speed
    //----------------------------------

    const currentMaxSpeed = gameState.boostActive > 0 ? BOOST_MAX_SPEED : MAX_SPEED

    const speed = Math.hypot(
        Velocity.x[pid],
        Velocity.y[pid]
    )

    if (speed > currentMaxSpeed) {
        const scale = currentMaxSpeed / speed
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

    if (weapon.category === "beam") {
        // beam weapons are handled entirely by laserSystem — no discrete spawn/cooldown here
    } else if (weapon.category === "flame") {
        // handled entirely by flameSystem

    } else {
        shootState.timer -= dt
        if (input.fire && shootState.timer <= 0) {

            const rot = Rotation[pid]
            const angle = Math.atan2(Math.cos(-rot), Math.sin(-rot)) // same fwd dir bullets use
            const size = 0.8 + (weapon.hitRadius ?? 0.5) * 0.6

            const { origins } = spawnPlayerBullet(Position.x[pid], Position.y[pid], rot, weapon.id, BULLET_OWNER.PLAYER)

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