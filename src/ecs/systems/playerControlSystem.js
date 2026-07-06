// src/ecs/systems/playerControlSystem.js

import { playerQuery, asteroidQuery, bossQuery, droneQuery } from "../constants/queries.js"
import { world } from "../constants/world.js"
import { Position, Velocity, Rotation, BULLET_OWNER } from "../constants/components.js"
import { spawnBullet, spawnDrone, spawnHazard } from "../spawn.js"
import { input } from "./input.js"
import { gameState } from "../../state/gameState.js"
import { getWeapon } from "../constants/weapons.js"
import { explodeAt } from "./weaponEffects.js"

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

    } else if (weapon.category === "pulse") {
        shootState.timer -= dt
        if (input.fire && shootState.timer <= 0) {
            explodeAt(Position.x[pid], Position.y[pid], weapon, asteroidQuery(), bossQuery())
            shootState.timer = weapon.fireRate
        }

    } else if (weapon.category === "mine") {
        shootState.timer -= dt
        if (input.fire && shootState.timer <= 0) {
            spawnHazard(Position.x[pid], Position.y[pid], weapon.id, BULLET_OWNER.PLAYER, -1)
            shootState.timer = weapon.fireRate
        }

    } else if (weapon.category === "drone") {
        // deploy once — droneSystem handles orbiting/firing every frame after this
        if (droneQuery().length === 0) {
            for (let i = 0; i < weapon.droneCount; i++) {
                spawnDrone(Position.x[pid], Position.y[pid], weapon.id, i, weapon.droneCount)
            }
        }



    } else {
        shootState.timer -= dt
        if (input.fire && shootState.timer <= 0) {
            spawnBullet(Position.x[pid], Position.y[pid], Rotation[pid], weapon.id, BULLET_OWNER.PLAYER)
            shootState.timer = weapon.fireRate
        }
    }

}