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
    BossType,
    HazardZone,
    HazardTag,
    StatusEffect,
 
     Octopus,
    OctopusTag,
} from "./constants/components";
import { BOSS_INDEX_BY_KEY, BOSSES } from "./constants/bosses";
import { getGunTypeById } from "./constants/gunConfigs";
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
const GUN_GAP = 0.35 // distance between twin guns
export function spawnBullet(x, y, rot, weaponId = 0, owner, gapOffset = 0) {
 
    //const bullet = acquireBullet();
 
    const weapon = getWeapon(weaponId)
    if (weapon.category === "beam" || weapon.category === "thrower") return []
 
    // forward direction (ship facing)
    const fwdX = Math.sin(-rot)
    const fwdY = Math.cos(-rot)
 
    // perpendicular direction (for left/right gun offset)
    const perpX = Math.cos(-rot)
    const perpY = -Math.sin(-rot)
 
    // push spawn point forward from ship center to the nose, then out to the gun
    const originX = x + fwdX * MUZZLE_OFFSET + perpX * gapOffset
    const originY = y + fwdY * MUZZLE_OFFSET + perpY * gapOffset
 
    const count = weapon.projectileCount
    const spread = weapon.spreadAngle
 
    const ids = []
 
    for (let i = 0; i < count; i++) {
 
        const offset = count > 1
            ? -spread / 2 + (spread / (count - 1)) * i
            : 0
 
        const shotRot = rot + offset
        const id = acquireBulletEntity()
 
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
        color.offsetHSL(0, 0.30, 0.00)
 
        Bullet.colorR[id] = color.r
        Bullet.colorG[id] = color.g
        Bullet.colorB[id] = color.b
 
        ids.push(id)
    }
 
    return ids
}
 
// convenience wrapper: fires both guns for weapons that should be twin-mounted
export function spawnPlayerBullet(x, y, rot, weaponId = 0, owner) {
    return [
        ...spawnBullet(x, y, rot, weaponId, owner, GUN_GAP),
        ...spawnBullet(x, y, rot, weaponId, owner, -GUN_GAP),
    ]
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
// `bossKey` selects which entry of BOSSES (bosses.js) this boss looks
// like — e.g. "shotgun", "machinegun", "boss5". The weapon it fires is
// no longer a separate parameter: it's derived from that boss's own
// mounted gun (bossCfg.gun.typeId), so visual appearance and functional
// weapon can never drift apart. Defaults to "shotgun" so existing call
// sites that don't pass a key keep working.
export function spawnBoss(bossKey = "shotgun") {
 
    const id = addEntity(world)
 
    addComponent(world, id, Position)
    addComponent(world, id, Velocity)
    addComponent(world, id, Rotation)
    addComponent(world, id, Health)
    addComponent(world, id, BossTag)
    addComponent(world, id, BossAI)
    addComponent(world, id, BossType)
    addComponent(world, id, StatusEffect)
 
    Position.x[id] = 0
    Position.y[id] = 0
 
    Velocity.x[id] = 0
    Velocity.y[id] = 0
    Rotation[id] = 0
 
    Health.current[id] = 300
    Health.max[id] = 300
 
    StatusEffect.frozen[id] = 0
 
    BossAI.moveTimer[id] = 0
    BossAI.shootTimer[id] = 1
 
    const bossIndex = BOSS_INDEX_BY_KEY[bossKey] ?? 0
    const bossCfg = BOSSES[bossIndex]
 
    // Weapon fired = weapon belonging to whatever gun this boss visually
    // carries. Falls back to weapon 0 if the boss has no gun mounted.
    const gunType = bossCfg.gun?.enabled ? getGunTypeById(bossCfg.gun.typeId) : null
    BossAI.weapon[id] = gunType ? gunType.weaponId : 0
 
    BossAI.beamCycleTimer[id] = 3.0
    BossAI.beamActive[id] = 1
    BossAI.targetRotation[id] = 0
 
    BossType.typeIndex[id] = bossIndex
 
    gameState.bossAlive = true
 
    return id
}
 
// ============= Octopus ============//
export function spawnOctopus(x = 0, y = 0) {
 
    const id = addEntity(world)
 
    addComponent(world, id, Position)
    addComponent(world, id, Velocity)
    addComponent(world, id, Octopus)
    addComponent(world, id, OctopusTag)
 
    Position.x[id] = x
    Position.y[id] = y
 
    Velocity.x[id] = 0
    Velocity.y[id] = 0
 
    return id
}