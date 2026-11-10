// src/renderers/BulletRenderer.jsx

import { useEffect, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import {
    Position,
    Velocity,
    Bullet,
} from "../ecs/constants/components.js"

import { WEAPONS } from "../ecs/weapons/config/weapons.js"
import { activeBullets } from "../ecs/pools/bulletPool.js"

const MAX_BULLETS = 2000
const BULLET_LENGTH = 1.0
const BULLET_WIDTH = 0.2

const VERTEX_SHADER = /* glsl */ `
attribute vec2 instancePosition;
attribute vec2 instanceDir;
attribute vec3 instanceColor;

varying vec2 vUv;
varying vec3 vColor;
varying float vFlicker;

void main() {
    vUv = uv;
    vColor = instanceColor;

    float seed = fract(
        sin(dot(instancePosition, vec2(12.9898, 78.233))) *
        43758.5453
    );

    vFlicker = 0.85 + seed * 0.3;

    vec2 local = position.xy * vec2(
        ${BULLET_LENGTH.toFixed(2)},
        ${BULLET_WIDTH.toFixed(2)}
    );

    vec2 rotated = vec2(
        local.x * instanceDir.x - local.y * instanceDir.y,
        local.x * instanceDir.y + local.y * instanceDir.x
    );

    vec3 worldPosition = vec3(
        instancePosition + rotated,
        0.0
    );

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(worldPosition, 1.0);
}
`

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform float uTime;

varying vec2 vUv;
varying vec3 vColor;
varying float vFlicker;

void main() {
    float x = vUv.x;
    float y = vUv.y * 2.0 - 1.0;
    float ay = abs(y);

    float width = 1.0 - smoothstep(0.18, 0.35, ay);
    float tip = smoothstep(0.0, 0.16, x - ay * 0.85);
    float tail = 1.0 - smoothstep(0.75, 1.0, x);

    float body = width * tip * tail;
    float glow = exp(-ay * 5.5);
    float halo = exp(-ay * 2.2);

    float coreLine =
        (1.0 - smoothstep(0.0, 0.06, ay)) *
        tip *
        tail;

    float alpha = clamp(
        body +
        glow * 0.45 +
        halo * 0.15 +
        coreLine * 0.3,
        0.0,
        1.0
    );

    vec3 core = clamp(vColor * 1.6, 0.0, 1.0);

    float colorWeight =
        body * 1.15 +
        glow * 0.55 +
        halo * 0.12;

    vec3 color =
        vColor * colorWeight +
        core * body * 0.35 +
        core * coreLine * 0.5;

    float pulse = fract(x * 3.0 - uTime * 4.0);

    pulse =
        smoothstep(0.0, 0.4, pulse) *
        (1.0 - smoothstep(0.6, 1.0, pulse));

    color +=
        vColor *
        pulse *
        0.25 *
        tail *
        width;

    color *= vFlicker;

    gl_FragColor = vec4(color, alpha);
}
`

function createGeometry() {
    const plane = new THREE.PlaneGeometry(1, 1)
    const geometry = new THREE.InstancedBufferGeometry()

    geometry.setIndex(plane.index.clone())
    geometry.setAttribute(
        "position",
        plane.getAttribute("position").clone()
    )
    geometry.setAttribute(
        "uv",
        plane.getAttribute("uv").clone()
    )

    plane.dispose()

    const attributes = [
        ["instancePosition", 2],
        ["instanceDir", 2],
        ["instanceColor", 3],
    ]

    for (const [name, itemSize] of attributes) {
        const attribute = new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_BULLETS * itemSize),
            itemSize
        )

        attribute.setUsage(THREE.DynamicDrawUsage)
        geometry.setAttribute(name, attribute)
    }

    geometry.instanceCount = 0
    return geometry
}

export function BulletRenderer() {
    const geometry = useMemo(createGeometry, [])

    const material = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
            },
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        }),
        []
    )

    const attributes = useMemo(() => ({
        position: geometry.getAttribute("instancePosition"),
        direction: geometry.getAttribute("instanceDir"),
        color: geometry.getAttribute("instanceColor"),
    }), [geometry])

    const weaponCache = useMemo(
        () => new Array(WEAPONS.length),
        []
    )

    useEffect(() => {
        return () => {
            geometry.dispose()
            material.dispose()
        }
    }, [geometry, material])

    useFrame((state) => {
        material.uniforms.uTime.value =
            state.clock.elapsedTime

        const positions = attributes.position.array
        const directions = attributes.direction.array
        const colors = attributes.color.array

        let count = 0

        for (
            let i = 0;
            i < activeBullets.length && count < MAX_BULLETS;
            i++
        ) {
            const id = activeBullets[i]
            const type = Bullet.type[id]

            let weapon = weaponCache[type]

            if (!weapon) {
                weapon = WEAPONS[type]
                weaponCache[type] = weapon
            }

            if (
                !weapon ||
                weapon.homing ||
                weapon.explosive
            ) {
                continue
            }

            const p = count * 2

            positions[p] = Position.x[id]
            positions[p + 1] = Position.y[id]

            const vx = Velocity.x[id]
            const vy = Velocity.y[id]
            const lengthSq = vx * vx + vy * vy

            if (lengthSq > 1e-8) {
                const inverseLength =
                    1 / Math.sqrt(lengthSq)

                directions[p] = vx * inverseLength
                directions[p + 1] = vy * inverseLength
            } else {
                directions[p] = 1
                directions[p + 1] = 0
            }

            const c = count * 3

            colors[c] = Bullet.colorR[id]
            colors[c + 1] = Bullet.colorG[id]
            colors[c + 2] = Bullet.colorB[id]

            count++
        }

        geometry.instanceCount = count

        if (count === 0) return

        const updated = [
            [attributes.position, count * 2],
            [attributes.direction, count * 2],
            [attributes.color, count * 3],
        ]

        for (const [attribute, length] of updated) {
            attribute.clearUpdateRanges()
            attribute.addUpdateRange(0, length)
            attribute.needsUpdate = true
        }
    })

    return (
        <mesh
            geometry={geometry}
            material={material}
            frustumCulled={false}
        />
    )
}
