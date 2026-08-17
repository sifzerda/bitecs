// src/ecs/spawn.js

import { addEntity, addComponent } from "bitecs"
import * as THREE from "three"
import { world } from "./constants/world"
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
    BulletTag,
    BULLET_OWNER,
    AsteroidTag,
    BossTag,
    BossAI,
    BossType,
    StatusEffect,
    Octopus,
    OctopusTag,
} from "./constants/components"
import { BOSS_INDEX_BY_KEY, BOSSES } from "./constants/bosses"
import { simState } from "../state/simState.js"
import { acquireBulletEntity } from "./pools/bulletPool"
import { acquireAsteroidEntity } from "./pools/asteroidPool"
import { getGunTypeById } from "./weapons/config/gunConfigs"
import { getWeapon } from "./weapons/config/weapons"
import { getBossEmissionConfig, PLAYER_CONFIG } from "./constants/emission.js"

// ============================================================
// Helpers
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

const GUN_GAP = 0.45

// ============================================================
// Player Ship
// ============================================================

export function spawnPlayer(x, y) {

    const id = addEntity(world)

    setPosition(id, x, y)

    addComponent(world, id, Velocity)
    addComponent(world, id, Rotation)
    addComponent(world, id, PlayerTag)
    addComponent(world, id, Invulnerability)

    setHealth(id, 100)

    Invulnerability.remaining[id] = 0

    return id
}

// ============================================================
// Bullets
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

    if (!weapon)
        return {
            ids: [],
            originX: x,
            originY: y,
        }

    // Beam and thrower weapons have their own systems.
    if (
        weapon.category === "beam" || weapon.category === "thrower"
    ) {

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
    // Rotation convention used by the game:
    //
    // rot = 0      -> +Y
    // rot = -PI/2  -> +X
    // rot = +PI/2  -> -X
    // --------------------------------------------------------

    const fwdX = Math.sin(-rot)
    const fwdY = Math.cos(-rot)

    // --------------------------------------------------------
    // Perpendicular direction
    //
    // Used for left/right twin gun spacing.
    // --------------------------------------------------------

    const perpX = Math.cos(-rot)
    const perpY = -Math.sin(-rot)

    const forwardOffset = emission.offsetY ?? 0
    const sideOffset = (emission.offsetX ?? 0) + gapOffset

    // --------------------------------------------------------
    // Final muzzle position
    //
    // IMPORTANT:
    // Both the forward offset AND gun gap rotate with the ship.
    // --------------------------------------------------------

    const originX = x + fwdX * forwardOffset + perpX * sideOffset
    const originY = y + fwdY * forwardOffset + perpY * sideOffset

    // --------------------------------------------------------
    // Weapon projectile configuration
    // --------------------------------------------------------

    const count = weapon.projectileCount ?? 1
    const spread = weapon.spreadAngle ?? 0

    const ids = []

    for (let i = 0; i < count; i++) {

        const offset = count > 1 ? -spread / 2 + (spread / (count - 1)) * i : 0
        const shotRot = rot + offset

        const id = acquireBulletEntity()

        if (id === -1)
            continue

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

        // ----------------------------------------------------
        // Cached render color
        // ----------------------------------------------------

        const color = new THREE.Color(weapon.glowColor ?? weapon.color)
        color.offsetHSL(0, 0.30, 0.00)
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
// Player twin-gun firing
// ============================================================

export function spawnPlayerBullet(
    x,
    y,
    rot,
    weaponId = 0,
    owner = BULLET_OWNER.PLAYER,
    sourceId = -1
) {
    const emission = PLAYER_CONFIG.emission.projectile
    const gap = emission.gunGap

    const left =
        spawnBullet(
            x,
            y,
            rot,
            weaponId,
            owner,
            gap,
            sourceId,
            emission
        )

    const right =
        spawnBullet(
            x,
            y,
            rot,
            weaponId,
            owner,
            -gap,
            sourceId,
            emission
        )

    return {
        ids: [
            ...left.ids,
            ...right.ids,
        ],

        origins: [
            {
                x: left.originX,
                y: left.originY,
            },

            {
                x: right.originX,
                y: right.originY,
            },
        ],
    }
}

// ============================================================
// Boss twin-gun firing
// ============================================================

export function spawnBossBullet(
    x,
    y,
    rot,
    weaponId = 0,
    bossId
) {

    const emission =
        getBossEmissionConfig(
            bossId,
            "projectile"
        )

    const gap = emission.gunGap

    const left =
        spawnBullet(
            x,
            y,
            rot,
            weaponId,
            BULLET_OWNER.ENEMY,
            gap,
            bossId,
            emission
        )

    const right =
        spawnBullet(
            x,
            y,
            rot,
            weaponId,
            BULLET_OWNER.ENEMY,
            -gap,
            bossId,
            emission
        )


    return {

        ids: [
            ...left.ids,
            ...right.ids,
        ],

        origins: [
            {
                x: left.originX,
                y: left.originY,
            },

            {
                x: right.originX,
                y: right.originY,
            },
        ],
    }
}

// ============================================================
// Asteroids
// ============================================================

export function spawnAsteroid(x, y) {

    const id = acquireAsteroidEntity()

    if (id === -1)
        return -1

    Position.x[id] = x
    Position.y[id] = y

    Velocity.x[id] =
        (Math.random() - 0.5) * 2

    Velocity.y[id] =
        (Math.random() - 0.5) * 2

    Health.current[id] = 20
    Health.max[id] = 20

    StatusEffect.frozen[id] = 0

    // ----------------------------------------
    // Asteroid size / collision radius
    // ----------------------------------------

    const scale = 0.8 + Math.random() * 0.7
    Asteroid.scale[id] = scale
    Asteroid.radius[id] = 0.55 * scale

    return id
}

// ============================================================
// Boss
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

    addComponent(
        world,
        id,
        BossTag
    )

    addComponent(
        world,
        id,
        BossAI
    )

    addComponent(
        world,
        id,
        BossType
    )

    addComponent(
        world,
        id,
        StatusEffect
    )

    // --------------------------------------------------------
    // Initial transform
    // --------------------------------------------------------

    Position.x[id] = 0
    Position.y[id] = 0

    Velocity.x[id] = 0
    Velocity.y[id] = 0

    Rotation[id] = 0

    // --------------------------------------------------------
    // Health
    // --------------------------------------------------------

    Health.current[id] = 300
    Health.max[id] = 300

    StatusEffect.frozen[id] = 0

    // --------------------------------------------------------
    // Boss configuration
    // --------------------------------------------------------

    const bossIndex = BOSS_INDEX_BY_KEY[bossKey] ?? 0
    const bossCfg = BOSSES[bossIndex]
    const gunType = bossCfg?.gun ? getGunTypeById(bossCfg.gun.typeId) : null
    BossAI.weapon[id] = gunType?.weaponId ?? 0

    // ========================================================
    // Basic AI timers
    // ========================================================

    BossAI.moveTimer[id] = 0
    // Give the boss a short startup delay before firing.
    BossAI.shootTimer[id] = 0.7 + Math.random() * 0.6
    BossAI.beamCycleTimer[id] = 3.0
    BossAI.beamActive[id] = 1
    BossAI.targetRotation[id] = 0

    // ========================================================
    // Burst state
    // ========================================================

    BossAI.burstRemaining[id] = 0
    BossAI.burstGapTimer[id] = 0

    // ========================================================
    // Tactical AI
    //
    // 0 = attack
    // 1 = evade
    // 2 = strafe
    // 3 = reposition
    // ========================================================

    BossAI.state[id] = 0
    BossAI.stateTimer[id] = 0.5 + Math.random() * 0.8
    BossAI.moveRotation[id] = 0
    BossAI.strafeDirection[id] = Math.random() < 0.5 ? -1 : 1

    // Each boss gets a slightly different
    // combat personality.
    BossAI.aggression[id] = 0.35 + Math.random() * 0.55
    BossAI.attackTimer[id] = 0
    BossAI.decisionCooldown[id] = 0

    // --------------------------------------------------------
    // Boss type
    // --------------------------------------------------------

    BossType.typeIndex[id] = bossIndex
    simState.bossAlive = true

    return id
}

// ============================================================
// Octopus
// ============================================================

export function spawnOctopus(x = 0, y = 0) {

    const id = addEntity(world)

    addComponent(
        world,
        id,
        Position
    )

    addComponent(
        world,
        id,
        Velocity
    )

    addComponent(
        world,
        id,
        Octopus
    )

    addComponent(
        world,
        id,
        OctopusTag
    )

    Position.x[id] = x
    Position.y[id] = y

    Velocity.x[id] = 0
    Velocity.y[id] = 0

    return id
}