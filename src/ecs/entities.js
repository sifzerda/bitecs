// src/ecs/entities.js

import { addEntity, addComponent } from 'bitecs'
import { world } from './world.js'
import {
    Position, Velocity, Rotation, Health, Lifetime,
    PlayerTag, EnemyTag, BulletTag,
} from './components.js'

export function spawnPlayer(x = 0, y = 0) {
    const eid = addEntity(world)
    addComponent(world, eid, Position)
    addComponent(world, eid, Velocity)
    addComponent(world, eid, Rotation)
    addComponent(world, eid, Health)
    addComponent(world, eid, PlayerTag)

    Position.x[eid] = x
    Position.y[eid] = y
    Health.current[eid] = 100
    Health.max[eid] = 100

    return eid
}

export function spawnEnemy(x, y) {
    const eid = addEntity(world)
    addComponent(world, eid, Position)
    addComponent(world, eid, Velocity)
    addComponent(world, eid, Rotation)
    addComponent(world, eid, Health)
    addComponent(world, eid, EnemyTag)

    Position.x[eid] = x
    Position.y[eid] = y
    Velocity.x[eid] = (Math.random() - 0.5) * 4
    Velocity.y[eid] = (Math.random() - 0.5) * 4
    Health.current[eid] = 30
    Health.max[eid] = 30

    return eid
}

export function spawnBullet(x, y, rotation) {
    const eid = addEntity(world)
    addComponent(world, eid, Position)
    addComponent(world, eid, Velocity)
    addComponent(world, eid, Lifetime)
    addComponent(world, eid, BulletTag)

    const speed = 15
    Position.x[eid] = x
    Position.y[eid] = y
    Velocity.x[eid] = Math.sin(-rotation) * speed
    Velocity.y[eid] = Math.cos(-rotation) * speed
    Lifetime.remaining[eid] = 1.5

    return eid
}