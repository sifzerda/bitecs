// src/ecs/systems/playerControlSystem.js

import { playerQuery } from "../queries.js"
import { world } from "../world.js"

import {
    Position,
    Velocity,
    Rotation
} from "../components.js"

import { spawnBullet } from "../entities.js"


const TURN_SPEED = 4.5
const THRUST = 28
const BRAKE = 18
const MAX_SPEED = 24
const DRAG = 0.995


export default function playerControlSystem(
    keys,
    shootState
) {


    const dt = world.time.delta


    const players = playerQuery()


    if(players.length === 0) return


    const pid = players[0]



    // turning

    if(keys["ArrowLeft"] || keys["a"])
        Rotation[pid] += TURN_SPEED * dt


    if(keys["ArrowRight"] || keys["d"])
        Rotation[pid] -= TURN_SPEED * dt



    // thrust

    if(keys["ArrowUp"] || keys["w"]){

        Velocity.x[pid] += 
            Math.sin(-Rotation[pid]) * THRUST * dt


        Velocity.y[pid] += 
            Math.cos(-Rotation[pid]) * THRUST * dt

    }



    // reverse thrust

    if(keys["ArrowDown"] || keys["s"]){

        Velocity.x[pid] -= 
            Math.sin(-Rotation[pid]) * BRAKE * dt


        Velocity.y[pid] -= 
            Math.cos(-Rotation[pid]) * BRAKE * dt

    }



    // speed limit

    const speed = Math.hypot(
        Velocity.x[pid],
        Velocity.y[pid]
    )


    if(speed > MAX_SPEED){

        Velocity.x[pid] =
            (Velocity.x[pid] / speed) * MAX_SPEED

        Velocity.y[pid] =
            (Velocity.y[pid] / speed) * MAX_SPEED
    }



    // space drag

    Velocity.x[pid] *= DRAG
    Velocity.y[pid] *= DRAG



    // shooting

    shootState.timer -= dt


    if(keys[" "] && shootState.timer <= 0){

        spawnBullet(
            Position.x[pid],
            Position.y[pid],
            Rotation[pid]
        )


        shootState.timer = 0.15
    }

}