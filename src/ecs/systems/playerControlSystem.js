// src/ecs/systems/playerControlSystem.js

import { playerQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"
import { Position, Velocity, Rotation } from "../constants/components.js"
import { spawnBullet, spawnExhaust } from "../spawn.js"
import { input } from "./input.js"
import { gameStats } from "../../state/gameStats.js"

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
        spawnExhaust(Position.x[pid], Position.y[pid], Rotation[pid])
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

    gameStats.boostCooldown = Math.max(0, gameStats.boostCooldown - dt)
    gameStats.boostActive = Math.max(0, gameStats.boostActive - dt)

    // trigger: only allowed to start a fresh boost window when off cooldown
    if (input.boost && gameStats.boostCooldown <= 0 && gameStats.boostActive <= 0) {
        gameStats.boostActive = BOOST_DURATION
        gameStats.boostCooldown = BOOST_COOLDOWN
    }

    // continuous thrust for as long as the boost window is active,
    // re-reads Rotation every frame so it curves with turning
    if (gameStats.boostActive > 0) {
        Velocity.x[pid] += Math.sin(-Rotation[pid]) * BOOST_THRUST * dt
        Velocity.y[pid] += Math.cos(-Rotation[pid]) * BOOST_THRUST * dt
    }

    //----------------------------------
    // Clamp speed
    //----------------------------------

    const currentMaxSpeed = gameStats.boostActive > 0 ? BOOST_MAX_SPEED : MAX_SPEED

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

    shootState.timer -= dt

    if (input.fire && shootState.timer <= 0) {
        spawnBullet(Position.x[pid], Position.y[pid], Rotation[pid])
        shootState.timer = FIRE_RATE
    }

}