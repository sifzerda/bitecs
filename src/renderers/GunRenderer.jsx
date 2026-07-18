// src/renderers/GunRenderer.jsx

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DEFAULT_GUN_CONFIG } from '../ecs/constants/gunConfigs.js'

// ============================================================

function buildFrameShape(cfg) {
    const halfH = cfg.height / 2
    const tailH = halfH * (1 - cfg.taper)
    const shape = new THREE.Shape()
    shape.moveTo(0, halfH)
    shape.lineTo(cfg.length, halfH * 0.7)
    shape.lineTo(cfg.length, -halfH * 0.7)
    shape.lineTo(0, -halfH)
    shape.lineTo(-cfg.length * 0.25, -tailH)
    shape.lineTo(-cfg.length * 0.25, tailH)
    shape.closePath()
    return shape
}

function buildBlockShape(length, width) {
    const halfL = length / 2
    const halfW = width / 2
    const shape = new THREE.Shape()
    shape.moveTo(-halfL, halfW)
    shape.lineTo(halfL, halfW)
    shape.lineTo(halfL, -halfW)
    shape.lineTo(-halfL, -halfW)
    shape.closePath()
    return shape
}

function buildMuzzleShape(cfg) {
    const halfW = cfg.width / 2
    const shape = new THREE.Shape()
    shape.moveTo(0, halfW)
    shape.lineTo(cfg.length, halfW * 0.6)
    shape.lineTo(cfg.length, -halfW * 0.6)
    shape.lineTo(0, -halfW)
    shape.closePath()
    return shape
}

function buildMountBracketShape(cfg) {
    const halfL = cfg.length / 2
    const halfW = cfg.width / 2
    const shape = new THREE.Shape()
    shape.moveTo(-halfL, -halfW)
    shape.lineTo(halfL, -halfW)
    shape.lineTo(halfL, halfW)
    shape.lineTo(-halfL, halfW)
    shape.closePath()
    return shape
}

function Panel({ geometry, position, rotation, color, metalness = 0.3, roughness = 0.5 }) {
    return (
        <mesh geometry={geometry} position={position} rotation={rotation}>
            <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />
        </mesh>
    )
}

function CoreGlow({ cfg, position }) {

    const material = useMemo(() => new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: false,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(cfg.color) },
            uIntensity: { value: cfg.intensity },
        },
        vertexShader: /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,
        fragmentShader: /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
void main(){
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.3, d);
    float glow = exp(-d * 3.0);
    float pulse = 0.85 + 0.15 * sin(uTime * 6.0);
    vec3 result = uColor * (core * 1.6 + glow * 0.8) * uIntensity * pulse;
    float alpha = clamp(core + glow * 0.7, 0.0, 1.0) * uIntensity * pulse;
    gl_FragColor = vec4(result, alpha);
}
`
    }), [])

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
        material.uniforms.uColor.value.set(cfg.color)
        material.uniforms.uIntensity.value = cfg.intensity
    })

    return (
        <mesh position={position} material={material}>
            <planeGeometry args={[cfg.size, cfg.size]} />
        </mesh>
    )
}

// ============================================================

export function GunRenderer({ config = DEFAULT_GUN_CONFIG, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {

    const { general, frame, slide, barrel, muzzle, mountBracket, sight, accentStripe, coreGlow } = config

    const extrude = useMemo(() => ({ depth: general.extrudeDepth, bevelEnabled: false }), [general.extrudeDepth])
    const thinExtrude = useMemo(() => ({ depth: general.extrudeDepth * 0.6, bevelEnabled: false }), [general.extrudeDepth])

    const frameGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildFrameShape(frame), extrude),
        [frame.length, frame.height, frame.taper, extrude])

    const slideGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildBlockShape(slide.length, slide.height), extrude),
        [slide.length, slide.height, extrude])

    const barrelGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildBlockShape(barrel.length, barrel.width), extrude),
        [barrel.length, barrel.width, extrude])

    const muzzleGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildMuzzleShape(muzzle), extrude),
        [muzzle.length, muzzle.width, extrude])

    const mountBracketGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildMountBracketShape(mountBracket), extrude),
        [mountBracket.length, mountBracket.width, extrude])

    const sightGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildBlockShape(sight.width, sight.height), thinExtrude),
        [sight.width, sight.height, thinExtrude])

    const stripeGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildBlockShape(accentStripe.length, accentStripe.width), thinExtrude),
        [accentStripe.length, accentStripe.width, thinExtrude])

    const frameHalfH = frame.height / 2

    return (
        <group position={position} rotation={rotation} scale={scale}>

            <Panel geometry={frameGeometry} position={[0, 0, 0]} color={frame.color} roughness={0.5} />

            {slide.enabled && (
                <Panel geometry={slideGeometry} position={[slide.offsetX, slide.offsetY, 0.008]}
                    color={slide.color} metalness={slide.metalness} roughness={slide.roughness} />
            )}

            {barrel.enabled && (
                <Panel geometry={barrelGeometry} position={[barrel.offsetX, barrel.offsetY, 0.006]}
                    color={barrel.color} metalness={barrel.metalness} roughness={barrel.roughness} />
            )}

            {muzzle.enabled && (
                <Panel geometry={muzzleGeometry}
                    position={[
                        barrel.offsetX + barrel.length / 2 + (muzzle.offsetX ?? 0),
                        barrel.offsetY + (muzzle.offsetY ?? 0),
                        0.007
                    ]}
                    color={muzzle.color} metalness={muzzle.metalness} roughness={muzzle.roughness} />
            )}

            {mountBracket.enabled && (
                <Panel geometry={mountBracketGeometry}
                    position={[0, 0, -0.005]}
                    color={mountBracket.color} metalness={mountBracket.metalness} roughness={mountBracket.roughness} />
            )}

            {sight.enabled && (
                <Panel geometry={sightGeometry} position={[sight.offsetX, frameHalfH + 0.02, 0.01]}
                    color={sight.color} metalness={0.5} roughness={0.3} />
            )}

            {accentStripe.enabled && (
                <Panel geometry={stripeGeometry} position={[0, accentStripe.offsetY, 0.012]}
                    color={accentStripe.color} metalness={0.1} roughness={0.4} />
            )}

            {coreGlow.enabled && (
                <CoreGlow cfg={coreGlow} position={[coreGlow.offsetX, barrel.offsetY + (coreGlow.offsetY ?? 0), 0.02]} />
            )}

        </group>
    )
}