// src/ecs/systems/ArenaBoundsTracker.jsx

import { useFrame, useThree } from "@react-three/fiber"
import { setArenaBounds } from "../constants/arenaBounds.js"

export default function ArenaBoundsTracker() {
    const camera = useThree((state) => state.camera)

    // Runs before the fixed-step game loop (-1).
    useFrame(() => {
        if (!camera.isOrthographicCamera) return

        const zoom = camera.zoom

        if (!Number.isFinite(zoom) || zoom <= 0) return

        setArenaBounds(
            camera.position.x + camera.left / zoom,
            camera.position.x + camera.right / zoom,
            camera.position.y + camera.bottom / zoom,
            camera.position.y + camera.top / zoom
        )
    }, -2)

    return null
}
