// src/renderers/AsteroidRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { asteroidQuery } from '../ecs/queries.js'
import { world } from '../ecs/world.js'
import { Position, Health } from '../ecs/components.js'

const MAX_ASTEROIDS = 64

// More varied, realistic rock tones — grays, tans, dark browns
const colours = [
    new THREE.Color("#5a5752"),
    new THREE.Color("#6b6560"),
    new THREE.Color("#4e4b46"),
    new THREE.Color("#7a7068"),
    new THREE.Color("#3e3c38"),
    new THREE.Color("#635e58"),
    new THREE.Color("#8a7f74"),
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

        const geo = new THREE.IcosahedronGeometry(0.55, 3)

        const pos = geo.attributes.position
        const v = new THREE.Vector3()

        for (let i = 0; i < pos.count; i++) {

            v.fromBufferAttribute(pos, i)

            const dir = v.clone().normalize()

            // Higher frequency + stronger amplitude = chunkier, craggier rock
            const noise =
                Math.sin(dir.x * 5.1) * 0.20 +
                Math.sin(dir.y * 6.3) * 0.18 +
                Math.sin(dir.z * 4.7) * 0.22 +
                Math.sin(dir.x * 2.3 + dir.z * 3.1) * 0.10 +   // cross-term for asymmetry
                Math.sin(dir.y * 7.8 + dir.x * 1.9) * 0.08

            const scale = 1 + noise

            v.multiplyScalar(scale)

            pos.setXYZ(i, v.x, v.y, v.z)
        }

        pos.needsUpdate = true
        geo.computeVertexNormals()

        return geo

    }, [])

    // ------------------------------------------------------
    // Per-instance random data
    // ------------------------------------------------------

    const asteroidData = useMemo(() => {

        return Array.from({ length: MAX_ASTEROIDS }, () => ({

            scale: 0.8 + Math.random() * 0.7,

            rotation: new THREE.Euler(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            ),

            // Slightly slower spin — heavy rocks feel more massive
            spin: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            ),

            color: colours[Math.floor(Math.random() * colours.length)].clone()

        }))

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

        const asteroids = asteroidQuery(world)

        // Asteroid meshes

        for (let i = 0; i < asteroids.length; i++) {

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
        }

        _scale.set(0, 0, 0)
        _pos.set(0, 0, 0)

        for (let i = asteroids.length; i < MAX_ASTEROIDS; i++) {
            _mat.compose(_pos, _rot, _scale)
            mesh.setMatrixAt(i, _mat)
        }

        mesh.instanceMatrix.needsUpdate = true
        mesh.count = MAX_ASTEROIDS

        // Health Bar Background

        for (let i = 0; i < asteroids.length; i++) {

            const eid = asteroids[i]

            _barPos.set(Position.x[eid], Position.y[eid] + BAR_OFFSET, 0)
            _barScale.set(BAR_WIDTH, BAR_HEIGHT, 1)
            _barMat.compose(_barPos, _barRot, _barScale)
            bgBar.setMatrixAt(i, _barMat)
        }

        _barPos.set(0, 0, 0)
        _barScale.set(0, 0, 0)

        for (let i = asteroids.length; i < MAX_ASTEROIDS; i++) {
            _barMat.compose(_barPos, _barRot, _barScale)
            bgBar.setMatrixAt(i, _barMat)
        }

        bgBar.instanceMatrix.needsUpdate = true
        bgBar.count = MAX_ASTEROIDS

        // Health Bar Fill

        for (let i = 0; i < asteroids.length; i++) {

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

        for (let i = asteroids.length; i < MAX_ASTEROIDS; i++) {
            _barMat.compose(_barPos, _barRot, _barScale)
            fgBar.setMatrixAt(i, _barMat)
        }

        fgBar.instanceMatrix.needsUpdate = true
        fgBar.count = MAX_ASTEROIDS

    })

    return (
        <>
            {/* Asteroids */}
            <instancedMesh
                ref={meshRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}
                castShadow
                receiveShadow
            >
                <primitive
                    object={asteroidGeometry}
                    attach="geometry"
                />

                <meshStandardMaterial
                    vertexColors
                    color="red"
                    roughness={0.85}
                    metalness={0.0}
                    emissive="white"
                    emissiveIntensity={0.1}
                />
            </instancedMesh>

            {/* Health Bar Background */}
            <instancedMesh
                ref={bgBarRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}
            >
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                    color="red"
                    transparent
                    opacity={0.9}
                />
            </instancedMesh>

            {/* Health Bar Fill */}
            <instancedMesh
                ref={fgBarRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}
            >
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#44ff88" />
            </instancedMesh>
        </>
    )
}