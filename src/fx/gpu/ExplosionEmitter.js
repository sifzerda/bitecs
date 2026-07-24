// src/fx/gpu/ExplosionEmitter.js

import * as THREE from "three"
import { createTypedEffectPool } from "../effectPool.js"

const MAX_EXPLOSIONS = 512

export const explosionPool = createTypedEffectPool(MAX_EXPLOSIONS, ["size", "seed", "age", "rotAngle"], ["axis"])

const _axis = new THREE.Vector3()

export function emitExplosion({ x, y, size = 1, maxLife = 1.2 }) {

    const id = explosionPool.allocate()

    if (id < 0)
        return

    explosionPool.x[id] = x
    explosionPool.y[id] = y
    explosionPool.size[id] = size

    const seed = Math.random()
    explosionPool.seed[id] = seed

    explosionPool.life[id] = maxLife
    explosionPool.maxLife[id] = maxLife

    // rotation axis is static per explosion — derived once from seed, matches
    // the original renderer's seedAngle-based axis exactly
    const seedAngle = seed * Math.PI * 2
    _axis.set(Math.sin(seedAngle), Math.cos(seedAngle), 0.4).normalize()

    const ax = id * 3
    explosionPool.axis[ax] = _axis.x
    explosionPool.axis[ax + 1] = _axis.y
    explosionPool.axis[ax + 2] = _axis.z

    explosionPool.age[id] = 0
    explosionPool.rotAngle[id] = seedAngle

    const pos = id * 3
    explosionPool.instancePosition[pos] = x
    explosionPool.instancePosition[pos + 1] = y
    explosionPool.instancePosition[pos + 2] = 0.2

    explosionPool.instanceScale[id] = size * 0.25 // t=0 burst scale floor

}

export function updateExplosionEmitter(dt) {

    const p = explosionPool

    for (let i = 0; i < p.capacity; i++) {

        if (!p.alive[i])
            continue

        p.life[i] -= dt

        if (p.life[i] <= 0) {
            p.kill(i)
            continue
        }

        const t = 1 - p.life[i] / p.maxLife[i]

        const burstT = Math.min(t / 0.25, 1)
        const burstEase = 1 - Math.pow(1 - burstT, 3)
        const burstScale = 0.25 + burstEase * (1.3 - 0.25)
        const lingerScale = 1 + t * 0.45

        p.instanceScale[i] = p.size[i] * burstScale * lingerScale

        const seedAngle = p.seed[i] * Math.PI * 2
        p.rotAngle[i] = t * 1.5 + seedAngle

        p.age[i] = t

        p.dirty = true

    }

}