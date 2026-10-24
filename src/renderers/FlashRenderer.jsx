// src/renderers/FlashRenderer.jsx

import { PoolParticles } from "./PoolParticles.jsx"
import { flashPool } from "../fx/gpu/FlashEmitter.js"

function sample(p, id, s) {
   
    const j = id * 3
    
    s.x = p.instancePosition[j]; 
    s.y = p.instancePosition[j + 1]; 
    s.z = p.instancePosition[j + 2]
    s.rotation = p.instanceRotation[id]
    s.r = p.instanceColor[j]; 
    s.g = p.instanceColor[j + 1]; 
    s.b = p.instanceColor[j + 2]
    s.alpha = p.instanceAlpha[id]
    s.width = s.height = p.instanceScale[id]
    s.width *= 1.6; s.height *= 0.9
}

export function FlashRenderer() {
    return (
        <PoolParticles pool={flashPool} sample={sample} />
    )
}
