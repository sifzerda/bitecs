// src/fx/gpu/FlashEmitter.js

import * as THREE from "three"
import { createTypedEffectPool } from "../effectPool.js"

export const flashPool = createTypedEffectPool(64, ["angle", "size", "r", "g", "b", "seed"])

const colorValue = new THREE.Color()

export function emitFlash({ x, y, angle = 0, size = 1, maxLife = 0.08, color = "#fff2b0" }) {

    const p = flashPool, id = p.allocate();
    if (id < 0) return

    colorValue.set(color);

    const j = id * 3

    p.x[id] = x;
    p.y[id] = y;
    p.angle[id] = angle;
    p.size[id] = size;
    p.seed[id] = Math.random()
    p.r[id] = colorValue.r;
    p.g[id] = colorValue.g;
    p.b[id] = colorValue.b
    p.life[id] = p.maxLife[id] = Math.max(0.001, maxLife)
    p.instancePosition.set([x, y, 0.3], j);
    p.instanceColor.set([colorValue.r, colorValue.g, colorValue.b], j)
    p.instanceScale[id] = size;
    p.instanceRotation[id] = angle
}

export function updateFlashEmitter(dt) {

    const p = flashPool

    for (let n = p.activeCount - 1; n >= 0; n--) {

        const id = p.activeIds[n]; p.life[id] -= dt

        if (p.life[id] <= 0) {
            p.kill(id);
            continue
        }
        const t = p.life[id] / p.maxLife[id];
        p.instanceScale[id] = p.size[id] * (0.5 + t * 0.5);
        p.instanceAlpha[id] = t
    }
    p.dirty = true
}