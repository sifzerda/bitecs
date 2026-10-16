// src/ecs/systems/combat.js

import { world } from "../constants/world.js"
import { bossQuery, playerQuery } from "../constants/queries.js"
import { Position, Health, Invulnerability, Lifetime, Velocity, Bullet, BossType, BULLET_OWNER } from "../constants/components.js"
import { BOSSES } from "../constants/bosses.js"
import { useGameStore } from "../../../store/gameStore.js"
import { simState } from "../../state/simState.js"
import { killAsteroid, killBoss } from "./entityDeath.js"
import { explodeAt } from "../weapons/weaponSystems/weaponEffects.js"
import { releaseBulletEntity, activeBullets } from "../pools/bulletPool.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { resolveHit } from "../weapons/weaponSystems/hitTraits.js"
import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

// ============================================================
// COLLISION SETTINGS
// ============================================================

const PLAYER_HIT_RADIUS = 0.6
const ASTEROID_RADIUS = 0.7

const BOSS_RADIUS = 2.0

const DEFLECT_RADIUS = 4.0
const DEFLECT_SPEED_MULT = 1.3
const DEFLECT_FLASH_DURATION = 0.15

// Player protection after taking damage
const PLAYER_INVULNERABILITY_DURATION = 1.0

// ============================================================
// HELPERS
// ============================================================

function getBossHitRadius(bossId) {
    return BOSSES[BossType.typeIndex[bossId]]?.hitRadius ?? BOSS_RADIUS
}

// ============================================================
// PLAYER DAMAGE
// ============================================================

function damagePlayer(pid, amount) {

    // Already protected from damage.
    if (Invulnerability.remaining[pid] > 0) {
        return false
    }

    Health.current[pid] -= amount

    // Prevent another hit for one second.
    Invulnerability.remaining[pid] = PLAYER_INVULNERABILITY_DURATION

    if (Health.current[pid] <= 0) {

        simState.lives--

        if (simState.lives <= 0) {

            useGameStore
                .getState()
                .gameOver()

            return true
        }

        // Existing life system: restore health on respawn.
        Health.current[pid] = Health.max[pid]
    }

    return true
}

// ============================================================
// MAIN COMBAT SYSTEM
// ============================================================

export function combatSystem() {

    const dt = world.time.delta

    const bullets = activeBullets
    const asteroids = activeAsteroids

    const bosses = bossQuery()
    const players = playerQuery()

    const pid = players.length > 0 ? players[0] : null

    // ========================================================
    // BULLET COLLISIONS
    // ========================================================

    for (let i = 0; i < bullets.length; i++) {

        const bid = bullets[i]
        const weapon = getWeapon(Bullet.type[bid])

        if (!weapon) {
            releaseBulletEntity(bid)
            continue
        }

        // ----------------------------------------------------
        // Lifetime
        // ----------------------------------------------------

        Lifetime.remaining[bid] -= dt

        if (Lifetime.remaining[bid] <= 0) {

            if (weapon.explosive) {

                explodeAt(Position.x[bid], Position.y[bid], weapon, asteroids, bosses)
            }

            releaseBulletEntity(bid)
            continue
        }

        // ====================================================
        // PLAYER BULLETS
        // ====================================================

        if (Bullet.owner[bid] === BULLET_OWNER.PLAYER) {

            let hit = false

            // ------------------------------------------------
            // Asteroids
            // ------------------------------------------------

            for (let j = 0; j < asteroids.length; j++) {

                const aid = asteroids[j]

                const dx = Position.x[bid] - Position.x[aid]
                const dy = Position.y[bid] - Position.y[aid]

                const hitDistance =
                    weapon.hitRadius + ASTEROID_RADIUS

                if (dx * dx + dy * dy <= hitDistance * hitDistance) {

                    resolveHit({
                        x: Position.x[bid],
                        y: Position.y[bid],
                        targetId: aid,
                        weapon,
                        owner: Bullet.owner[bid],
                        kill: killAsteroid,
                        asteroids,
                        bosses,
                    })

                    releaseBulletEntity(bid)

                    hit = true
                    break
                }
            }

            if (hit) continue

            // ------------------------------------------------
            // Bosses
            // ------------------------------------------------

            for (let j = 0; j < bosses.length; j++) {

                const bossId = bosses[j]

                const dx = Position.x[bid] - Position.x[bossId]
                const dy = Position.y[bid] - Position.y[bossId]

                const hitDistance = weapon.hitRadius + getBossHitRadius(bossId)

                if (dx * dx + dy * dy <= hitDistance * hitDistance) {

                    resolveHit({
                        x: Position.x[bid],
                        y: Position.y[bid],
                        targetId: bossId,
                        weapon,
                        owner: Bullet.owner[bid],
                        kill: killBoss,
                        asteroids,
                        bosses,
                        big: true,
                    })

                    releaseBulletEntity(bid)
                    break
                }
            }
        }

        // ====================================================
        // ENEMY BULLETS
        // ====================================================

        else {

            if (pid === null) continue

            if (Invulnerability.remaining[pid] > 0) {
                continue
            }

            const dx = Position.x[bid] - Position.x[pid]
            const dy = Position.y[bid] - Position.y[pid]

            const distSq = dx * dx + dy * dy

            // ------------------------------------------------
            // Deflect
            // ------------------------------------------------

            if (
                simState.deflectBufferTime > 0 &&
                distSq <= DEFLECT_RADIUS * DEFLECT_RADIUS
            ) {

                const dist = Math.sqrt(distSq) || 1

                const nx = dx / dist
                const ny = dy / dist

                const vx = Velocity.x[bid]
                const vy = Velocity.y[bid]

                const dot = vx * nx + vy * ny

                let rvx = vx - 2 * dot * nx
                let rvy = vy - 2 * dot * ny

                if (dot > 0) {
                    rvx = nx
                    rvy = ny
                }

                const speed = Math.hypot(vx, vy) || 1
                const outSpeed = speed * DEFLECT_SPEED_MULT

                const rLen = Math.hypot(rvx, rvy) || 1

                Velocity.x[bid] = (rvx / rLen) * outSpeed
                Velocity.y[bid] = (rvy / rLen) * outSpeed

                Bullet.owner[bid] = BULLET_OWNER.PLAYER

                simState.deflectFlashTimer = DEFLECT_FLASH_DURATION
                simState.deflectFlashX = Position.x[pid]
                simState.deflectFlashY = Position.y[pid]

                continue
            }

            // ------------------------------------------------
            // Player hit
            // ------------------------------------------------

            if (distSq <= PLAYER_HIT_RADIUS * PLAYER_HIT_RADIUS) {

                damagePlayer(pid, weapon.directDamage)
                releaseBulletEntity(bid)
            }
        }
    }

}
