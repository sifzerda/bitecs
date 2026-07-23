// src/effects/gpu/DebrisEmitter.js

import { createTypedEffectPool } from "../pools/typedEffectPool.js"

const MAX_DEBRIS = 256
const DRAG = 0.985

export const debrisPool = createTypedEffectPool(
        MAX_DEBRIS,
        [
            "sx",
            "sy",
            "sz",

            "axisX",
            "axisY",
            "axisZ",

            "spinSpeed",
            "seedAngle",

            "seed"
        ]
    )


// integer attributes
export const kind = new Uint8Array(MAX_DEBRIS)

const KIND_MAP = {
    rock: 0,
    metal: 1
}

export function emitDebrisBurst({

    x,
    y,

    count = 10,
    speed = 8,
    size = 1,
    kind: type = "rock",
    maxLife = 1.4,
    spread = Math.PI * 2,
    direction = 0

}) {


    const p = debrisPool
    const kindValue = KIND_MAP[type] ?? 0

    for(let i = 0; i < count; i++) {

        const id = p.allocate()


        if(id < 0)
            break

        const angle = direction + (Math.random() - 0.5) * spread



        const velocity =
            speed *
            (0.4 + Math.random() * 0.9)



        p.x[id] =
            x + (Math.random() - 0.5) * 0.2


        p.y[id] =
            y + (Math.random() - 0.5) * 0.2



        p.vx[id] =
            Math.cos(angle) * velocity


        p.vy[id] =
            Math.sin(angle) * velocity



        const s =
            size *
            (0.35 + Math.random() * 0.65)



        p.sx[id] =
            s * (0.7 + Math.random() * 0.6)

        p.sy[id] =
            s * (0.7 + Math.random() * 0.6)

        p.sz[id] =
            s * (0.7 + Math.random() * 0.6)



        p.axisX[id] =
            Math.random() * 2 - 1

        p.axisY[id] =
            Math.random() * 2 - 1

        p.axisZ[id] =
            Math.random() * 2 - 1



        p.spinSpeed[id] =
            (Math.random() - 0.5) * 10


        p.seedAngle[id] =
            Math.random() *
            Math.PI * 2



        kind[id] =
            kindValue



        const life =
            maxLife *
            (0.7 + Math.random() * 0.6)


        p.life[id] =
            life


        p.maxLife[id] =
            life


        p.seed[id] =
            Math.random()

    }

}

export function updateDebrisEmitter(dt) {


    const p = debrisPool


    const drag =
        Math.pow(
            DRAG,
            dt * 60
        )



    for(let i = 0; i < p.capacity; i++) {


        if(!p.alive[i])
            continue



        p.life[i] -= dt



        if(p.life[i] <= 0) {

            p.kill(i)

            continue

        }



        p.vx[i] *= drag
        p.vy[i] *= drag



        p.x[i] +=
            p.vx[i] * dt


        p.y[i] +=
            p.vy[i] * dt

    }

}