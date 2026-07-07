// src/ecs/spawn.js

import { addEntity, addComponent } from "bitecs";
import * as THREE from "three"
import { world } from "./constants/world"
import {
    Position,
    Velocity,
    Rotation,
    Health,
    Lifetime,
    PlayerTag,
    Bullet,
    BulletTag,
    Spark,
    SparkTag,
    AsteroidTag,
    BossTag,
    BossAI,
    HazardZone,
    HazardTag,
    StatusEffect

} from "./constants/components";
import { gameState } from "../state/gameState";
import { getWeapon } from "./constants/weapons";
import { acquireSparkEntity } from "./pools/sparkPool"
import { acquireBulletEntity } from "./pools/bulletPool"
import { acquireAsteroidEntity } from './pools/asteroidPool'

// ============= helpers ============//

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

// ============= Player Ship ============//

export function spawnPlayer(x, y) {

    const id = addEntity(world)

    setPosition(id, x, y)
    addComponent(world, id, Velocity)
    addComponent(world, id, Rotation)
    addComponent(world, id, PlayerTag)
    setHealth(id, 100)

    return id
}

// ============= Bullets ============//

const MUZZLE_OFFSET = 0.9

export function spawnBullet(x, y, rot, weaponId = 0, owner) {

    //const bullet = acquireBullet();

    const weapon = getWeapon(weaponId)
    if (weapon.category === "beam" || weapon.category === "thrower") return []

    // push spawn point forward from ship center to the nose, along facing direction
    const originX = x + Math.sin(-rot) * MUZZLE_OFFSET
    const originY = y + Math.cos(-rot) * MUZZLE_OFFSET

    const count = weapon.projectileCount
    const spread = weapon.spreadAngle

    const ids = []

    for (let i = 0; i < count; i++) {

        const offset = count > 1
            ? -spread / 2 + (spread / (count - 1)) * i
            : 0

        const shotRot = rot + offset
        const id = acquireBulletEntity()

        // Pool exhausted.
        // (Should never happen with a pool of ~2000 unless something has gone wrong.)
        if (id === -1)
            continue

        Position.x[id] = originX
        Position.y[id] = originY

        Velocity.x[id] = Math.sin(-shotRot) * weapon.speed
        Velocity.y[id] = Math.cos(-shotRot) * weapon.speed

        Lifetime.remaining[id] = weapon.lifetime
        Bullet.type[id] = weapon.id
        Bullet.owner[id] = owner
        Bullet.bounces[id] = weapon.maxBounces ?? 0

        const color = new THREE.Color(weapon.glowColor ?? weapon.color)

        color.offsetHSL(
            0,
            0.30,  // saturation boost
            0.00   // slight brightness boost
        )

        Bullet.colorR[id] = color.r
        Bullet.colorG[id] = color.g
        Bullet.colorB[id] = color.b

        ids.push(id)
    }

    return ids
}

// ============= Hazards (clouds, puddles, attached DoT) ============//

export function spawnHazard(x, y, weaponId, owner, targetId = -1) {

    const weapon = getWeapon(weaponId)
    const id = addEntity(world)

    addComponent(world, id, Position)
    addComponent(world, id, HazardZone)
    addComponent(world, id, HazardTag)
    addComponent(world, id, Lifetime)

    Position.x[id] = x
    Position.y[id] = y

    HazardZone.weaponType[id] = weapon.id
    HazardZone.owner[id] = owner
    HazardZone.target[id] = targetId
    HazardZone.tickTimer[id] = 0   // tick immediately on first frame so it doesn't feel delayed

    Lifetime.remaining[id] = weapon.hazardDuration ?? 3.0

    return id
}

// ============= Sparks ============//

function spawnSpark(x, y, speed, size, life) {
    const id = acquireSparkEntity()
    if (id === -1) return -1

    Position.x[id] = x
    Position.y[id] = y

    const angle = Math.random() * Math.PI * 2
    const s = speed * (0.4 + Math.random() * 0.9)

    Velocity.x[id] = Math.cos(angle) * s
    Velocity.y[id] = Math.sin(angle) * s

    Lifetime.remaining[id] = life
    Spark.maxLife[id] = life
    Spark.size[id] = size

    return id
}

export function spawnSparkBurst(x, y, options = {}) {
    const count = options.count ?? 28
    const speed = options.speed ?? 10
    const big = options.big ?? false

    {
        const id = acquireSparkEntity()
        if (id !== -1) {
            Position.x[id] = x
            Position.y[id] = y
            Velocity.x[id] = 0
            Velocity.y[id] = 0
            const life = 0.1
            Lifetime.remaining[id] = life
            Spark.maxLife[id] = life
            Spark.size[id] = big ? 1.8 : 1.0
        }
    }

    for (let i = 0; i < count; i++) {
        const id = acquireSparkEntity()
        if (id === -1) break   // pool exhausted — drop remaining embers

        Position.x[id] = x
        Position.y[id] = y

        const angle = Math.random() * Math.PI * 2
        const s = speed * (0.3 + Math.random() * 1.1)

        Velocity.x[id] = Math.cos(angle) * s
        Velocity.y[id] = Math.sin(angle) * s

        const life = 0.3 + Math.random() * 0.45
        const size = (0.1 + Math.random() * 0.22) * (big ? 2.0 : 1.3)

        Lifetime.remaining[id] = life
        Spark.maxLife[id] = life
        Spark.size[id] = size
    }
}

// ============= Asteroids ============//

export function spawnAsteroid(x, y) {
    const id = acquireAsteroidEntity()
    if (id === -1) return -1

    Position.x[id] = x
    Position.y[id] = y

    Velocity.x[id] = (Math.random() - 0.5) * 2
    Velocity.y[id] = (Math.random() - 0.5) * 2

    Health.current[id] = 20
    Health.max[id] = 20

    StatusEffect.frozen[id] = 0

    return id
}

// ============= Boss ============//

export function spawnBoss(weaponId) {

    const id = addEntity(world)

    addComponent(world, id, Position)
    addComponent(world, id, Velocity)
    addComponent(world, id, Health)
    addComponent(world, id, BossTag)
    addComponent(world, id, BossAI)
    addComponent(world, id, StatusEffect)

    Position.x[id] = 0
    Position.y[id] = 0

    Velocity.x[id] = 0
    Velocity.y[id] = 0

    Health.current[id] = 300
    Health.max[id] = 300

    StatusEffect.frozen[id] = 0

    BossAI.moveTimer[id] = 0     // pick a direction immediately
    BossAI.shootTimer[id] = 1    // small delay before first shot
    BossAI.weapon[id] = weaponId
    BossAI.beamCycleTimer[id] = 3.0   // starts in the "on" phase
    BossAI.beamActive[id] = 1

    gameState.bossAlive = true

    return id
}

