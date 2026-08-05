// src/renderers/SVGGun.jsx

import { useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export function SVGGun({
    svg,
    width = 1,
    height = 1,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
}) {

    const texture = useTexture(svg)

        console.log('SVGGun render', svg, {
        loaded: !!texture,
        imgW: texture?.image?.width,
        imgH: texture?.image?.height,
        position,
        scale,
    })

    // guard: only configure a given texture object once, ever — since it's
    // shared (cached by URL) across every mesh that uses the same svg,
    // repeatedly touching these props on an already-uploaded texture is
    // what corrupts its GPU storage
    useEffect(() => {
        if (texture.__configured) return
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8
        texture.needsUpdate = true
        texture.__configured = true
    }, [texture])

    return (
        <mesh
            position={position}
            rotation={rotation}
            scale={3 * scale}
        >
            <planeGeometry args={[width, height]} />

            <meshBasicMaterial
                map={texture}
                transparent
                alphaTest={0.05}
                side={THREE.DoubleSide}
                toneMapped={false}
            />
        </mesh>
    )
}