// src/renderers/WeaponMount.jsx

import { useEffect, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'

const GUN_DIRECTION = Math.PI / 2

// ------------------------------------------------------------
// Keep in sync with the ship's renderOrder values in ShipRenderer.jsx.
// gunGlow sits above gun, which sits above shipDetail, which sits above
// ship — all with depthTest disabled on the relevant layers, so stacking
// is fully determined by this ordering rather than actual z/depth.
export const RENDER_ORDER = {
    ship: 0,
    shipDetail: 1,
    gun: 2,
    gunGlow: 3,
}

// ------------------------------------------------------------
// Procedural pulsing core glow — a small additive-blended disc rendered
// with a custom shader (radial falloff + sine pulse), not a texture. This
// replaces the pulse that used to come from an embedded SVG animation,
// which was lost once the gun art got rasterized into a static WebGL
// texture (useTexture bakes the SVG once — any <animate>/CSS keyframes
// inside the SVG file itself no longer run). No extra asset needed since
// it's generated entirely on the GPU.
// ------------------------------------------------------------

const GLOW_VERTEX_SHADER = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const GLOW_FRAGMENT_SHADER = /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSpeed;
    uniform float uMinIntensity;
    uniform float uMaxIntensity;
    varying vec2 vUv;

    void main() {
        // vUv is 0..1 across the plane regardless of its actual width/height,
        // so distance-from-center is already normalized per-axis — this is
        // what lets the same shader do both a circular pulse (square plane)
        // and an elongated "mist" glow (wide/short plane, see mist/width/
        // height handling in GunCoreGlow below).
        vec2 centered = vUv - 0.5;
        float dist = length(centered) * 2.0;
        float pulse = mix(uMinIntensity, uMaxIntensity, 0.5 + 0.5 * sin(uTime * uSpeed));
        float falloff = smoothstep(1.0, 0.0, dist);
        float alpha = falloff * pulse;
        gl_FragColor = vec4(uColor * pulse, alpha);
    }
`

// Matches the original coreGlow config's fields:
//   size            -> radius (circular glow, most guns)
//   mist+width/height -> elongated glow (cryogun/acidthrower canisters)
//   intensity       -> maxIntensity (minIntensity derived unless given)
//   offsetX/offsetY -> same
//   color           -> same
//   enabled         -> same
function GunCoreGlow({
    enabled = true,
    radius = 0.3,
    mist = false,
    width = null,
    height = null,
    offsetX = 0,
    offsetY = 0,
    color = '#00e5ff',
    speed = 4,
    minIntensity = null,
    maxIntensity = 1,
}) {
    const materialRef = useRef(null)

    // circular glow uses a square plane of size radius*2; mist glow uses an
    // explicit width/height rectangle for the elongated canister look
    const planeWidth = mist ? (width ?? radius * 2) : radius * 2
    const planeHeight = mist ? (height ?? radius * 2) : radius * 2
    const resolvedMinIntensity = minIntensity ?? maxIntensity * 0.5

    const uniforms = useRef({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uSpeed: { value: speed },
        uMinIntensity: { value: resolvedMinIntensity },
        uMaxIntensity: { value: maxIntensity },
    })

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
        }
    })

    if (!enabled) return null

    return (
        <mesh
            position={[offsetX, offsetY, 0.01]}
            renderOrder={RENDER_ORDER.gunGlow}
        >
            <planeGeometry args={[planeWidth, planeHeight]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={GLOW_VERTEX_SHADER}
                fragmentShader={GLOW_FRAGMENT_SHADER}
                uniforms={uniforms.current}
                transparent
                depthTest={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
            />
        </mesh>
    )
}

function SVGGun({ svg, width = 1, height = 1, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, core = null }) {

    const texture = useTexture(svg)

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
                depthTest={false}
            />
            {/* core is a sibling mesh, not a child in local pre-scale space,
                so it isn't stretched by the gun's own `scale={3 * scale}` —
                rendered separately below, positioned in world space via the
                same parent group instead. See WeaponMount's return below. */}
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
    // Reads the SAME coreGlow block shape used by the original config
    // (enabled, color, size, offsetX/offsetY, intensity, and the mist/
    // width/height variant for canister-style guns) — see gunConfigs.js.
    const core = resolvedConfig.coreGlow ?? null

    const offsetX = gunCfg.offsetX ?? mount.offsetX ?? 0
    const offsetY = gunCfg.offsetY ?? mount.offsetY ?? 0
    const scale = gunCfg.scale ?? mount.scale ?? 1
    const zOffset = gunCfg.zOffset ?? 0.06
    const rotation = [0, 0, GUN_DIRECTION + (gunCfg.rotation ?? 0)]

    // Glow core offsets are given in the SAME local units as mount.offsetX/Y
    // (i.e. relative to ship center, not relative to the gun's own scaled
    // mesh), so it lines up correctly for both the left and right mirrored
    // copies without being distorted by the gun mesh's own `scale`.
    const renderCore = (mirrorX) => core && (
        <GunCoreGlow
            enabled={core.enabled}
            radius={core.size}
            mist={core.mist}
            width={core.width}
            height={core.height}
            offsetX={mirrorX * offsetX + (core.offsetX ?? 0)}
            offsetY={offsetY + (core.offsetY ?? 0)}
            color={core.color}
            maxIntensity={core.intensity}
        />
    )

    if (gunCfg.mirrored === false) {
        return (
            <>
                <SVGGun
                    svg={gunType.svg}
                    width={mount.width}
                    height={mount.height}
                    position={[offsetX, offsetY, zOffset]}
                    rotation={rotation}
                    scale={scale}
                />
                {renderCore(1)}
            </>
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
            {renderCore(-1)}
            {renderCore(1)}
        </>
    )
}