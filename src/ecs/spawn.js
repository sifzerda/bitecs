// src/ecs/spawn.js

import { addEntity, addComponent } from "bitecs"
import * as THREE from "three"
import { world } from "./constants/world.js"
import {
    Position,
    Velocity,
    Rotation,
    Health,
    Invulnerability,
    Lifetime,
    Asteroid,
    PlayerTag,
    Bullet,
    BULLET_OWNER,
    BossTag,
    BossAI,
    BossType,
    StatusEffect
} from "./constants/components.js"
import { BOSS_INDEX_BY_KEY, BOSSES } from "./constants/bosses.js"
import { acquireBulletEntity } from "./pools/bulletPool.js"
import { acquireAsteroidEntity } from "./pools/asteroidPool.js"
import { getGunTypeById } from "./weapons/config/gunConfigs.js"
import { getWeapon } from "./weapons/config/weapons.js"
import { getBossEmissionConfig, PLAYER_CONFIG } from "./constants/emission.js"

import { resetOctopusBoss } from "./systems/octopusBossSystem.js"


// Cache projectile colours helper

const projectileColors = new Map()

function getProjectileColor(weapon) {
    let color = projectileColors.get(weapon.id)

    if (!color) {
        color = new THREE.Color(
            weapon.glowColor ?? weapon.color
        )

        color.offsetHSL(0, 0.3, 0)

        projectileColors.set(weapon.id, color)
    }

    return color
}

// ============================================================
// HELPERS
// ============================================================

function setPosition(id, x, y) {

    addComponent(world, id, Position)
    Position.x[id] = x
    Position.y[id] = y
}

function setHealth(id, hp) {

    addComponent(world, id, Health)
    Health.current[id] = hp
    Health.max[id] = hp
}

// ============================================================
// PLAYER SHIP
// ============================================================

export function spawnPlayer(x, y) {

    const id = addEntity(world)

    setPosition(id, x, y)
    addComponent(world, id, Velocity)
    addComponent(world, id, Rotation)
    addComponent(world, id, PlayerTag)
    addComponent(world, id, Invulnerability)
    setHealth(id, 100)

    Velocity.x[id] = 0
    Velocity.y[id] = 0
    Rotation[id] = 0

    Invulnerability.remaining[id] = 0

    return id
}

// ============================================================
// BULLETS
// ============================================================

export function spawnBullet(
    x,
    y,
    rot,
    weaponId = 0,
    owner = BULLET_OWNER.ENEMY,
    gapOffset = 0,
    sourceId = -1,
    emissionOverride = null
) {

    const weapon = getWeapon(weaponId)

    if (!weapon) {

        return {
            ids: [],
            originX: x,
            originY: y,
        }
    }

    // --------------------------------------------------------
    // Beam / thrower weapons have their own systems.
    // --------------------------------------------------------

    if (weapon.category === "beam" || weapon.category === "thrower") {

        return {
            ids: [],
            originX: x,
            originY: y,
        }
    }

    // --------------------------------------------------------
    // Emission configuration
    // --------------------------------------------------------

    const emission = emissionOverride ?? PLAYER_CONFIG.emission.projectile

    // --------------------------------------------------------
    // Forward direction
    //
    // rot = 0
    //     -> +Y
    //
    // rot = -PI/2
    //     -> +X
    //
    // rot = +PI/2
    //     -> -X
    // --------------------------------------------------------

    const fwdX = Math.sin(-rot)
    const fwdY = Math.cos(-rot)

    // --------------------------------------------------------
    // Perpendicular direction
    // --------------------------------------------------------

    const perpX = Math.cos(-rot)
    const perpY = -Math.sin(-rot)
    const forwardOffset = emission.offsetY ?? 0
    const sideOffset = (emission.offsetX ?? 0) + gapOffset

    // --------------------------------------------------------
    // Final muzzle position
    // --------------------------------------------------------

    const originX = x + fwdX * forwardOffset + perpX * sideOffset
    const originY = y + fwdY * forwardOffset + perpY * sideOffset

    // --------------------------------------------------------
    // Projectile configuration
    // --------------------------------------------------------

    const count = weapon.projectileCount ?? 1
    const spread = weapon.spreadAngle ?? 0

    const ids = []

    // --------------------------------------------------------
    // Create projectiles
    // --------------------------------------------------------

    for (let i = 0; i < count; i++) {

        const offset = count > 1 ? (-spread / 2 + (spread / (count - 1)) * i) : 0
        const shotRot = rot + offset
        const id = acquireBulletEntity()

        if (id === -1) {
            continue
        }

        // ----------------------------------------------------
        // Position
        // ----------------------------------------------------

        Position.x[id] = originX
        Position.y[id] = originY

        // ----------------------------------------------------
        // Velocity
        // ----------------------------------------------------

        Velocity.x[id] = Math.sin(-shotRot) * weapon.speed
        Velocity.y[id] = Math.cos(-shotRot) * weapon.speed

        // ----------------------------------------------------
        // Bullet metadata
        // ----------------------------------------------------

        Lifetime.remaining[id] = weapon.lifetime
        Bullet.type[id] = weapon.id
        Bullet.owner[id] = owner
        Bullet.source[id] = sourceId
        Bullet.deflected[id] = 0

        // ----------------------------------------------------
        // Cached render color
        // ----------------------------------------------------

        const color = getProjectileColor(weapon)
        Bullet.colorR[id] = color.r
        Bullet.colorG[id] = color.g
        Bullet.colorB[id] = color.b
        ids.push(id)
    }

    return {
        ids,
        originX,
        originY,
    }
}

// ============================================================
// PLAYER TWIN-GUN FIRING
// ============================================================

export function spawnPlayerBullet(x, y, rot, weaponId = 0, owner = BULLET_OWNER.PLAYER, sourceId = -1) {

    const emission = PLAYER_CONFIG.emission.projectile
    const gap = emission.gunGap
    const left = spawnBullet(x, y, rot, weaponId, owner, gap, sourceId, emission)
    const right = spawnBullet(x, y, rot, weaponId, owner, -gap, sourceId, emission)

    return {

        ids: [
            ...left.ids,
            ...right.ids,
        ],

        origins: [
            { x: left.originX, y: left.originY },
            { x: right.originX, y: right.originY },
        ],
    }
}

// ============================================================
// BOSS TWIN-GUN FIRING
// ============================================================

export function spawnBossBullet(x, y, rot, weaponId = 0, bossId) {

    const emission = getBossEmissionConfig(bossId, "projectile")
    const gap = emission.gunGap
    const left = spawnBullet(x, y, rot, weaponId, BULLET_OWNER.ENEMY, gap, bossId, emission)
    const right = spawnBullet(x, y, rot, weaponId, BULLET_OWNER.ENEMY, -gap, bossId, emission)

    return {

        ids: [
            ...left.ids,
            ...right.ids,
        ],

        origins: [
            { x: left.originX, y: left.originY },
            { x: right.originX, y: right.originY },
        ],
    }
}

// ============================================================
// ASTEROIDS
// ============================================================


const ASTEROID_CONFIG = Object.freeze({
    minScale: 0.8,
    maxScale: 1.5,
    baseRadius: 0.55,

    baseHealth: 20,
    minSpeed: 0.8,
    maxSpeed: 2.2,

    fastChance: 0.15,
    fastMultiplier: 1.65,
})

export function spawnAsteroid(x, y, options = {}) {
    const id = acquireAsteroidEntity()

    if (id === -1) return -1

    const cfg = ASTEROID_CONFIG

    const scale = Math.max(
        0.3,
        options.scale ??
        cfg.minScale +
        Math.random() *
        (cfg.maxScale - cfg.minScale)
    )

    const angle =
        options.angle ?? Math.random() * Math.PI * 2

    const isFast =
        options.fast ??
        Math.random() < cfg.fastChance

    const baseSpeed =
        cfg.minSpeed +
        Math.random() * (cfg.maxSpeed - cfg.minSpeed)

    const speed =
        options.speed ??
        baseSpeed * (isFast ? cfg.fastMultiplier : 1)

    const health =
        options.health ??
        Math.max(
            5,
            Math.round(
                cfg.baseHealth * Math.pow(scale, 1.5)
            )
        )

    Position.x[id] = x
    Position.y[id] = y

    Velocity.x[id] =
        options.vx ?? Math.cos(angle) * speed

    Velocity.y[id] =
        options.vy ?? Math.sin(angle) * speed

    Health.current[id] = health
    Health.max[id] = health

    StatusEffect.frozen[id] = 0
    StatusEffect.corrosionDamage[id] = 0
    StatusEffect.corrosionRemaining[id] = 0

    Asteroid.scale[id] = scale
    Asteroid.radius[id] = cfg.baseRadius * scale

    return id
}


// ============================================================
// BOSS
// ============================================================

export function spawnBoss(bossKey = "shotgun") {

    const id = addEntity(world)

    // --------------------------------------------------------
    // Components
    // --------------------------------------------------------

    addComponent(world, id, Position)
    addComponent(world, id, Velocity)
    addComponent(world, id, Rotation)
    addComponent(world, id, Health)
    addComponent(world, id, BossTag)
    addComponent(world, id, BossAI)
    addComponent(world, id, BossType)
    addComponent(world, id, StatusEffect)

    // --------------------------------------------------------
    // Initial transform
    // --------------------------------------------------------

    Position.x[id] = 0
    Position.y[id] = 0
    Velocity.x[id] = 0
    Velocity.y[id] = 0
    Rotation[id] = 0

    // --------------------------------------------------------
    // Boss health
    // --------------------------------------------------------

    const bossIndex = BOSS_INDEX_BY_KEY[bossKey] ?? 0
    const bossCfg = BOSSES[bossIndex]
    const bossHealth = bossCfg?.health ?? 300
    Health.current[id] = bossHealth
    Health.max[id] = bossHealth
    StatusEffect.frozen[id] = 0

    // --------------------------------------------------------
    // Boss weapon
    // --------------------------------------------------------

    const gunType = bossCfg?.gun ? getGunTypeById(bossCfg.gun.typeId) : null
    BossAI.weapon[id] = gunType?.weaponId ?? 0

    // ========================================================
    // BASIC AI TIMERS
    // ========================================================

    BossAI.moveTimer[id] = 0
    BossAI.shootTimer[id] = 0.5 + Math.random() * 0.5
    BossAI.beamCycleTimer[id] = 3.0
    BossAI.beamActive[id] = 1
    BossAI.targetRotation[id] = 0

    // ========================================================
    // AIMING STATE
    // ========================================================

    BossAI.aimError[id] = 0
    BossAI.aimErrorTimer[id] = 0.2 + Math.random() * 0.6

    // ========================================================
    // BURST STATE
    // ========================================================

    BossAI.burstRemaining[id] = 0
    BossAI.burstGapTimer[id] = 0

    // ========================================================
    // TACTICAL AI
    //
    // 0 = attack
    // 1 = evade
    // 2 = strafe
    // 3 = reposition
    // ========================================================

    BossAI.state[id] = 0
    BossAI.stateTimer[id] = 1.5 + Math.random() * 1.3
    BossAI.moveRotation[id] = 0
    BossAI.strafeDirection[id] = Math.random() < 0.5 ? -1 : 1

    // --------------------------------------------------------
    // Combat personality
    // --------------------------------------------------------

    BossAI.aggression[id] = 0.35 + Math.random() * 0.55
    BossAI.attackTimer[id] = 0
    BossAI.decisionCooldown[id] = 0

    // --------------------------------------------------------
    // Boss type
    // --------------------------------------------------------

    BossType.typeIndex[id] = bossIndex

    if (bossCfg?.key === "octopus") resetOctopusBoss(id)

    return id
}
