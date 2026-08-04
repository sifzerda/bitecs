// src/fx/gpu/FireEmitter.js

import * as THREE from 'three'
import { createTypedEffectPool } from "../effectPool"

const MAX_FIRE = 1024
const SEGMENTS = 7

export const firePool = createTypedEffectPool(MAX_FIRE, ["size", "seed"])

const TOTAL_POINTS = MAX_FIRE * SEGMENTS

firePool.segPosition = new Float32Array(TOTAL_POINTS * 3)
firePool.segSize = new Float32Array(TOTAL_POINTS)
firePool.segColor = new Float32Array(TOTAL_POINTS * 3)
firePool.segAlpha = new Float32Array(TOTAL_POINTS)

// Reduced intensity molten red fire
const hot = new THREE.Color(3.75, 1.15, 0.28)
const mid = new THREE.Color(2.8, 0.78, 0.20)
const cool = new THREE.Color(1.6, 0.22, 0.07)
const smoke = new THREE.Color(0.13, 0.11, 0.11)
const tmpColor = new THREE.Color()

export function emitFire({ x, y, count = 20 }) {

    const p = firePool

    for (let i = 0; i < count; i++) {

        const id = p.allocate()

        if (id < 0)
            break

        p.x[id] = x
        p.y[id] = y

        p.vx[id] = (Math.random() - 0.5) * 3
        p.vy[id] = Math.random() * 4

        p.size[id] = 0.2 + Math.random() * 0.4
        p.life[id] = 0.5 + Math.random()

        p.maxLife[id] = p.life[id]
        p.seed[id] = Math.random()

    }

}

export function updateFireEmitter(dt, elapsed = 0) {

    const p = firePool

    for (let i = 0; i < p.capacity; i++) {

        const base = i * SEGMENTS

        if (!p.alive[i]) {

            for (let s = 0; s < SEGMENTS; s++) {
                const idx = base + s
                p.segAlpha[idx] = 0
                p.segSize[idx] = 0
            }

            continue

        }

        p.life[i] -= dt

        if (p.life[i] <= 0) {

            for (let s = 0; s < SEGMENTS; s++) {
                const idx = base + s
                p.segAlpha[idx] = 0
                p.segSize[idx] = 0
            }

            p.kill(i)
            p.dirty = true
            continue

        }

        p.x[i] += p.vx[i] * dt
        p.y[i] += p.vy[i] * dt

        p.vx[i] *= .96
        p.vy[i] *= .96

        const t = Math.max(0, Math.min(1, p.life[i] / p.maxLife[i]))
        const age = 1 - t
        const seed = p.seed[i]

        const baseX = p.x[i]
        const baseY = p.y[i]

        const growth = age < 0.25 ? age / 0.25 : 1.0
        const strandHeight = p.size[i] * (3.2 + seed * 1.4) * growth

        for (let s = 0; s < SEGMENTS; s++) {

            const idx = base + s
            const frac = s / (SEGMENTS - 1)

            const wave1 = Math.sin(elapsed * 7.5 + seed * 30.0 + frac * 5.0)
            const wave2 = Math.sin(elapsed * 2.6 - seed * 18.0 - frac * 2.2)
            const sway = (wave1 * 0.65 + wave2 * 0.35) * frac * p.size[i] * 0.9

            const pIdx = idx * 3
            p.segPosition[pIdx] = baseX + sway
            p.segPosition[pIdx + 1] = baseY + frac * strandHeight
            p.segPosition[pIdx + 2] = 0.01

            const flicker = 0.82 + Math.sin(elapsed * 20.0 + seed * 50.0 + frac * 9.0) * 0.18

            p.segSize[idx] = p.size[i] * THREE.MathUtils.lerp(1.7, 0.12, frac) * flicker * (1.0 - age * 0.35) * 5
            p.segAlpha[idx] = (1.0 - frac * 0.85) * Math.pow(t, 0.5) * flicker

            tmpColor.copy(hot)
                .lerp(mid, THREE.MathUtils.smoothstep(frac, 0.1, 0.65))
                .lerp(cool, THREE.MathUtils.smoothstep(frac, 0.65, 1.0))
                .lerp(smoke, THREE.MathUtils.smoothstep(age, 0.6, 1.0) * 0.6)

            const cIdx = idx * 3
            p.segColor[cIdx] = tmpColor.r
            p.segColor[cIdx + 1] = tmpColor.g
            p.segColor[cIdx + 2] = tmpColor.b

        }

        p.dirty = true

    }

}