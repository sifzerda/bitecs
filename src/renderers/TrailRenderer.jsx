// src/renderers/TrailRenderer.jsx

import { PoolParticles } from "./PoolParticles.jsx"
import { trailPool } from "../fx/gpu/TrailEmitter.js"

function sample(pool, id, out) {
    const j = id * 3

    const maxLife = Math.max(
        pool.maxLife[id],
        1e-6
    )

    const remaining = Math.max(
        0,
        Math.min(1, pool.life[id] / maxLife)
    )

    const age = 1 - remaining

    out.x = pool.x[id]
    out.y = pool.y[id]
    out.z = -0.01

    out.rotation = pool.spin[id]

    const size =
        pool.size[id] *
        (1 + age * 1.4) *
        1.6

    out.width = size
    out.height = size

    out.r = pool.color[j]
    out.g = pool.color[j + 1]
    out.b = pool.color[j + 2]

    out.alpha =
        pool.alpha[id] *
        (0.85 + remaining * 0.4)
}

export function TrailRenderer() {
    return (
        <PoolParticles
            pool={trailPool}
            sample={sample}
        />
    )
}
