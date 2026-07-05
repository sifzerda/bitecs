// src/ecs/systems/combat.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"

import {
    bulletQuery,
    asteroidQuery,
    bossQuery,
    playerQuery
} from "../constants/queries.js"

import {
    Position,
    Health,
    Lifetime,
    Bullet,
    BULLET_OWNER
} from "../constants/components.js"

import { spawnSparkBurst } from "../spawn.js"
import { gameState } from "../../state/gameState.js"
import { killAsteroid, killBoss } from "./entityDeath.js"
import { getWeapon } from "../constants/weapons.js"

const HIT_RADIUS = 0.7
const BOSS_RADIUS = 2.0
const PLAYER_HIT_RADIUS = 0.6

export function combatSystem() {

    const dt = world.time.delta

    const bullets = bulletQuery()
    const asteroids = asteroidQuery()
    const bosses = bossQuery()
    const players = playerQuery()

    const pid = players.length > 0 ? players[0] : null

    for (let i = 0; i < bullets.length; i++) {

        const bid = bullets[i]
        const weapon = getWeapon(Bullet.type[bid])

        //----------------------------------
        // Lifetime
        //----------------------------------

        Lifetime.remaining[bid] -= dt

        if (Lifetime.remaining[bid] <= 0) {
            removeEntity(world, bid)
            continue
        }

        //----------------------------------
        // PLAYER BULLETS
        //----------------------------------

        if (Bullet.owner[bid] === BULLET_OWNER.PLAYER) {

            let hit = false

            // -------------------------
            // Asteroids
            // -------------------------

            for (let j = 0; j < asteroids.length; j++) {

                const aid = asteroids[j]

                const dx = Position.x[bid] - Position.x[aid]
                const dy = Position.y[bid] - Position.y[aid]

                if (dx * dx + dy * dy <= weapon.hitRadius * weapon.hitRadius) {

                    Health.current[aid] -= weapon.damage

                    spawnSparkBurst(
                        Position.x[bid],
                        Position.y[bid],
                        { count: 20, speed: 8 }
                    )

                    if (Health.current[aid] <= 0) {
                        killAsteroid(aid, Position.x[aid], Position.y[aid])
                    }

                    removeEntity(world, bid)
                    hit = true
                    break
                }
            }

            if (hit) continue

            // -------------------------
            // Bosses
            // -------------------------

           for (let j = 0; j < bosses.length; j++) {

                const bossId = bosses[j]

                const dx = Position.x[bid] - Position.x[bossId]
                const dy = Position.y[bid] - Position.y[bossId]

                // boss is a much bigger target than an asteroid — keep a fixed
                // multiplier on the weapon's own hitRadius rather than a separate constant
                const bossRadius = weapon.hitRadius * 3

                if (dx * dx + dy * dy <= bossRadius * bossRadius) {

                    Health.current[bossId] -= weapon.damage

                    spawnSparkBurst(
                        Position.x[bid],
                        Position.y[bid],
                        { count: 26, speed: 10, big: true }
                    )

                    removeEntity(world, bid)

                    if (Health.current[bossId] <= 0) {
                        killBoss(bossId, Position.x[bossId], Position.y[bossId])
                    }

                    break
                }
            }

        }

        //----------------------------------
        // ENEMY BULLETS
        //----------------------------------

        else {

            if (pid === null) continue

            const dx = Position.x[bid] - Position.x[pid]
            const dy = Position.y[bid] - Position.y[pid]

            if (dx * dx + dy * dy <= PLAYER_HIT_RADIUS * PLAYER_HIT_RADIUS) {

                Health.current[pid] -= weapon.damage

                removeEntity(world, bid)

                if (Health.current[pid] <= 0) {
                    gameState.lives--
                    Health.current[pid] = Health.max[pid]
                }
            }
        }
    }
}