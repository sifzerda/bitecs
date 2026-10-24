// src/renderers/WeaponMount.jsx

import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'
import { world } from '../ecs/constants/world.js'

// ------------------------------------------------------------

export const RENDER_ORDER = {
    ship: 0,
    shipDetail: 10,
    cockpit: 20,
    gun: 30,
    gunGlow: 35,
    propeller: 40
}

// ------------------------------------------------------------

function Glow({ core, x, y, z }) {

    const uniforms = useMemo(() => ({
        time: { value: 0 },
        color: { value: new THREE.Color() },
        low: { value: 0 },
        high: { value: 1 },
        speed: { value: 4 }
    }), [])

    useFrame(() => { uniforms.time.value = world.time.elapsed })
    useEffect(() => {
        uniforms.color.value.set(core.color ?? "#00e5ff")
        uniforms.high.value = core.intensity ?? 1
        uniforms.low.value = core.minIntensity ?? uniforms.high.value * 0.5
        uniforms.speed.value = core.speed ?? 4
    }, [core, uniforms])

    if (core.enabled === false) return null

    const radius = core.size ?? 0.2

    return (
        <mesh position={[
            x + (core.offsetX ?? 0),
            y + (core.offsetY ?? 0),
            z + 0.01
        ]} renderOrder={RENDER_ORDER.gunGlow}>
            <planeGeometry args={[core.width ?? radius * 2, core.height ?? radius * 2]} />
            <shaderMaterial uniforms={uniforms} transparent depthTest={false} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending}
                vertexShader={
                    `varying vec2 vUv; void main(){vUv=uv;
                    gl_Position=projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
                }

                fragmentShader={
                    `varying vec2 vUv;
                uniform float time;
                uniform vec3 color;
                uniform float low;
                uniform float high;
                uniform float speed;
                void main(){
                float p=mix(low, high, 0.5+0.5 * sin(time * speed));
                float a=(1.0-smoothstep(0.0,1.0,length(vUv-0.5)*2.0))*p;
                gl_FragColor=vec4(color*p,a); }`
                } />
        </mesh>
    )
}

function Gun({
    gunType,
    mount,
    x,
    y,
    z,
    scale,
    rotation,
    core
}) {

    const texture = useTexture(gunType.svg)

    useEffect(() => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true
    }, [texture])

    return (
        <>
            <mesh position={[x, y, z]} rotation={[0, 0, Math.PI / 2 + rotation]} scale={3 * scale} renderOrder={RENDER_ORDER.gun}>
                <planeGeometry args={[mount.width ?? 1.4, mount.height ?? 0.45]} />
                <meshBasicMaterial map={texture} transparent alphaTest={0.05} depthTest={false} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            {core && <Glow core={core} x={x} y={y} z={z} />}
        </>
    )
}

export function WeaponMount({ gunCfg, configOverride = null }) {
    if (!gunCfg || gunCfg.enabled === false) return null

    const gunType = getGunTypeById(gunCfg.typeId)

    if (!gunType) return null

    const config = configOverride ?? gunType.config, mount = config.mount ?? {}
    const x = gunCfg.offsetX ?? mount.offsetX ?? 0
    const y = gunCfg.offsetY ?? mount.offsetY ?? 0
    const z = gunCfg.zOffset ?? 0
    const scale = gunCfg.scale ?? mount.scale ?? 1
    const rotation = gunCfg.rotation ?? 0
    const props = { gunType, mount, y, z, scale, rotation, core: config.coreGlow }

    return (
        <>
            <Gun {...props} x={x} />
            {gunCfg.mirrored !== false && <Gun {...props} x={-x}
            />}
        </>
    )
}