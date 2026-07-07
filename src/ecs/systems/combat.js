// src/ecs/systems/combat.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"

import {
    bossQuery,
    playerQuery,
} from "../constants/queries.js"

import {
    Position,
    Health,
    Lifetime,
    Velocity,
    Bullet,
    StatusEffect,
    BULLET_OWNER
} from "../constants/components.js"

import { spawnSparkBurst, spawnHazard } from "../spawn.js"
import { gameState } from "../../state/gameState.js"
import { killAsteroid, killBoss } from "./entityDeath.js"
import { getWeapon } from "../constants/weapons.js"
import { explodeAt, splitBullet, chainLightning } from "./weaponEffects.js"
import { releaseBulletEntity, activeBullets } from "../pools/bulletPool"
import { activeAsteroids } from "../pools/asteroidPool"

const PLAYER_HIT_RADIUS = 0.6
const ASTEROID_RADIUS = 0.7
const BOSS_RADIUS = 2.0
const bullets = activeBullets

export function combatSystem() {

    const dt = world.time.delta
    const bullets = activeBullets
    const asteroids = activeAsteroids
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

            if (weapon.explosive) {
                explodeAt(Position.x[bid], Position.y[bid], weapon, asteroids, bosses)
            } else if (weapon.leavesHazard) {
                spawnHazard(Position.x[bid], Position.y[bid], weapon.id, Bullet.owner[bid], -1)
            } else if (weapon.splitsInto) {
                splitBullet(Position.x[bid], Position.y[bid], weapon, Bullet.owner[bid])
            }

            releaseBulletEntity(bid)
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

                const asteroidHitDist = weapon.hitRadius + ASTEROID_RADIUS
                if (dx * dx + dy * dy <= asteroidHitDist * asteroidHitDist) {

                    if (weapon.explosive) {

                        explodeAt(Position.x[bid], Position.y[bid], weapon, asteroids, bosses)

                    } else if (weapon.leavesHazard) {

                        if (weapon.damage > 0) Health.current[aid] -= weapon.damage
                        spawnHazard(Position.x[bid], Position.y[bid], weapon.id, Bullet.owner[bid], -1)

                        if (Health.current[aid] <= 0) {
                            killAsteroid(aid, Position.x[aid], Position.y[aid])
                        }

                    } else if (weapon.attachHazard) {

                        spawnHazard(Position.x[bid], Position.y[bid], weapon.id, Bullet.owner[bid], aid)

                    } else if (weapon.splitsInto) {

                        Health.current[aid] -= weapon.damage
                        if (Health.current[aid] <= 0) killAsteroid(aid, Position.x[aid], Position.y[aid])
                        splitBullet(Position.x[bid], Position.y[bid], weapon, Bullet.owner[bid])

                    } else if (weapon.freezeDuration) {

                        Health.current[aid] -= weapon.damage
                        StatusEffect.frozen[aid] = weapon.freezeDuration
                        if (Health.current[aid] <= 0) killAsteroid(aid, Position.x[aid], Position.y[aid])

                    } else if (weapon.chainCount) {

                        Health.current[aid] -= weapon.damage
                        if (Health.current[aid] <= 0) killAsteroid(aid, Position.x[aid], Position.y[aid])
                        chainLightning(Position.x[aid], Position.y[aid], weapon, asteroids, aid)

                    } else {

                        Health.current[aid] -= weapon.damage
                        spawnSparkBurst(Position.x[bid], Position.y[bid], { count: 20, speed: 8 })

                        if (Health.current[aid] <= 0) {
                            killAsteroid(aid, Position.x[aid], Position.y[aid])
                        }

                        if (Bullet.bounces[bid] > 0) {

                            const dist = Math.sqrt(dx * dx + dy * dy) || 1
                            const nx = dx / dist
                            const ny = dy / dist
                            const dot = Velocity.x[bid] * nx + Velocity.y[bid] * ny

                            Velocity.x[bid] -= 2 * dot * nx
                            Velocity.y[bid] -= 2 * dot * ny
                            Bullet.bounces[bid] -= 1

                            hit = true
                            break
                        }
                    }

                    releaseBulletEntity(bid)
                    hit = true
                    break
                }
            }

            if (hit) continue

            // -------------------------
            // -------------------------

            for (let j = 0; j < bosses.length; j++) {

                const bossId = bosses[j]

                const dx = Position.x[bid] - Position.x[bossId]
                const dy = Position.y[bid] - Position.y[bossId]
                const bossRadius = weapon.hitRadius + BOSS_RADIUS

                if (dx * dx + dy * dy <= bossRadius * bossRadius) {

                    if (weapon.explosive) {

                        explodeAt(Position.x[bid], Position.y[bid], weapon, asteroids, bosses)

                    } else if (weapon.leavesHazard) {

                        if (weapon.damage > 0) Health.current[bossId] -= weapon.damage
                        spawnHazard(Position.x[bid], Position.y[bid], weapon.id, Bullet.owner[bid], -1)

                        if (Health.current[bossId] <= 0) {
                            killBoss(bossId, Position.x[bossId], Position.y[bossId])
                        }

                    } else if (weapon.attachHazard) {

                        // attach the DoT to the boss itself rather than an asteroid
                        spawnHazard(Position.x[bid], Position.y[bid], weapon.id, Bullet.owner[bid], bossId)

                    } else if (weapon.splitsInto) {

                        Health.current[bossId] -= weapon.damage
                        if (Health.current[bossId] <= 0) killBoss(bossId, Position.x[bossId], Position.y[bossId])
                        splitBullet(Position.x[bid], Position.y[bid], weapon, Bullet.owner[bid])

                    } else if (weapon.freezeDuration) {

                        Health.current[bossId] -= weapon.damage
                        StatusEffect.frozen[bossId] = weapon.freezeDuration
                        if (Health.current[bossId] <= 0) killBoss(bossId, Position.x[bossId], Position.y[bossId])

                    } else if (weapon.chainCount) {

                        Health.current[bossId] -= weapon.damage
                        if (Health.current[bossId] <= 0) killBoss(bossId, Position.x[bossId], Position.y[bossId])
                        // chains out from the boss into nearby asteroids —
                        // bossId isn't in the asteroids list, so no exclude needed
                        chainLightning(Position.x[bossId], Position.y[bossId], weapon, asteroids, -1)

                    } else {

                        Health.current[bossId] -= weapon.damage
                        spawnSparkBurst(Position.x[bid], Position.y[bid], { count: 26, speed: 10, big: true })

                        if (Health.current[bossId] <= 0) {
                            killBoss(bossId, Position.x[bossId], Position.y[bossId])
                        }

                    }

                    removeEntity(world, bid)
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
                releaseBulletEntity(bid)

                if (Health.current[pid] <= 0) {
                    gameState.lives--
                    Health.current[pid] = Health.max[pid]

                }
            }
        }
    }
}