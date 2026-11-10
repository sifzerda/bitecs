// src/renderers/CameraShake.jsx

import { useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { getCameraShake } from "../ecs/combat/impactFeedback.js"

// Mount after the component that controls camera position.
// Uses default frame priority so R3F retains automatic rendering.
export default function CameraShake() {
    const camera = useThree(state => state.camera)
    const previous = useRef({ x: 0, y: 0 })
    useFrame(() => {
        camera.position.x -= previous.current.x
        camera.position.y -= previous.current.y
        const strength = getCameraShake()
        const x = strength > 0 ? (Math.random() * 2 - 1) * strength : 0
        const y = strength > 0 ? (Math.random() * 2 - 1) * strength : 0
        camera.position.x += x
        camera.position.y += y
        previous.current.x = x
        previous.current.y = y
    })
    return null
}
