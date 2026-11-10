// src/fx/gpu/DebrisEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

const MAX_DEBRIS = 256
const TAU = Math.PI * 2

// Debris uses unit-radius icosahedrons.
// These limits are world-space scale values.
const MAX_ROCK_SCALE = 0.32
const MAX_METAL_SCALE = 0.55
const MIN_SCALE = 0.005

export const debrisPool = createTypedEffectPool(
    MAX_DEBRIS,
    [
        "spinSpeed",
        "seedAngle",
        "seed",
        "age",
        "mass",
        "heat",
        "glint",
        "align",
    ],
    ["scale", "axis", "baseScale"]
)

export const kind = new Uint8Array(MAX_DEBRIS)

const KIND_MAP = {
    rock: 0,
    metal: 1,
}

const LOOKS = [
    // ROCK: slow zero-G drift
    {
        drag: 0.9975,
        massDrag: 0.3,
        spin: 3.2,
        spinSizeBias: 0.4,
        lifeMul: 2.4,
        shrinkFrom: 0.78,
        curl: 0.5,
        heat: 1,
        heatCurve: 4,
        glintRate: 0,
        tiers: [
            {
                w: 0.25,
                size: [0.7, 1.1],
                speed: [0.12, 0.3],
                stretch: 1,
                life: 1.1,
            },
            {
                w: 0.45,
                size: [0.35, 0.65],
                speed: [0.2, 0.5],
                stretch: 1.15,
                life: 1,
            },
            {
                w: 0.3,
                size: [0.12, 0.25],
                speed: [0.3, 0.7],
                stretch: 1.3,
                life: 0.85,
            },
        ],
    },

    // METAL: fast ricocheting shards
    {
        drag: 0.99,
        massDrag: 0.4,
        spin: 2,
        spinSizeBias: 0,
        lifeMul: 0.9,
        shrinkFrom: 0.7,
        curl: 0,
        heat: 0,
        heatCurve: 1,
        glintRate: 14,
        tiers: [
            {
                w: 0.3,
                size: [0.3, 0.55],
                speed: [1, 1.8],
                stretch: 3.2,
                life: 1,
                align: 1,
            },
            {
                w: 0.5,
                size: [0.12, 0.24],
                speed: [1.4, 2.6],
                stretch: 2.6,
                life: 0.8,
                align: 1,
            },
            {
                w: 0.2,
                size: [0.06, 0.12],
                speed: [1.8, 3],
                stretch: 1.4,
                life: 0.45,
                align: 0.5,
            },
        ],
    },
]

function rand(min, max) {
    return min + Math.random() * (max - min)
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

function safeNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback
}

function pickTier(tiers) {
    let total = 0

    for (let i = 0; i < tiers.length; i++) {
        total += tiers[i].w
    }

    let r = Math.random() * total

    for (let i = 0; i < tiers.length; i++) {
        r -= tiers[i].w

        if (r <= 0) return tiers[i]
    }

    return tiers[tiers.length - 1]
}

function setInitialScale(pool, index, x, y, z, maxScale) {
    const j = index * 3

    // Scale proportionally instead of clamping each axis
    // independently, preserving shard proportions.
    const largest = Math.max(x, y, z)

    const factor = largest > maxScale
        ? maxScale / largest
        : 1

    pool.baseScale[j] = Math.max(MIN_SCALE, x * factor)
    pool.baseScale[j + 1] = Math.max(MIN_SCALE, y * factor)
    pool.baseScale[j + 2] = Math.max(MIN_SCALE, z * factor)

    pool.scale[j] = pool.baseScale[j]
    pool.scale[j + 1] = pool.baseScale[j + 1]
    pool.scale[j + 2] = pool.baseScale[j + 2]
}

export function emitDebrisBurst({
    x,
    y,
    count = 10,
    speed = 8,
    size = 1,
    kind: type = "rock",
    maxLife = 1.4,
    spread = TAU,
    direction = 0,
}) {
    const p = debrisPool

    const kindValue = KIND_MAP[type] ?? 0
    const look = LOOKS[kindValue]

    const burstSize = Math.max(0, safeNumber(size, 1))
    const burstSpeed = Math.max(0, safeNumber(speed, 8))
    const burstLife = Math.max(0.001, safeNumber(maxLife, 1.4))
    const burstCount = Math.max(
        0,
        Math.floor(safeNumber(count))
    )

    const maxScale = kindValue === 0
        ? MAX_ROCK_SCALE
        : MAX_METAL_SCALE

    for (let n = 0; n < burstCount; n++) {
        const id = p.allocate()

        if (id < 0) break

        const tier = pickTier(look.tiers)
        const j = id * 3

        const angle =
            direction +
            (Math.random() - 0.5) * spread

        const velocity = burstSpeed * rand(
            tier.speed[0],
            tier.speed[1]
        )

        p.x[id] = x + rand(-0.1, 0.1)
        p.y[id] = y + rand(-0.1, 0.1)

        const vx = Math.cos(angle) * velocity
        const vy = Math.sin(angle) * velocity

        p.vx[id] = vx
        p.vy[id] = vy

        const relativeSize = rand(
            tier.size[0],
            tier.size[1]
        )

        const sizeValue = burstSize * relativeSize

        const mass = clamp(
            (relativeSize - 0.1) / 1.1,
            0,
            1
        )

        const sx =
            sizeValue *
            tier.stretch *
            rand(0.7, 1.3)

        const sy = sizeValue * rand(0.7, 1.3)
        const sz = sizeValue * rand(0.7, 1.3)

        setInitialScale(
            p,
            id,
            sx,
            sy,
            sz,
            maxScale
        )

        const aligned =
            Math.random() < (tier.align ?? 0)

        if (aligned) {
            p.axis[j] = 0
            p.axis[j + 1] = 0
            p.axis[j + 2] = 1

            p.seedAngle[id] = Math.atan2(vy, vx)
            p.spinSpeed[id] = 0
        } else {
            const ax = rand(-1, 1)
            const ay = rand(-1, 1)
            const az = rand(-1, 1)

            const length =
                Math.hypot(ax, ay, az) || 1

            p.axis[j] = ax / length
            p.axis[j + 1] = ay / length
            p.axis[j + 2] = az / length

            p.seedAngle[id] = rand(0, TAU)

            p.spinSpeed[id] =
                rand(-look.spin, look.spin) *
                (
                    1 +
                    look.spinSizeBias *
                    (1 - 2 * mass)
                )
        }

        p.align[id] = aligned ? 1 : 0
        kind[id] = kindValue

        const life =
            burstLife *
            look.lifeMul *
            tier.life *
            rand(0.7, 1.3)

        p.life[id] = life
        p.maxLife[id] = life

        p.seed[id] = Math.random()
        p.age[id] = 0
        p.mass[id] = mass
        p.heat[id] = look.heat
        p.glint[id] = 0

        p.instancePosition[j] = p.x[id]
        p.instancePosition[j + 1] = p.y[id]
        p.instancePosition[j + 2] = 0.15

        p.instanceRotation[id] = p.seedAngle[id]
    }

    p.dirty = true
}

export function updateDebrisEmitter(dt) {
    const p = debrisPool

    if (!Number.isFinite(dt) || dt <= 0) return

    const frames = dt * 60

    // Reverse iteration preserves swap-removal safety
    // if the pool's release mechanism removes active IDs.
    for (let n = p.activeCount - 1; n >= 0; n--) {
        const id = p.activeIds[n]
        const look = LOOKS[kind[id]]

        p.life[id] -= dt

        // Remove expired debris and recycle its pool slot.
        if (p.life[id] <= 0) {
            p.kill(id)
            continue
        }

        const maxLife = Math.max(
            0.001,
            p.maxLife[id]
        )

        const elapsed = maxLife - p.life[id]

        // Critical: never let t exceed 1.
        const t = clamp(elapsed / maxLife, 0, 1)

        const k =
            1 +
            look.massDrag *
            (1 - 2 * p.mass[id])

        const drag = Math.pow(
            look.drag,
            frames * k
        )

        let vx = p.vx[id] * drag
        let vy = p.vy[id] * drag

        if (look.curl !== 0) {
            const w =
                look.curl *
                (p.seed[id] * 2 - 1) *
                dt

            const c = Math.cos(w)
            const s = Math.sin(w)

            const nextVx = vx * c - vy * s
            const nextVy = vx * s + vy * c

            vx = nextVx
            vy = nextVy
        }

        p.vx[id] = vx
        p.vy[id] = vy

        p.x[id] += vx * dt
        p.y[id] += vy * dt

        const j = id * 3

        p.instancePosition[j] = p.x[id]
        p.instancePosition[j + 1] = p.y[id]
        p.instancePosition[j + 2] = 0.15

        p.age[id] = t

        // ----------------------------------------------------
        // ROTATION
        // ----------------------------------------------------

        if (p.align[id] > 0) {
            const speedSq = vx * vx + vy * vy

            const heading = speedSq > 1e-4
                ? Math.atan2(vy, vx)
                : p.seedAngle[id]

            p.instanceRotation[id] =
                heading +
                Math.sin(
                    elapsed * 7 +
                    p.seed[id] * TAU
                ) * 0.1
        } else {
            p.instanceRotation[id] =
                p.seedAngle[id] +
                elapsed * p.spinSpeed[id]
        }

        // ----------------------------------------------------
        // SHRINK
        // ----------------------------------------------------

        let fade = 1

        if (t > look.shrinkFrom) {
            const u = clamp(
                (t - look.shrinkFrom) /
                (1 - look.shrinkFrom),
                0,
                1
            )

            // Smoothstep shrinking.
            fade = 1 - u * u * (3 - 2 * u)
        }

        p.scale[j] = p.baseScale[j] * fade
        p.scale[j + 1] = p.baseScale[j + 1] * fade
        p.scale[j + 2] = p.baseScale[j + 2] * fade

        // ----------------------------------------------------
        // HEAT / GLINT
        // ----------------------------------------------------

        p.heat[id] = look.heat > 0
            ? look.heat *
            Math.pow(1 - t, look.heatCurve)
            : 0

        if (look.glintRate > 0) {
            const sn = Math.sin(
                p.seed[id] * 40 +
                elapsed * look.glintRate
            )

            p.glint[id] = sn > 0
                ? Math.pow(sn, 9)
                : 0
        } else {
            p.glint[id] = 0
        }

    }

    p.dirty = true
}
