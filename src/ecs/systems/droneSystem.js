// src/ecs/systems/droneSystem.js

import { world } from "../constants/world.js"
import { droneQuery, playerQuery, asteroidQuery } from "../constants/queries.js"
import { Position, Drone, BULLET_OWNER } from "../constants/components.js"
import { spawnBullet } from "../spawn.js"

export function droneSystem() {

    const dt = world.time.delta
    const drones = droneQuery()
    if (drones.length === 0) return

    const players = playerQuery()
    if (players.length === 0) return
    const pid = players[0]

    const asteroids = asteroidQuery()

    for (let i = 0; i < drones.length; i++) {

        const id = drones[i]

        //----------------------------------
        // Orbit around the player
        //----------------------------------

        Drone.orbitAngle[id] += Drone.orbitSpeed[id] * dt

        Position.x[id] = Position.x[pid] + Math.cos(Drone.orbitAngle[id]) * Drone.orbitRadius[id]
        Position.y[id] = Position.y[pid] + Math.sin(Drone.orbitAngle[id]) * Drone.orbitRadius[id]

        //----------------------------------
        // Auto-fire at the nearest asteroid in range
        //----------------------------------

        Drone.shootTimer[id] -= dt
        if (Drone.shootTimer[id] > 0) continue

        let nearestId = -1
        let nearestDistSq = Infinity

        for (let j = 0; j < asteroids.length; j++) {
            const aid = asteroids[j]
            const dx = Position.x[id] - Position.x[aid]
            const dy = Position.y[id] - Position.y[aid]
            const distSq = dx * dx + dy * dy
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq
                nearestId = aid
            }
        }

        if (nearestId === -1) continue   // nothing to shoot at

        if (nearestDistSq > Drone.range[id] * Drone.range[id]) continue   // nearest target still too far

        const dx = Position.x[nearestId] - Position.x[id]
        const dy = Position.y[nearestId] - Position.y[id]
        const rot = -Math.atan2(dx, dy)

        spawnBullet(Position.x[id], Position.y[id], rot, Drone.weapon[id], BULLET_OWNER.PLAYER)

        Drone.shootTimer[id] = Drone.fireRate[id]
    }
}