// src/fx/gpu/DebrisEmitter.js
//
// Two looks, chosen by the burst's kind:
//   "rock"  -> zero-G drift: slow, long-lived pieces on gently curving paths
//   "metal" -> ricochet shards: thin slivers that point along their flight and glint
//
// Exports are unchanged: debrisPool, kind, spawnedDebris, emitDebrisBurst, updateDebrisEmitter.
//
// heat and glint are extra per-instance values for DebrisRenderer.jsx. The old renderer
// ignores them, so the emitter works with either.

import { createTypedEffectPool } from "../effectPool.js"

const MAX_DEBRIS = 256
const TAU = Math.PI * 2

export const debrisPool = createTypedEffectPool(
    MAX_DEBRIS,
    ["spinSpeed", "seedAngle", "seed", "age", "mass", "heat", "glint", "align"],
    ["scale", "axis", "baseScale"],
)
export const kind = new Uint8Array(MAX_DEBRIS)
export const spawnedDebris = []
const KIND_MAP = { rock: 0, metal: 1 }

// ---------------------------------------------------------------------------
// The two looks, indexed by kind value (0 = rock, 1 = metal).
//
//  drag        velocity kept per 1/60 s (lower = stops sooner)
//  massDrag    0..1  big pieces keep momentum, small ones stall
//  spin        max rad/s;  spinSizeBias  small pieces spin faster (0..1)
//  lifeMul     scales maxLife
//  shrinkFrom  life fraction where pieces start shrinking to nothing
//  curl        rad/s of sideways arc applied to velocity (sign random per piece)
//  heat        rim glow at birth (0..1), cooling by (1 - t) ^ heatCurve; 0 = none
//  glintRate   rad/s of the specular flash (0 = none)
//  tiers       size classes: w weight, size/speed ranges, stretch (long axis),
//              life, align (0..1 chance to point along travel)
// ---------------------------------------------------------------------------
const LOOKS = [

    // ROCK: zero-G drift
    {
        drag: 0.9975, massDrag: 0.3, spin: 3.2, spinSizeBias: 0.4, lifeMul: 2.4, shrinkFrom: 0.78,
        curl: 0.5, heat: 1, heatCurve: 4, glintRate: 0,
        tiers: [
            { w: 0.25, size: [0.7, 1.1], speed: [0.12, 0.3], stretch: 1, life: 1.1 },
            { w: 0.45, size: [0.35, 0.65], speed: [0.2, 0.5], stretch: 1.15, life: 1.0 },
            { w: 0.3, size: [0.12, 0.25], speed: [0.3, 0.7], stretch: 1.3, life: 0.85 },
        ],
    },

    // METAL: ricochet shards
    {
        drag: 0.99, massDrag: 0.4, spin: 2, spinSizeBias: 0, lifeMul: 0.9, shrinkFrom: 0.7,
        curl: 0, heat: 0, heatCurve: 1, glintRate: 14,
        tiers: [
            { w: 0.3, size: [0.3, 0.55], speed: [1.0, 1.8], stretch: 3.2, life: 1.0, align: 1 },
            { w: 0.5, size: [0.12, 0.24], speed: [1.4, 2.6], stretch: 2.6, life: 0.8, align: 1 },
            { w: 0.2, size: [0.06, 0.12], speed: [1.8, 3.0], stretch: 1.4, life: 0.45, align: 0.5 },
        ],
    },
]

function rand(a, b) {
    return a + Math.random() * (b - a)
}

function pickTier(tiers) {
    let total = 0
    for (let i = 0; i < tiers.length; i++)
        total += tiers[i].w
    let r = Math.random() * total
    for (let i = 0; i < tiers.length; i++) {
        r -= tiers[i].w
        if (r <= 0)
            return tiers[i]
    }
    return tiers[tiers.length - 1]
}

export function emitDebrisBurst({ x, y, count = 10, speed = 8, size = 1, kind: type = "rock", maxLife = 1.4, spread = TAU, direction = 0 }) {

    const p = debrisPool
    const kindValue = KIND_MAP[type] ?? 0
    const look = LOOKS[kindValue]

    for (let i = 0; i < count; i++) {

        const id = p.allocate()

        if (id < 0)
            break

        // Track active ids if something else needs them
        spawnedDebris.push(id)

        const tier = pickTier(look.tiers)

        const angle = direction + (Math.random() - 0.5) * spread
        const velocity = speed * rand(tier.speed[0], tier.speed[1])

        p.x[id] = x + (Math.random() - 0.5) * 0.2
        p.y[id] = y + (Math.random() - 0.5) * 0.2

        const vx = Math.cos(angle) * velocity
        const vy = Math.sin(angle) * velocity

        p.vx[id] = vx
        p.vy[id] = vy

        const rel = rand(tier.size[0], tier.size[1])
        const s = size * rel
        const mass = Math.min(1, Math.max(0, (rel - 0.1) / 1.1))
        const sp = id * 3

        const sx = s * tier.stretch * (0.7 + Math.random() * 0.6)
        const sy = s * (0.7 + Math.random() * 0.6)
        const sz = s * (0.7 + Math.random() * 0.6)

        p.scale[sp] = p.baseScale[sp] = sx
        p.scale[sp + 1] = p.baseScale[sp + 1] = sy
        p.scale[sp + 2] = p.baseScale[sp + 2] = sz

        const aligned = Math.random() < (tier.align || 0)

        if (aligned) {

            // Long axis follows the direction of travel
            p.axis[sp] = 0
            p.axis[sp + 1] = 0
            p.axis[sp + 2] = 1

            p.seedAngle[id] = Math.atan2(vy, vx)
            p.spinSpeed[id] = 0

        } else {

            const ax = Math.random() * 2 - 1
            const ay = Math.random() * 2 - 1
            const az = Math.random() * 2 - 1

            const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1

            p.axis[sp] = ax / len
            p.axis[sp + 1] = ay / len
            p.axis[sp + 2] = az / len

            p.seedAngle[id] = Math.random() * TAU
            p.spinSpeed[id] = (Math.random() - 0.5) * 2 * look.spin * (1 + look.spinSizeBias * (1 - 2 * mass))
        }

        p.align[id] = aligned ? 1 : 0

        kind[id] = kindValue

        const life = maxLife * look.lifeMul * tier.life * rand(0.7, 1.3)

        p.life[id] = life
        p.maxLife[id] = life

        p.seed[id] = Math.random()
        p.age[id] = 0
        p.mass[id] = mass
        p.heat[id] = look.heat
        p.glint[id] = 0

        p.instancePosition[sp] = p.x[id]
        p.instancePosition[sp + 1] = p.y[id]
        p.instancePosition[sp + 2] = 0.15
        p.instanceRotation[id] = p.seedAngle[id]
    }

    p.dirty = true
}

export function updateDebrisEmitter(dt) {

    const p = debrisPool
    const frames = dt * 60

    // Walk backwards so killing a piece never skips another
    for (let n = p.activeCount - 1; n >= 0; n--) {

        const i = p.activeIds[n]
        const look = LOOKS[kind[i]]

        p.life[i] -= dt

        if (p.life[i] <= 0) {

            // Remove from spawnedDebris list
            const index = spawnedDebris.indexOf(i)
            if (index !== -1)
                spawnedDebris.splice(index, 1)

            p.kill(i)
            continue
        }

        const maxLife = p.maxLife[i]
        const elapsed = maxLife - p.life[i]
        const t = elapsed / maxLife

        // Big pieces keep momentum, small ones stall
        const k = 1 + look.massDrag * (1 - 2 * p.mass[i])
        const drag = Math.pow(look.drag, frames * k)

        let vx = p.vx[i] * drag
        let vy = p.vy[i] * drag

        if (look.curl) {

            const w = look.curl * (p.seed[i] * 2 - 1) * dt
            const c = Math.cos(w)
            const s = Math.sin(w)

            const nx = vx * c - vy * s
            vy = vx * s + vy * c
            vx = nx
        }

        p.vx[i] = vx
        p.vy[i] = vy

        p.x[i] += vx * dt
        p.y[i] += vy * dt

        const pos = i * 3

        p.instancePosition[pos] = p.x[i]
        p.instancePosition[pos + 1] = p.y[i]

        p.age[i] = t

        // Tumbling pieces spin in real time, shards follow their heading
        if (p.align[i] > 0) {

            const heading = vx * vx + vy * vy > 1e-4 ? Math.atan2(vy, vx) : p.seedAngle[i]

            p.instanceRotation[i] = heading + Math.sin(elapsed * 7 + p.seed[i] * TAU) * 0.1

        } else {

            p.instanceRotation[i] = p.seedAngle[i] + elapsed * p.spinSpeed[i]
        }

        // Shrink away instead of popping out
        let fade = 1

        if (t > look.shrinkFrom) {

            const u = (t - look.shrinkFrom) / (1 - look.shrinkFrom)

            fade = 1 - u * u * (3 - 2 * u)
        }

        p.scale[pos] = p.baseScale[pos] * fade
        p.scale[pos + 1] = p.baseScale[pos + 1] * fade
        p.scale[pos + 2] = p.baseScale[pos + 2] * fade

        // Shader inputs: rim glow cooling over life, and a specular flash for metal
        p.heat[i] = look.heat > 0 ? look.heat * Math.pow(1 - t, look.heatCurve) : 0

        if (look.glintRate > 0) {

            const sn = Math.sin(p.seed[i] * 40 + elapsed * look.glintRate)

            p.glint[i] = sn > 0 ? Math.pow(sn, 9) : 0
        }
    }

    p.dirty = true
}