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
    PlayerTag,
    Bullet,
    BULLET_OWNER,
} from "./constants/components.js"
 
import { acquireBulletEntity } from "./pools/bulletPool.js"
 
import { getWeapon } from "./weapons/config/weapons.js"
import { getBossEmissionConfig, PLAYER_CONFIG } from "./constants/emission.js"
 
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