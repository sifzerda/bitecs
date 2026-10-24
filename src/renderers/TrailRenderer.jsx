// src/renderers/TrailRenderer.jsx

import { PoolParticles } from "./PoolParticles.jsx"
import { trailPool } from "../fx/gpu/TrailEmitter.js"

function sample(p, id, s) {

    const life = Math.max(0, p.life[id] / Math.max(p.maxLife[id], 1e-6));
    const j = id * 3

    s.x = p.x[id];
    s.y = p.y[id];
    s.z = -0.01;
    s.rotation = p.spin[id]
    s.width = s.height = p.size[id] * (1 + (1 - life) * 1.4) * 1.6
    s.r = p.color[j]; s.g = p.color[j + 1];
    s.b = p.color[j + 2];
    s.alpha = p.alpha[id] * (0.85 + life * 0.4)
}

// ============================================================
// Renderer
// ============================================================

export function TrailRenderer() {

    return (
        <PoolParticles pool={trailPool} sample={sample} />
    )
}