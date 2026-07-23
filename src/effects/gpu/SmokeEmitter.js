// src/effects/gpu/SmokeEmitter.js

import { createTypedEffectPool } from "../pools/typedEffectPool.js"


const MAX_SMOKE = 2048

export const smokePool = createTypedEffectPool(MAX_SMOKE)
export const smokeSize = new Float32Array(MAX_SMOKE)
export const smokeSeed = new Float32Array(MAX_SMOKE)

export function emitSmoke({
    x,
    y,
    vx = 0,
    vy = 0,

    direction = 0,
    spread = 0.5,

    count = 10,

    speedMin = 2,
    speedMax = 7,

    sizeMin = .15,
    sizeMax = .45,

    lifeMin = 1.5,
    lifeMax = 3.5
}) {


    for (let i = 0; i < count; i++) {

        const id = smokePool.allocate()


        if (id < 0)
            break

        const angle = direction + (Math.random() - 0.5) * spread
        const speed = speedMin + Math.random() * (speedMax - speedMin)

        smokePool.x[id] = x
        smokePool.y[id] = y


        smokePool.vx[id] = vx + Math.cos(angle) * speed
        smokePool.vy[id] = vy + Math.sin(angle) * speed
        smokeSize[id] = sizeMin +
            Math.random() *
            (sizeMax - sizeMin)

        const life =
            lifeMin +
            Math.random() *
            (lifeMax - lifeMin)

        smokePool.life[id] = life
        smokePool.maxLife[id] = life


        smokeSeed[id] = Math.random()

    }

}



export function updateSmokeEmitter(dt) {

    const p = smokePool


    for (let i = 0; i < p.capacity; i++) {


        if (!p.alive[i])
            continue



        p.life[i] -= dt


        if (p.life[i] <= 0) {

            p.kill(i)
            continue

        }



        p.x[i] += p.vx[i] * dt
        p.y[i] += p.vy[i] * dt



        p.vx[i] *= .985
        p.vy[i] *= .985



        p.vy[i] += 0.4 * dt



        smokeSize[i] += 0.8 * dt

    }

}



export function clearSmoke() {

    smokePool.alive.fill(0)

}