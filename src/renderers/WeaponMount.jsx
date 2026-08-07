// src/renderers/WeaponMount.jsx

import { useEffect, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'

const GUN_DIRECTION = Math.PI / 2

// ------------------------------------------------------------

export const RENDER_ORDER = {
    ship: 0,
    shipDetail: 1,
    cockpitGlass: 1.5,
    gun: 2,
    propeller: 2.5,
    gunGlow: 3,
}

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
        vec2 centered = vUv - 0.5;
        float dist = length(centered) * 2.0;
        float pulse = mix(uMinIntensity, uMaxIntensity, 0.5 + 0.5 * sin(uTime * uSpeed));
        float falloff = smoothstep(1.0, 0.0, dist);
        float alpha = falloff * pulse;
        gl_FragColor = vec4(uColor * pulse, alpha);
    }
`

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
        <mesh position={[offsetX, offsetY, 0.01]} renderOrder={RENDER_ORDER.gunGlow}>
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

function SVGGun({ 
    svg, 
    width = 1, 
    height = 1, 
    position = [0, 0, 0], 
    rotation = [0, 0, 0], 
    scale = 1, 
    core = null }) {

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
    const core = resolvedConfig.coreGlow ?? null

    const offsetX = gunCfg.offsetX ?? mount.offsetX ?? 0
    const offsetY = gunCfg.offsetY ?? mount.offsetY ?? 0
    const scale = gunCfg.scale ?? mount.scale ?? 1
    const zOffset = gunCfg.zOffset ?? 0.06
    const rotation = [0, 0, GUN_DIRECTION + (gunCfg.rotation ?? 0)]

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