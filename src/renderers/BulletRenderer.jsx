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
        const angle = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS), 1)
        const color = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS * 3), 3)

        position.setUsage(THREE.DynamicDrawUsage)
        angle.setUsage(THREE.DynamicDrawUsage)
        color.setUsage(THREE.DynamicDrawUsage)

        geo.setAttribute("instancePosition", position)
        geo.setAttribute("instanceAngle", angle)
        geo.setAttribute("instanceColor", color)

        geo.instanceCount = 0

        return geo

    }, [])

    const material = useMemo(() => {

        return new THREE.ShaderMaterial({

            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,

            vertexShader:/* glsl */`

attribute vec2 instancePosition;
attribute float instanceAngle;
attribute vec3 instanceColor;

varying vec2 vUv;
varying vec3 vColor;

void main(){

    vUv = uv;
    vColor = instanceColor;
    vec3 local = position;

    local.x *= ${BULLET_LENGTH.toFixed(2)};
    local.y *= ${BULLET_WIDTH.toFixed(2)};

    float c = cos(instanceAngle);
    float s = sin(instanceAngle);

    vec2 rotated = vec2(local.x*c - local.y*s, local.x*s + local.y*c);
    vec3 world = vec3(instancePosition + rotated, 0.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world,1.0);
}

`,

            fragmentShader:/* glsl */`

precision highp float;

varying vec2 vUv;
varying vec3 vColor;

void main(){

    float x = vUv.x;
    float y = vUv.y * 2.0 - 1.0;
    float width = 1.0 - smoothstep(0.18, 0.35, abs(y));
    float head = smoothstep(0.0, 0.15, x);
    float tail = 1.0 - smoothstep(0.75, 1.0, x);
    float body = width * head * tail;
    float glow = exp(-abs(y)*5.5);
    float halo = exp(-abs(y)*2.2);
    float alpha = clamp(body + glow*0.45 + halo*0.15, 0.0, 1.0);

    vec3 core = clamp(vColor*1.6, 0.0, 1.0);
    vec3 color = vColor * body * 1.15 + core   * body * 0.35 + vColor * glow * 0.55 + vColor * halo * 0.12;

    gl_FragColor = vec4(color, alpha);

}

`
        }) }, [])

    const buffers = useMemo(() => ({
        position: geometry.attributes.instancePosition,
        angle: geometry.attributes.instanceAngle,
        color: geometry.attributes.instanceColor
    }), [geometry])

    // cache weapon lookups
    const weaponCache = useMemo(() => new Array(64), [])

    useFrame(() => {

        const pos = buffers.position.array
        const ang = buffers.angle.array
        const col = buffers.color.array

        let count = 0

        for (let i = 0; i < activeBullets.length && count < MAX_BULLETS; i++) {

            const eid = activeBullets[i]
            let weapon = weaponCache[Bullet.type[eid]]

            if (!weapon) {
                weapon = WEAPONS[Bullet.type[eid]]
                weaponCache[Bullet.type[eid]] = weapon
            }

            // skip special projectiles
            if (!weapon || weapon.homing || weapon.explosive) {
                continue
            }

            const p = count * 2

            pos[p] = Position.x[eid]
            pos[p + 1] = Position.y[eid]

            ang[count] = Math.atan2(Velocity.y[eid], Velocity.x[eid])

            const c = count * 3

            col[c] = Bullet.colorR[eid]
            col[c + 1] = Bullet.colorG[eid]
            col[c + 2] = Bullet.colorB[eid]

            count++

        }

        geometry.instanceCount = count
        buffers.position.needsUpdate = true
        buffers.angle.needsUpdate = true
        buffers.color.needsUpdate = true

    })

    return (
        <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
    )

}