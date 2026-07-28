// src/ecs/weapons/weaponSystems/missileSystem.js

import { world } from "../../constants/world.js"
import { playerQuery } from "../../constants/queries.js"
import { Position, Velocity, Bullet, BULLET_OWNER } from "../../constants/components.js"
import { getWeapon } from "../config/weapons.js"
import { activeBullets } from "../../pools/bulletPool.js"
import { findNearestAsteroid, findNearestBoss } from "../../constants/spatialGrid.js"

export function missileSystem() {

    const dt = world.time.delta
    const bullets = activeBullets
    const players = playerQuery()

    for (let i = 0; i < bullets.length; i++) {

        const id = bullets[i]
        const weapon = getWeapon(Bullet.type[id])

        if (!weapon.homing)
            continue

        let targetId = -1

        if (Bullet.owner[id] === BULLET_OWNER.PLAYER) {

            const asteroid = findNearestAsteroid(Position.x[id], Position.y[id])
            const boss = findNearestBoss(Position.x[id], Position.y[id])

            if (asteroid === -1) {
                targetId = boss

            } else if (boss === -1) {
                targetId = asteroid
                
            } else {

                const adx = Position.x[asteroid] - Position.x[id]
                const ady = Position.y[asteroid] - Position.y[id]

                const bdx = Position.x[boss] - Position.x[id]
                const bdy = Position.y[boss] - Position.y[id]

                const asteroidDistSq = adx * adx + ady * ady
                const bossDistSq = bdx * bdx + bdy * bdy

                targetId = asteroidDistSq < bossDistSq
                    ? asteroid
                    : boss
            }

        } else if (players.length > 0) {

            targetId = players[0]

        }

        if (targetId === -1)
            continue

        const speed = Math.hypot(Velocity.x[id], Velocity.y[id])

        if (speed === 0)
            continue

        const curAngle = Math.atan2(Velocity.y[id], Velocity.x[id])

        const dx = Position.x[targetId] - Position.x[id]
        const dy = Position.y[targetId] - Position.y[id]

        const targetAngle = Math.atan2(dy, dx)

        let diff = targetAngle - curAngle

        while (diff > Math.PI)
            diff -= Math.PI * 2

        while (diff < -Math.PI)
            diff += Math.PI * 2

        const maxTurn = weapon.turnRate * dt
        const turn = Math.max(-maxTurn, Math.min(maxTurn, diff))
        const newAngle = curAngle + turn

        Velocity.x[id] = Math.cos(newAngle) * speed
        Velocity.y[id] = Math.sin(newAngle) * speed
    }
}