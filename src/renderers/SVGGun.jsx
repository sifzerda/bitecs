// src/renderers/SVGGun.jsx

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

    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8

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