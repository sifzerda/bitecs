// src/renderers/WeaponMount.jsx

import { useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'

const GUN_DIRECTION = Math.PI / 2

// Renders a single SVG-textured gun quad. Not exported — WeaponMount is the
// only consumer, and it always needs one or two of these mirrored.
function SVGGun({ svg, width = 1, height = 1, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {

    const texture = useTexture(svg)

    // guard: only configure a given texture object once, ever — it's shared
    // (cached by URL) across every mesh using the same svg, so repeatedly
    // touching these props on an already-uploaded texture corrupts its
    // GPU storage
    useEffect(() => {
        if (texture.__configured) return
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8
        texture.needsUpdate = true
        texture.__configured = true
    }, [texture])

    return (
        <mesh position={position} rotation={rotation} scale={3 * scale}>
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

export function WeaponMount({ gunCfg, configOverride = null }) {
    if (!gunCfg?.enabled) return null

    const gunType = getGunTypeById(gunCfg.typeId)
    const resolvedConfig = configOverride ?? gunType.config
    const zOffset = gunCfg.zOffset ?? 0.06
    const rotation = [0, 0, GUN_DIRECTION + (gunCfg.rotation ?? 0)]
    const scale = gunCfg.scale ?? resolvedConfig.mount.scale
    const mount = resolvedConfig.mount

    if (gunCfg.mirrored === false) {
        return (
            <SVGGun
                svg={gunType.svg}
                width={mount.width}
                height={mount.height}
                position={[gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
        )
    }

    return (
        <>
            <SVGGun
                svg={gunType.svg}
                width={mount.width}
                height={mount.height}
                position={[-gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
            <SVGGun
                svg={gunType.svg}
                width={mount.width}
                height={mount.height}
                position={[gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
        </>
    )
}