// src/ecs/pools/bulletPool.js

import { addEntity, addComponent } from 'bitecs'
import { world } from '../constants/world'
import {     Position,
    Velocity,
    Lifetime,
    Bullet,
    BulletTag} from '../constants/components'

const BULLET_POOL_SIZE = 2000
const bulletPool = []
let initialized = false

export const activeBullets = []

export function initializeBulletPool() {

    if (initialized) return
    initialized = true

    for (let i = 0; i < BULLET_POOL_SIZE; i++) {

        const id = addEntity(world)

        addComponent(world, id, Position)
        addComponent(world, id, Velocity)
        addComponent(world, id, Lifetime)
        addComponent(world, id, Bullet)
        addComponent(world, id, BulletTag)

        Bullet.active[id] = 0

        bulletPool.push(id)
    }
}

export function acquireBulletEntity() {

    for (let i = 0; i < bulletPool.length; i++) {

        const id = bulletPool[i]

        if (!Bullet.active[id]) {

            Bullet.active[id] = 1
            activeBullets.push(id)

            return id
        }
    }

    return -1
}

export function releaseBulletEntity(id) {

    Bullet.active[id] = 0

    const index = activeBullets.indexOf(id)
    if (index !== -1) {
        activeBullets[index] =
            activeBullets[activeBullets.length - 1]
        activeBullets.pop()
    }

    Position.x[id] = 0
    Position.y[id] = 0

    Velocity.x[id] = 0
    Velocity.y[id] = 0

    Lifetime.remaining[id] = 0

    Bullet.type[id] = 0
    Bullet.owner[id] = 0
    Bullet.bounces[id] = 0

    Bullet.colorR[id] = 0
    Bullet.colorG[id] = 0
    Bullet.colorB[id] = 0
}