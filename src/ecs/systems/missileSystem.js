// src/ecs/systems/missileSystem.js

import { world } from "../constants/world.js"
import { bossQuery, playerQuery } from "../constants/queries.js"
import { Position, Velocity, Bullet, BULLET_OWNER } from "../constants/components.js"
import { getWeapon } from "../constants/weapons.js"
import { activeBullets } from "../pools/bulletPool"
import { activeAsteroids } from "../pools/asteroidPool"

export function missileSystem() {

    const dt = world.time.delta
    const bullets = activeBullets
    const asteroids = activeAsteroids
    const bosses = bossQuery()
    const players = playerQuery()
    const weapon = getWeapon(3)

    for (let i = 0; i < bullets.length; i++) {

        const id = bullets[i]
        if (Bullet.type[id] !== 3) continue

        // -------------------------
        // Find nearest target
        // -------------------------

        let targetId = -1

        if (Bullet.owner[id] === BULLET_OWNER.PLAYER) {

            let bestDistSq = Infinity

            for (let j = 0; j < asteroids.length; j++) {
                const aid = asteroids[j]
                const dx = Position.x[aid] - Position.x[id]
                const dy = Position.y[aid] - Position.y[id]
                const distSq = dx * dx + dy * dy
                if (distSq < bestDistSq) {
                    bestDistSq = distSq
                    targetId = aid
                }
            }

            for (let j = 0; j < bosses.length; j++) {
                const bid = bosses[j]
                const dx = Position.x[bid] - Position.x[id]
                const dy = Position.y[bid] - Position.y[id]
                const distSq = dx * dx + dy * dy
                if (distSq < bestDistSq) {
                    bestDistSq = distSq
                    targetId = bid
                }
            }

        } else if (players.length > 0) {
            // enemy-owned missiles only ever home on the player
            targetId = players[0]
        }

        if (targetId === -1) continue   // nothing to home in on, keeps flying straight

        // -------------------------
        // Steer velocity toward target, preserving current speed
        // -------------------------

        const speed = Math.hypot(Velocity.x[id], Velocity.y[id])
        if (speed === 0) continue

        const curAngle = Math.atan2(Velocity.y[id], Velocity.x[id])

        const dx = Position.x[targetId] - Position.x[id]
        const dy = Position.y[targetId] - Position.y[id]
        const targetAngle = Math.atan2(dy, dx)

        let diff = targetAngle - curAngle
        while (diff > Math.PI) diff -= Math.PI * 2      // normalize so it always turns the short way
        while (diff < -Math.PI) diff += Math.PI * 2

        const maxTurn = weapon.turnRate * dt
        const turn = Math.max(-maxTurn, Math.min(maxTurn, diff))
        const newAngle = curAngle + turn

        Velocity.x[id] = Math.cos(newAngle) * speed
        Velocity.y[id] = Math.sin(newAngle) * speed
    }
}