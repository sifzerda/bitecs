// src/renderers/SmokeRenderer.jsx

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PoolParticles } from "./PoolParticles.jsx"
import { smokePool } from "../fx/gpu/SmokeEmitter.js"

// ------------------------------------------------------------
// Renderer
// ------------------------------------------------------------

export function SmokeRenderer({ hotCore = "#ff2614", fireColor = "#8a1f52", smokeColor = "#0a1a4a", baseOpacity = 0.6, sizeMultiplier = 4 }) {

  const [hot, fire, smoke, temp] = useMemo(() => [
    new THREE.Color(hotCore),
    new THREE.Color(fireColor),
    new THREE.Color(smokeColor),
    new THREE.Color()], [hotCore, fireColor, smokeColor]
  )

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

    const age = p.age[id]

    s.width = s.height = p.instanceScale[id] * sizeMultiplier * (1 + age * 0.6)

    const c = age < 0.15 ? temp.copy(hot).lerp(fire, age / 0.15) : temp.copy(fire).lerp(smoke, (age - 0.15) / 0.85)

    s.r = c.r;
    s.g = c.g;
    s.b = c.b;
    s.alpha *= baseOpacity
  }

  return (
    <PoolParticles pool={smokePool} sample={sample} additive={false} />
  )

}