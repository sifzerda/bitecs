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
    new THREE.Color("#b89878"),  
    new THREE.Color("#a8846a"),  
    new THREE.Color("#928077"),  
    new THREE.Color("#7c6d63"),  
    new THREE.Color("#c0ac8c"),  
    new THREE.Color("#8f7d6f"),  
    new THREE.Color("#d0a878"),  
    new THREE.Color("#a3907a"),  
    new THREE.Color("#9a9a9e"),  
    new THREE.Color("#c4c4c8"),  
    new THREE.Color("#b8b8bc"),  
    new THREE.Color("#8a8a88"),  
    new THREE.Color("#a0a0a4"),  
    new THREE.Color("#b0b0b4"), 

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
                Math.sin(dir.x * 18.0 + dir.y * 7.0) * 0.05 +
                Math.sin(dir.y * 23.0 + dir.z * 11.0) * 0.04 +
                Math.sin(dir.z * 27.0 + dir.x * 13.0) * 0.035

            // spike is now purely a function of direction (no per-vertex
            // Math.random() gate). A random on/off per vertex is uncorrelated
            // with neighboring vertices, so it creates near-discontinuous
            // displacement between adjacent verts — that's what was folding
            // faces and inverting normals. This version still picks out a
            // sparse set of "peaks" via the sin curve's own shape, but it
            // varies smoothly across the surface instead of jumping.
            const spikeMask = Math.pow(
                Math.max(0, Math.sin(dir.x * 31.0 + dir.z * 17.0)),
                6.0
            )
            const spike = spikeMask * 0.06

            // clamp total displacement so no vertex can be pushed far enough,
            // relative to its neighbors, to fold the local surface over
            const noise = THREE.MathUtils.clamp(base + jagged + spike, -0.3, 0.3)

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
    // ------------------------------------------------------

    const asteroidMaterial = useMemo(() => {

        const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: true,
            roughness: 0.85,
            metalness: 0.15,
            emissive: "#7a6a5a",
            emissiveIntensity: 0.40,
            side: THREE.FrontSide,
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
        const healthAttr = asteroidGeometry.attributes.instanceHealth

        // Single pass: asteroid transform, health, bg bar, fg bar
        for (let i = 0; i < count; i++) {

            const eid = asteroids[i]
            const data = asteroidData[i]

            const x = Position.x[eid]
            const y = Position.y[eid]

            // --- asteroid instance matrix ---
            _pos.set(x, y, 0)

            data.rotation.x += data.spin.x * delta
            data.rotation.y += data.spin.y * delta
            data.rotation.z += data.spin.z * delta

            _rot.setFromEuler(data.rotation)
            _scale.setScalar(data.scale)

            _mat.compose(_pos, _rot, _scale)
            mesh.setMatrixAt(i, _mat)

            // --- health (computed once, used twice) ---
            const pct = Math.max(0, Health.current[eid] / Health.max[eid])
            healthAttr.array[i] = pct

            // --- health bar background (no rotation needed — skip compose) ---
            _barMat.makeScale(BAR_WIDTH, BAR_HEIGHT, 1)
            _barMat.setPosition(x, y + BAR_OFFSET, 0)
            bgBar.setMatrixAt(i, _barMat)

            // --- health bar fill ---
            const fillWidth = BAR_WIDTH * pct
            const offsetX = (BAR_WIDTH - fillWidth) * 0.5

            _barMat.makeScale(fillWidth, BAR_HEIGHT, 1)
            _barMat.setPosition(x - offsetX, y + BAR_OFFSET, 0.01)
            fgBar.setMatrixAt(i, _barMat)
        }

        healthAttr.needsUpdate = true

        mesh.instanceMatrix.needsUpdate = true
        mesh.count = count

        bgBar.instanceMatrix.needsUpdate = true
        bgBar.count = count

        fgBar.instanceMatrix.needsUpdate = true
        fgBar.count = count

    })

    return (
        <>
            {/* Asteroids */}
            <instancedMesh
                ref={meshRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}>

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