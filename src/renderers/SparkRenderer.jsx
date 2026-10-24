// src/renderers/SparkRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { sparkPool } from "../fx/gpu/SparkEmitter.js"
import { PoolParticles } from "./PoolParticles.jsx"

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
    s.width = Math.max(0.05, p.instanceStretch[id]) * 1.8; 
    s.height = p.instanceScale[id] * 1.8
}
export function SparkRenderer() {

    return (
        <PoolParticles pool={sparkPool} sample={sample} kind={0} />
    )

}