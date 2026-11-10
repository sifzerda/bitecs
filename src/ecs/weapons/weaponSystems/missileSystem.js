// src/ecs/weapons/weaponSystems/missileSystem.js

import { world } from "../../constants/world.js"
import { playerQuery, bossQuery } from "../../constants/queries.js"
import {
    Position,
    Velocity,
    Bullet,
    BULLET_OWNER,
    Health,
} from "../../constants/components.js"
import { getWeapon } from "../config/weapons.js"
import { activeBullets } from "../../pools/bulletPool.js"
import { activeAsteroids } from "../../pools/asteroidPool.js"

function nearestTarget(x, y, asteroids, bosses) {
    let target = -1
    let bestDistSq = Infinity

    for (let i = 0; i < asteroids.length; i++) {
        const id = asteroids[i]
        if (Health.current[id] <= 0) continue

        const dx = Position.x[id] - x
        const dy = Position.y[id] - y
        const distSq = dx * dx + dy * dy

        if (distSq < bestDistSq) {
            bestDistSq = distSq
            target = id
        }
    }

    for (let i = 0; i < bosses.length; i++) {
        const id = bosses[i]
        if (Health.current[id] <= 0) continue

        const dx = Position.x[id] - x
        const dy = Position.y[id] - y
        const distSq = dx * dx + dy * dy

        if (distSq < bestDistSq) {
            bestDistSq = distSq
            target = id
        }
    }

    return target
}

export function missileSystem() {
    const dt = world.time.delta
    const players = playerQuery()
    const bosses = bossQuery()

    for (let i = 0; i < activeBullets.length; i++) {
        const id = activeBullets[i]
        const weapon = getWeapon(Bullet.type[id])

        if (!weapon?.homing) continue

        let targetId = -1

        if (Bullet.owner[id] === BULLET_OWNER.PLAYER) {
            targetId = nearestTarget(
                Position.x[id],
                Position.y[id],
                activeAsteroids,
                bosses
            )
        } else if (players.length > 0) {
            targetId = players[0]
        }

        if (targetId === -1) continue

        const vx = Velocity.x[id]
        const vy = Velocity.y[id]
        const speed = Math.hypot(vx, vy)

        if (speed <= 1e-8) continue

        const currentAngle = Math.atan2(vy, vx)

        const dx = Position.x[targetId] - Position.x[id]
        const dy = Position.y[targetId] - Position.y[id]

        const targetAngle = Math.atan2(dy, dx)

        const difference = Math.atan2(
            Math.sin(targetAngle - currentAngle),
            Math.cos(targetAngle - currentAngle)
        )

        const turnRate = Math.max(0, weapon.turnRate ?? 3)
        const maxTurn = turnRate * dt

        const turn = Math.max(
            -maxTurn,
            Math.min(maxTurn, difference)
        )

        const angle = currentAngle + turn

        Velocity.x[id] = Math.cos(angle) * speed
        Velocity.y[id] = Math.sin(angle) * speed
    }
}
