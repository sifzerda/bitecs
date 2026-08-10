// src/renderers/BulletRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Position, Velocity, Bullet } from '../ecs/constants/components.js'
import { WEAPONS } from '../ecs/weapons/config/weapons.js'
import { activeBullets } from '../ecs/pools/bulletPool.js'

const MAX_BULLETS = 512
const BULLET_LENGTH = 0.9
const BULLET_WIDTH = 0.18

export function BulletRenderer() {

    const meshRef = useRef()
    const geometry = useMemo(() => {
        const geo = new THREE.InstancedBufferGeometry()
        const plane = new THREE.PlaneGeometry(1, 1)

        geo.setIndex(plane.index)
        geo.setAttribute("position", plane.getAttribute("position"))
        geo.setAttribute("uv", plane.getAttribute("uv"))

        const position = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS * 2), 2)
        const dir = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS * 2), 2)
        const color = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS * 3), 3)

        position.setUsage(THREE.DynamicDrawUsage)
        dir.setUsage(THREE.DynamicDrawUsage)
        color.setUsage(THREE.DynamicDrawUsage)

        geo.setAttribute("instancePosition", position)
        geo.setAttribute("instanceDir", dir)
        geo.setAttribute("instanceColor", color)

        geo.instanceCount = 0

        return geo

    }, [])

    const material = useMemo(() => {

        return new THREE.ShaderMaterial({

            uniforms: { uTime: { value: 0 } },

            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,

            vertexShader:/* glsl */`

attribute vec2 instancePosition;
attribute vec2 instanceDir;
attribute vec3 instanceColor;

varying vec2 vUv;
varying vec3 vColor;
varying float vFlicker;

void main(){

    vUv = uv;
    vColor = instanceColor;

    float seed = fract(sin(dot(instancePosition, vec2(12.9898, 78.233))) * 43758.5453);
    vFlicker = 0.85 + seed * 0.3;

    vec3 local = position;

    local.x *= ${BULLET_LENGTH.toFixed(2)};
    local.y *= ${BULLET_WIDTH.toFixed(2)};

    vec2 rotated = vec2(local.x * instanceDir.x - local.y * instanceDir.y, local.x * instanceDir.y + local.y * instanceDir.x);
    vec3 world = vec3(instancePosition + rotated, 0.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world,1.0);
}

`,

            fragmentShader:/* glsl */`

precision highp float;

uniform float uTime;

varying vec2 vUv;
varying vec3 vColor;
varying float vFlicker;

void main(){

    float x = vUv.x;
    float y = vUv.y * 2.0 - 1.0;
    float ay = abs(y);

    float width = 1.0 - smoothstep(0.18, 0.35, ay);
    float tip = smoothstep(0.0, 0.16, x - ay*0.85);

    float tail = 1.0 - smoothstep(0.75, 1.0, x);
    float body = width * tip * tail;
    float glow = exp(-ay*5.5);
    float halo = exp(-ay*2.2);

    float coreLine = (1.0 - smoothstep(0.0, 0.06, ay)) * tip * tail;
    float alpha = clamp(body + glow*0.45 + halo*0.15 + coreLine*0.3, 0.0, 1.0);

    vec3 core = clamp(vColor*1.6, 0.0, 1.0);

    float vColorWeight = body*1.15 + glow*0.55 + halo*0.12;
    vec3 color = vColor * vColorWeight + core * body * 0.35 + core * coreLine * 0.5;

    float pulse = fract(x * 3.0 - uTime * 4.0);
    pulse = smoothstep(0.0, 0.4, pulse) * smoothstep(1.0, 0.6, pulse);
    color += vColor * pulse * 0.25 * tail * width;

    color *= vFlicker;

    gl_FragColor = vec4(color, alpha);

}

`
        })
    }, [])

    const buffers = useMemo(() => ({
        position: geometry.attributes.instancePosition,
        dir: geometry.attributes.instanceDir,
        color: geometry.attributes.instanceColor
    }), [geometry])

    // cache weapon lookups
    const weaponCache = useMemo(() => new Array(WEAPONS.length), [])

    useFrame((state) => {

        material.uniforms.uTime.value = state.clock.elapsedTime

        const pos = buffers.position.array
        const dir = buffers.dir.array
        const col = buffers.color.array

        let count = 0

        for (let i = 0; i < activeBullets.length && count < MAX_BULLETS; i++) {

            const eid = activeBullets[i]
            const type = Bullet.type[eid]
            let weapon = weaponCache[type]

            if (!weapon) {
                weapon = WEAPONS[type]
                weaponCache[type] = weapon
            }

            // skip special projectiles
            if (!weapon || weapon.homing || weapon.explosive) {
                continue
            }

            const p = count * 2

            pos[p] = Position.x[eid]
            pos[p + 1] = Position.y[eid]

            // Unit heading vector - equivalent to (cos, sin) of
            // atan2(vy, vx) but without calling atan2/cos/sin at all.
            const vx = Velocity.x[eid]
            const vy = Velocity.y[eid]
            const lenSq = vx * vx + vy * vy

            if (lenSq > 1e-8) {
                const invLen = 1 / Math.sqrt(lenSq)
                dir[p] = vx * invLen
                dir[p + 1] = vy * invLen
            } else {
                dir[p] = 1
                dir[p + 1] = 0
            }

            const c = count * 3

            col[c] = Bullet.colorR[eid]
            col[c + 1] = Bullet.colorG[eid]
            col[c + 2] = Bullet.colorB[eid]

            count++

        }

        geometry.instanceCount = count

        if (count > 0) {

            buffers.position.clearUpdateRanges()
            buffers.position.addUpdateRange(0, count * 2)

            buffers.dir.clearUpdateRanges()
            buffers.dir.addUpdateRange(0, count * 2)

            buffers.color.clearUpdateRanges()
            buffers.color.addUpdateRange(0, count * 3)

            buffers.position.needsUpdate = true
            buffers.dir.needsUpdate = true
            buffers.color.needsUpdate = true
        }

    })

    return (
        <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
    )

}