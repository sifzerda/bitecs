// src/renderers/WeaponMount.jsx

import { useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'

const GUN_DIRECTION = Math.PI / 2

// ------------------------------------------------------------
// Back to a plain WebGL mesh (not <Html>). Both this and the ship
// (see ShipRenderer.jsx) now render as textured meshes in the SAME
// WebGL canvas, which means Three.js's own renderOrder + depthTest
// controls give a deterministic, guaranteed draw order — not a DOM/
// CSS stacking heuristic that can flip depending on browser tie-
// breaking, preserve-3d compositing, or float-precision z comparisons
// (all of which we hit trying to make a DOM-based ship and DOM-based
// gun cooperate). RENDER_ORDER.gun is set higher than the ship's, and
// depthTest is disabled on the gun material, so the gun is guaranteed
// to paint after — i.e. visually on top of — the ship every frame,
// regardless of actual z position or rotation.
// ------------------------------------------------------------

// Keep in sync with RENDER_ORDER.ship in ShipRenderer.jsx.
export const RENDER_ORDER = {
    ship: 0,
    gun: 1,
}

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
        <mesh
            position={position}
            rotation={rotation}
            scale={3 * scale}
            renderOrder={RENDER_ORDER.gun}
        >
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
                map={texture}
                transparent
                alphaTest={0.05}
                side={THREE.DoubleSide}
                toneMapped={false}
                // Guarantees the gun paints on top of the ship regardless of
                // actual world z / depth-buffer comparison — draw order is
                // instead fully determined by renderOrder above. This is the
                // deterministic replacement for all the z-offset/z-index
                // approaches that kept flipping.
                depthTest={false}
            />
        </mesh>
    )
}

export function WeaponMount({ gunCfg, configOverride = null }) {
    if (!gunCfg || gunCfg.enabled === false) return null

    const gunType = getGunTypeById(gunCfg.typeId)

    if (!gunType) {
        console.warn(`WeaponMount: unknown gun typeId "${gunCfg.typeId}"`)
        return null
    }

    const resolvedConfig = configOverride ?? gunType.config
    const mount = resolvedConfig.mount

    const offsetX = gunCfg.offsetX ?? mount.offsetX ?? 0
    const offsetY = gunCfg.offsetY ?? mount.offsetY ?? 0
    const scale = gunCfg.scale ?? mount.scale ?? 1
    const zOffset = gunCfg.zOffset ?? 0.06
    const rotation = [0, 0, GUN_DIRECTION + (gunCfg.rotation ?? 0)]

    if (gunCfg.mirrored === false) {
        return (
            <SVGGun
                svg={gunType.svg}
                width={mount.width}
                height={mount.height}
                position={[offsetX, offsetY, zOffset]}
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
                position={[-offsetX, offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
            <SVGGun
                svg={gunType.svg}
                width={mount.width}
                height={mount.height}
                position={[offsetX, offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
        </>
    )
}