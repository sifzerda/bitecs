// src/ecs/systems/combat.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { bulletQuery, asteroidQuery, bossQuery, bossBulletQuery, playerQuery } from "../constants/queries.js"
import { Position, Health, Lifetime } from "../constants/components.js"
import { spawnAsteroid, spawnBoss, spawnSparkBurst } from "../spawn.js"
import { gameState } from "../../state/gameState.js"

const HIT_RADIUS = 0.7
const BOSS_RADIUS = 2.0
const PLAYER_HIT_RADIUS = 0.6

export function combatSystem() {

    const dt = world.time.delta
    const bullets = bulletQuery()
    const asteroids = asteroidQuery()
    const bosses = bossQuery()

    for (let i = 0; i < bullets.length; i++) {

        const bid = bullets[i]
        Lifetime.remaining[bid] -= dt

        if (Lifetime.remaining[bid] <= 0) {
            removeEntity(world, bid)
            continue
        }

        let hit = false

        // -------------------------
        // ASTEROIDS
        // -------------------------

        for (let j = 0; j < asteroids.length; j++) {

                     const aid = asteroids[j]
            const dx = Position.x[bid] - Position.x[aid]
            const dy = Position.y[bid] - Position.y[aid]

            if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {

                Health.current[aid] -= 10
                spawnSparkBurst(Position.x[bid], Position.y[bid], { count: 14, speed: 6 })

                if (Health.current[aid] <= 0) {
                    removeEntity(world, aid)
                    gameState.asteroidsRemaining--
                    gameState.score += 100
                    spawnSparkBurst(Position.x[aid], Position.y[aid], { count: 30, speed: 9, big: true })
                }

                removeEntity(world, bid)

                hit = true
                break
            }
        }

        if (hit) continue

        // -------------------------
        // BOSSES
        // -------------------------

for (let j = 0; j < bosses.length; j++) {

            const bossId = bosses[j]

            const dx = Position.x[bid] - Position.x[bossId]
            const dy = Position.y[bid] - Position.y[bossId]
            const dist2 = dx * dx + dy * dy

            if (dist2 <= BOSS_RADIUS * BOSS_RADIUS) {

                Health.current[bossId] -= 10
                spawnSparkBurst(Position.x[bid], Position.y[bid], { count: 18, speed: 7, big: true })

                removeEntity(world, bid)

                if (Health.current[bossId] <= 0) {

                    removeEntity(world, bossId)

                    gameState.score += 1000
                    gameState.bossAlive = false
                    gameState.asteroidsRemaining = 0
                    spawnSparkBurst(Position.x[bossId], Position.y[bossId], { count: 60, speed: 12, big: true })
                }

                break
            }
        }
    }

    // -------------------------
    // BOSS BULLETS vs PLAYER
    // -------------------------

    const bossBullets = bossBulletQuery()
    const players = playerQuery()
    const pid = players.length > 0 ? players[0] : null

    for (let i = 0; i < bossBullets.length; i++) {

        const eid = bossBullets[i]
        Lifetime.remaining[eid] -= dt

        if (Lifetime.remaining[eid] <= 0) {
            removeEntity(world, eid)
            continue
        }

        if (pid === null) continue

        const dx = Position.x[eid] - Position.x[pid]
        const dy = Position.y[eid] - Position.y[pid]

        if (dx * dx + dy * dy <= PLAYER_HIT_RADIUS * PLAYER_HIT_RADIUS) {

            Health.current[pid] -= 10
            removeEntity(world, eid)

            if (Health.current[pid] <= 0) {
                gameState.lives--
                Health.current[pid] = Health.max[pid]    
            }
        }
    }
}