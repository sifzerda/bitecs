// src/renderers/LaserRenderer.jsx

import { useEffect, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { world } from "../ecs/constants/world.js"
import { laserState } from "../ecs/weapons/weaponState/laserState.js"
import { bossLaserState } from "../ecs/weapons/weaponState/bossLaserState.js"
import { startState } from "../state/startState.js"
import { getWeapon } from "../ecs/weapons/config/weapons.js"
import { bossAIQuery } from "../ecs/constants/queries.js"
import { BossAI } from "../ecs/constants/components.js"

const VERTEX_SHADER = /* glsl */ `
attribute vec2 aOrigin;
attribute vec2 aDirection;
attribute float aLength;
attribute float aWidth;

varying vec2 vUv;

void main() {
    vUv = uv;

    // Original beam plane extends from 0 to 1 along Y.
    vec2 local = vec2(
        position.x * aWidth,
        (position.y + 0.5) * aLength
    );

    // Direction is the world-space beam direction.
    vec2 worldPosition = aOrigin + vec2(
        local.x * aDirection.y + local.y * aDirection.x,
        -local.x * aDirection.x + local.y * aDirection.y
    );

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(worldPosition, 0.02, 1.0);
}
`

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float time;
uniform vec3 core;
uniform vec3 glow;
uniform float rainbow;

void main() {
    float d = abs(vUv.x - 0.5) * 2.0;

    float c = 1.0 - smoothstep(0.0, 0.12, d);
    float halo = exp(-d * 4.0);

    vec3 tint = glow;

    if (rainbow > 0.5) {
        tint = 0.5 + 0.5 * cos(
            vec3(0.0, 2.1, 4.2) +
            vUv.y * 8.0 -
            time * 2.0
        );
    }

    float pulse =
        0.9 +
        0.1 * sin(vUv.y * 30.0 - time * 15.0);

    float edge =
        smoothstep(0.0, 0.03, vUv.y) *
        (1.0 - smoothstep(0.97, 1.0, vUv.y));

    gl_FragColor = vec4(
        (core * c * 1.4 + tint * halo * pulse) * edge,
        (c + halo * 0.7) * edge
    );
}
`

function createGeometry(capacity) {
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

    for (const [name, size] of [
        ["aOrigin", 2],
        ["aDirection", 2],
        ["aLength", 1],
        ["aWidth", 1],
    ]) {
        geometry.setAttribute(
            name,
            new THREE.InstancedBufferAttribute(
                new Float32Array(capacity * size),
                size
            ).setUsage(THREE.DynamicDrawUsage)
        )
    }

    geometry.instanceCount = 0
    return geometry
}

export function LaserRenderer({ source = "player" }) {
    const laser =
        source === "boss"
            ? bossLaserState
            : laserState

    const capacity = laser.originX.length

    const geometry = useMemo(
        () => createGeometry(capacity),
        [capacity]
    )

    const material = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                core: { value: new THREE.Color() },
                glow: { value: new THREE.Color() },
                rainbow: { value: 0 },
            },
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
            blending: THREE.AdditiveBlending,
        }),
        []
    )

    const attributes = useMemo(() => ({
        origin: geometry.getAttribute("aOrigin"),
        direction: geometry.getAttribute("aDirection"),
        length: geometry.getAttribute("aLength"),
        width: geometry.getAttribute("aWidth"),
    }), [geometry])

    useEffect(() => {
        return () => {
            geometry.dispose()
            material.dispose()
        }
    }, [geometry, material])

    useFrame(() => {
        if (
            !laser.active ||
            startState.encounterPhase !== "active"
        ) {
            geometry.instanceCount = 0
            return
        }

        let weapon = null

        if (source === "player") {
            weapon = getWeapon(startState.currentWeapon)
        } else {
            const boss = bossAIQuery()[0]

            if (boss !== undefined) {
                weapon = getWeapon(BossAI.weapon[boss])
            }
        }

        if (
            !weapon ||
            weapon.category !== "beam" ||
            weapon.jagged
        ) {
            geometry.instanceCount = 0
            return
        }

        const origins = attributes.origin.array
        const directions = attributes.direction.array
        const lengths = attributes.length.array
        const widths = attributes.width.array

        const beamCount = Math.min(
            laser.beamCount,
            capacity
        )

        let count = 0

        for (let slot = 0; slot < beamCount; slot++) {
            const length = laser.hitT[slot]

            if (!(length > 0.01)) continue

            const dx = laser.dirX[slot]
            const dy = laser.dirY[slot]

            const magnitude = Math.hypot(dx, dy)

            if (!(magnitude > 1e-8)) continue

            const j = count * 2

            origins[j] = laser.originX[slot]
            origins[j + 1] = laser.originY[slot]

            directions[j] = dx / magnitude
            directions[j + 1] = dy / magnitude

            lengths[count] = length
            widths[count] = (weapon.beamWidth ?? 0.1) * 5

            count++
        }

        geometry.instanceCount = count

        if (!count) return

        material.uniforms.time.value = world.time.elapsed
        material.uniforms.core.value.set(
            weapon.color ?? "white"
        )
        material.uniforms.glow.value.set(
            weapon.glowColor ?? "white"
        )
        material.uniforms.rainbow.value =
            weapon.rainbow ? 1 : 0

        for (const [attribute, itemSize] of [
            [attributes.origin, 2],
            [attributes.direction, 2],
            [attributes.length, 1],
            [attributes.width, 1],
        ]) {
            attribute.clearUpdateRanges()
            attribute.addUpdateRange(0, count * itemSize)
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
