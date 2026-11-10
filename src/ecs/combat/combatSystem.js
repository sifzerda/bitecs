// src/ecs/combat/combatSystem.js

import { world } from "../constants/world.js"
import { bossQuery, playerQuery } from "../constants/queries.js"
import {
    Position, Velocity, Lifetime, Invulnerability, Asteroid,
    Bullet, BossType, BULLET_OWNER,
} from "../constants/components.js"
import { BOSSES } from "../constants/bosses.js"
import { forEachAsteroidNear } from "../constants/spatialGrid.js"
import { useGameStore, SCREEN } from "../../../store/gameStore.js"
import { startState } from "../../state/startState.js"
import { killAsteroid, killBoss } from "../systems/entityDeath.js"
import { explodeAt } from "../weapons/weaponSystems/weaponEffects.js"
import { releaseBulletEntity, activeBullets } from "../pools/bulletPool.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { resolveHit } from "../weapons/weaponSystems/hitTraits.js"
import { damagePlayer } from "../systems/playerDamage.js"

const PLAYER_RADIUS = 0.6
const DEFAULT_BOSS_RADIUS = 2
const DEFLECT_RADIUS_SQ = 16
const DEFLECT_SPEED_MULT = 1.3
const DEFLECT_FLASH_DURATION = 0.15

function encounterActive() {
    const state = useGameStore.getState()
    return state.screen === SCREEN.PLAY &&
        !state.paused && startState.encounterPhase === "active"
}

function overlaps(a, b, radius) {
    const dx = Position.x[a] - Position.x[b]
    const dy = Position.y[a] - Position.y[b]
    return dx * dx + dy * dy <= radius * radius
}

function bossRadius(id) {
    return BOSSES[BossType.typeIndex[id]]?.hitRadius ?? DEFAULT_BOSS_RADIUS
}

function reflectBullet(bid, pid) {
    const dx = Position.x[bid] - Position.x[pid]
    const dy = Position.y[bid] - Position.y[pid]
    const distanceSq = dx * dx + dy * dy
    if (distanceSq > DEFLECT_RADIUS_SQ) return false

    const vx = Velocity.x[bid]
    const vy = Velocity.y[bid]
    const speed = Math.hypot(vx, vy)
    let nx, ny
    if (distanceSq > 1e-10) {
        const inv = 1 / Math.sqrt(distanceSq)
        nx = dx * inv
        ny = dy * inv
    } else if (speed > 1e-6) {
        nx = -vx / speed
        ny = -vy / speed
    } else {
        nx = 1
        ny = 0
    }

    const dot = vx * nx + vy * ny
    const reflectedX = dot >= 0 ? vx : vx - 2 * dot * nx
    const reflectedY = dot >= 0 ? vy : vy - 2 * dot * ny
    const length = Math.hypot(reflectedX, reflectedY)
    const outputSpeed = Math.max(speed, 1) * DEFLECT_SPEED_MULT
    Velocity.x[bid] = length > 1e-6 ? reflectedX / length * outputSpeed : nx * outputSpeed
    Velocity.y[bid] = length > 1e-6 ? reflectedY / length * outputSpeed : ny * outputSpeed
    Bullet.owner[bid] = BULLET_OWNER.PLAYER
    Bullet.deflected[bid] = 1
    Bullet.source[bid] = pid
    startState.deflectFlashTimer = DEFLECT_FLASH_DURATION
    startState.deflectFlashX = Position.x[pid]
    startState.deflectFlashY = Position.y[pid]
    return true
}

// The grid inserts each asteroid into every cell its circle touches.
// forEachAsteroidNear already tests projectileRadius + Asteroid.radius[id].
function hitAsteroid(bid, weapon, projectileRadius, bosses) {
    const x = Position.x[bid]
    const y = Position.y[bid]
    let targetId = -1
    let targetVersion = 0

    forEachAsteroidNear(x, y, projectileRadius, (id) => {
        targetId = id
        targetVersion = Asteroid.spawnVersion[id]
        return false
    })

    if (targetId === -1 || !Asteroid.active[targetId] ||
        Asteroid.spawnVersion[targetId] !== targetVersion) return false

    resolveHit({
        x, y, targetId, weapon, owner: Bullet.owner[bid],
        directionX: Velocity.x[bid], directionY: Velocity.y[bid],
        kill: killAsteroid, asteroids: activeAsteroids, bosses,
    })
    return true
}

function hitBoss(bid, weapon, projectileRadius, bosses) {
    for (let j = 0; j < bosses.length; j++) {
        const id = bosses[j]
        if (!overlaps(bid, id, projectileRadius + bossRadius(id))) continue
        resolveHit({
            x: Position.x[bid], y: Position.y[bid], targetId: id,
            weapon, owner: Bullet.owner[bid], kill: killBoss,
            directionX: Velocity.x[bid], directionY: Velocity.y[bid],
            asteroids: activeAsteroids, bosses, big: true,
        })
        return true
    }
    return false
}

function expireBullet(bid, weapon, bosses) {
    if (weapon.explosive) {
        explodeAt(Position.x[bid], Position.y[bid], weapon, activeAsteroids, bosses)
    }
    releaseBulletEntity(bid)
}

export function combatSystem() {
    if (!encounterActive()) return

    const dt = world.time.delta
    const pid = playerQuery()[0]
    // Reuse the query result throughout this tick; do not re-query per bullet.
    const bosses = bossQuery()
    let i = 0

    while (i < activeBullets.length) {
        // A kill can end the encounter during this loop.
        if (!encounterActive()) return

        const bid = activeBullets[i]
        const weapon = getWeapon(Bullet.type[bid])
        if (!weapon) {
            releaseBulletEntity(bid)
            continue
        }

        Lifetime.remaining[bid] -= dt
        if (Lifetime.remaining[bid] <= 0) {
            expireBullet(bid, weapon, bosses)
            continue
        }

        if (Bullet.owner[bid] === BULLET_OWNER.PLAYER) {
            const radius = weapon.hitRadius ?? 0
            if (hitAsteroid(bid, weapon, radius, bosses) ||
                hitBoss(bid, weapon, radius, bosses)) {
                releaseBulletEntity(bid)
                continue
            }
        } else if (pid !== undefined) {
            if (startState.deflectBufferTime > 0 && reflectBullet(bid, pid)) {
                i++
                continue
            }
            if (Invulnerability.remaining[pid] <= 0 &&
                overlaps(bid, pid, PLAYER_RADIUS + (weapon.hitRadius ?? 0))) {
                damagePlayer(pid, weapon.directDamage ?? 0)
                releaseBulletEntity(bid)
                continue
            }
        }
        i++
    }
}
