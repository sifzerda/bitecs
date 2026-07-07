// src/renderers/AsteroidRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { activeAsteroids } from '../ecs/pools/asteroidPool.js'
import { world } from '../ecs/constants/world.js'
import { Position, Health } from '../ecs/constants/components.js'

const MAX_ASTEROIDS = 64

// ------------------------------------------------------
const colours = [
    new THREE.Color("#b89878"), // sandstone
    new THREE.Color("#a8846a"), // brown
    new THREE.Color("#928077"), // slate
    new THREE.Color("#7c6d63"), // dark rock
    new THREE.Color("#c0ac8c"), // dusty tan
    new THREE.Color("#8f7d6f"), // basalt
    new THREE.Color("#d0a878"), // iron rich
    new THREE.Color("#a3907a"), // weathered
    new THREE.Color("#9a9a9e"), // steel grey
    new THREE.Color("#c4c4c8"), // pale stone
    new THREE.Color("#b8b8bc"), // silver
    new THREE.Color("#8a8a88"), // granite
    new THREE.Color("#a0a0a4"), // silver
    new THREE.Color("#b0b0b4"), // steel grey

]

// ------------------------------------------------------
// Scratch objects
// ------------------------------------------------------

const _mat = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _rot = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _euler = new THREE.Euler()

const _barMat = new THREE.Matrix4()
const _barPos = new THREE.Vector3()
const _barRot = new THREE.Quaternion()
const _barScale = new THREE.Vector3()

const BAR_WIDTH = 1.2
const BAR_HEIGHT = 0.12
const BAR_OFFSET = 0.9

// ------------------------------------------------------

export function AsteroidRenderer() {

    const meshRef = useRef()
    const bgBarRef = useRef()
    const fgBarRef = useRef()

    // ------------------------------------------------------
    // Geometry: crunchier, more angular deformation
    // ------------------------------------------------------

    const asteroidGeometry = useMemo(() => {

        const geo = new THREE.IcosahedronGeometry(0.55, 2)

        const pos = geo.attributes.position
        const v = new THREE.Vector3()

        for (let i = 0; i < pos.count; i++) {

            v.fromBufferAttribute(pos, i)

            const dir = v.clone().normalize()
            // low-frequency base shape (large bumps/dents)
           const base =
            Math.sin(dir.x * 2.3) * 0.22 +
            Math.sin(dir.y * 5.7) * 0.15 +
            Math.sin(dir.z * 9.1) * 0.10

        const jagged =
            Math.sin(dir.x * 18.0 + dir.y * 7.0) * 0.08 +
            Math.sin(dir.y * 23.0 + dir.z * 11.0) * 0.07 +
            Math.sin(dir.z * 27.0 + dir.x * 13.0) * 0.06

        // reduced from 0.12 and removed pow(3) — steep power curves are
        // what fold geometry into itself and invert normals
        const spike =
            Math.abs(Math.sin(dir.x * 31.0 + dir.z * 17.0)) * 0.05 *
            (Math.random() > 0.7 ? 1 : 0)

        const noise = base + jagged + spike

        v.multiplyScalar(1 + noise)

        pos.setXYZ(i, v.x, v.y, v.z)
        }

        geo.scale(
            0.9 + Math.random() * 0.3,
            0.9 + Math.random() * 0.3,
            0.9 + Math.random() * 0.3
        )

        // random orientation so the silhouette isn't aligned
        geo.rotateX(Math.random() * Math.PI * 2)
        geo.rotateY(Math.random() * Math.PI * 2)
        geo.rotateZ(Math.random() * Math.PI * 2)

        pos.needsUpdate = true
        geo.computeVertexNormals()

        // per-instance health attribute — driven each frame from Health.current/max,
        // read by the shader injection below to drive the damage glow
        geo.setAttribute(
            'instanceHealth',
            new THREE.InstancedBufferAttribute(new Float32Array(MAX_ASTEROIDS).fill(1), 1)
        )

        return geo

    }, [])

    // ------------------------------------------------------
    // Per-instance random data
    // ------------------------------------------------------

    const asteroidData = useMemo(() => {

        return Array.from({ length: MAX_ASTEROIDS }, () => {

            const scale = 0.8 + Math.random() * 0.7

            const spinScale = 0.35 / scale

            const color =
                colours[Math.floor(Math.random() * colours.length)].clone()

            // slight brightness variation
            color.offsetHSL(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.10,
                (Math.random() - 0.5) * 0.18
            )

            return {

                scale,

                rotation: new THREE.Euler(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2
                ),

                spin: new THREE.Vector3(
                    (Math.random() - 0.5) * spinScale,
                    (Math.random() - 0.5) * spinScale,
                    (Math.random() - 0.5) * spinScale
                ),

                color

            }

        })

    }, [])

    // ------------------------------------------------------
    // Custom shader material: standard PBR lighting kept intact via
    // onBeforeCompile, with rim lighting + health-driven damage glow injected
    // ------------------------------------------------------

    const asteroidMaterial = useMemo(() => {

        const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: true,
            roughness: 0.85,
            metalness: 0.15,
            emissive: "#7a6a5a",
            emissiveIntensity: 0.40,
            side: THREE.DoubleSide,
        })

        mat.onBeforeCompile = (shader) => {

            shader.uniforms.uTime = { value: 0 }

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `
                    #include <common>
                    attribute float instanceHealth;
                    varying float vHealth;
                    `
                )
                .replace(
                    '#include <begin_vertex>',
                    `
                    #include <begin_vertex>
                    vHealth = instanceHealth;
                    `
                )

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `
                    #include <common>
                    uniform float uTime;
                    varying float vHealth;
                    `
                )
                .replace(
                    '#include <emissivemap_fragment>',
                    `
                    #include <emissivemap_fragment>

                    // rim light — brighter glow toward the silhouette edge,
                    // uses the 'normal' + 'vViewPosition' already computed by this point
                    float rimDot = max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
                    float rim = pow(1.0 - rimDot, 2.5);

                    // damage glow — intensifies and pulses faster as health drops
                    float damage = 1.0 - clamp(vHealth, 0.0, 1.0);
                    float pulse = 0.6 + 0.4 * sin(uTime * (3.0 + damage * 10.0));
                    vec3 damageColor = mix(vec3(1.0, 0.5, 0.15), vec3(1.0, 0.12, 0.05), damage);

                    totalEmissiveRadiance += rim * vec3(0.55, 0.5, 0.45) * 0.6;
                    totalEmissiveRadiance += damageColor * damage * damage * pulse * 1.8;
                    `
                )

            mat.userData.shader = shader
        }

        return mat

    }, [])

    // ------------------------------------------------------
    // Assign instance colours once
    // ------------------------------------------------------

    const coloursAssigned = useRef(false)

    useFrame((state, delta) => {

        const mesh = meshRef.current
        const bgBar = bgBarRef.current
        const fgBar = fgBarRef.current

        if (!mesh || !bgBar || !fgBar) return

        if (!coloursAssigned.current) {
            asteroidData.forEach((a, i) => {
                mesh.setColorAt(i, a.color)
            })
            mesh.instanceColor.needsUpdate = true
            coloursAssigned.current = true
        }

        if (asteroidMaterial.userData.shader) {
            asteroidMaterial.userData.shader.uniforms.uTime.value = state.clock.elapsedTime
        }

        const asteroids = activeAsteroids
        const count = Math.min(asteroids.length, MAX_ASTEROIDS)
        
        // Asteroid meshes

        const healthAttr = asteroidGeometry.attributes.instanceHealth

        for (let i = 0; i < count; i++) {

            const eid = asteroids[i]
            const data = asteroidData[i]

            _pos.set(Position.x[eid], Position.y[eid], 0)

            data.rotation.x += data.spin.x * delta
            data.rotation.y += data.spin.y * delta
            data.rotation.z += data.spin.z * delta

            _euler.copy(data.rotation)
            _rot.setFromEuler(_euler)

            _scale.setScalar(data.scale)

            _mat.compose(_pos, _rot, _scale)
            mesh.setMatrixAt(i, _mat)

            healthAttr.array[i] = Math.max(0, Health.current[eid] / Health.max[eid])
        }

        healthAttr.needsUpdate = true

        _scale.set(0, 0, 0)
        _pos.set(0, 0, 0)


        mesh.instanceMatrix.needsUpdate = true
        mesh.count = count

        // Health Bar Background

        for (let i = 0; i < count; i++) {

            const eid = asteroids[i]

            _barPos.set(Position.x[eid], Position.y[eid] + BAR_OFFSET, 0)
            _barScale.set(BAR_WIDTH, BAR_HEIGHT, 1)
            _barMat.compose(_barPos, _barRot, _barScale)
            bgBar.setMatrixAt(i, _barMat)
        }

        _barPos.set(0, 0, 0)
        _barScale.set(0, 0, 0)

        bgBar.instanceMatrix.needsUpdate = true
        bgBar.count = count

        // Health Bar Fill

        for (let i = 0; i < count; i++) {

            const eid = asteroids[i]

            const pct = Math.max(0, Health.current[eid] / Health.max[eid])
            const fillWidth = BAR_WIDTH * pct
            const offsetX = (BAR_WIDTH - fillWidth) * 0.5

            _barPos.set(Position.x[eid] - offsetX, Position.y[eid] + BAR_OFFSET, 0.01)
            _barScale.set(fillWidth, BAR_HEIGHT, 1)
            _barMat.compose(_barPos, _barRot, _barScale)
            fgBar.setMatrixAt(i, _barMat)
        }

        _barPos.set(0, 0, 0)
        _barScale.set(0, 0, 0)

        fgBar.instanceMatrix.needsUpdate = true
        fgBar.count = count

    })

    return (
        <>
            {/* Asteroids */}
            <instancedMesh
                ref={meshRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}
                castShadow
                receiveShadow>

                <primitive
                    object={asteroidGeometry}
                    attach="geometry" />

                <primitive
                    object={asteroidMaterial}
                    attach="material" />

            </instancedMesh>

            {/* Health Bar Background */}
            <instancedMesh
                ref={bgBarRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                    color="red"
                    transparent
                    opacity={0.9} />
            </instancedMesh>

            {/* Health Bar Fill */}
            <instancedMesh
                ref={fgBarRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}>

                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#44ff88" />
            </instancedMesh>
        </>
    )
}