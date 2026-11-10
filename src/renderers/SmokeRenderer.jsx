// src/renderers/SmokeRenderer.jsx

import { useCallback, useMemo } from "react"
import * as THREE from "three"

import { PoolParticles } from "./PoolParticles.jsx"
import { smokePool } from "../fx/gpu/SmokeEmitter.js"

export function SmokeRenderer({
    hotCore = "#ff2614",
    fireColor = "#8a1f52",
    smokeColor = "#0a1a4a",
    baseOpacity = 0.6,
    sizeMultiplier = 4,
}) {
    const colors = useMemo(() => ({
        hot: new THREE.Color(hotCore),
        fire: new THREE.Color(fireColor),
        smoke: new THREE.Color(smokeColor),
        temp: new THREE.Color(),
    }), [hotCore, fireColor, smokeColor])

    const sample = useCallback((pool, id, out) => {
        const j = id * 3

        out.x = pool.instancePosition[j]
        out.y = pool.instancePosition[j + 1]
        out.z = pool.instancePosition[j + 2]

        out.rotation = pool.instanceRotation[id]

        const age = THREE.MathUtils.clamp(
            pool.age[id],
            0,
            1
        )

        const size =
            pool.instanceScale[id] *
            sizeMultiplier *
            (1 + age * 0.6)

        out.width = size
        out.height = size

        if (age < 0.15) {
            colors.temp.copy(colors.hot).lerp(
                colors.fire,
                age / 0.15
            )
        } else {
            colors.temp.copy(colors.fire).lerp(
                colors.smoke,
                (age - 0.15) / 0.85
            )
        }

        out.r = colors.temp.r
        out.g = colors.temp.g
        out.b = colors.temp.b

        out.alpha =
            pool.instanceAlpha[id] *
            baseOpacity
    }, [colors, baseOpacity, sizeMultiplier])

    return (
        <PoolParticles
            pool={smokePool}
            sample={sample}
            additive={false}
        />
    )
}
