//src/renderers/AsteroidRenderer.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { asteroidQuery } from '../ecs/queries.js'
import * as THREE from 'three'
import { world } from '../ecs/world.js'
import { Position, Health, AsteroidTag } from '../ecs/components.js'

const MAX_ASTEROIDS = 64

// Scratch objects for enemy mesh
const _mat = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _rot = new THREE.Quaternion()
const _scale = new THREE.Vector3(1, 1, 1)
const _scaleOff = new THREE.Vector3(0, 0, 0)

// Scratch objects for health bars — separate so they don't interfere
const _barMat = new THREE.Matrix4()
const _barPos = new THREE.Vector3()
const _barRot = new THREE.Quaternion()
const _barScale = new THREE.Vector3(1, 1, 1)

const BAR_WIDTH = 1.2
const BAR_HEIGHT = 0.12
const BAR_OFFSET = 0.9  // how far above enemy center

export function AsteroidRenderer() {
    const meshRef = useRef()  // enemy body
    const bgBarRef = useRef()  // dark background bar
    const fgBarRef = useRef()  // green fill bar

    // Pre-allocate MAX_ASTEROIDS meshes in the group
    useFrame(() => {
        const mesh = meshRef.current
        const bgBar = bgBarRef.current
        const fgBar = fgBarRef.current
        if (!mesh || !bgBar || !fgBar) return

        const asteroids = asteroidQuery(world)

        // --- Enemy bodies ---
        for (let i = 0; i < asteroids.length; i++) {
            const eid = asteroids[i]
            _pos.set(Position.x[eid], Position.y[eid], 0)
            _mat.compose(_pos, _rot, _scale)
            mesh.setMatrixAt(i, _mat)
        }

        _pos.set(0, 0, 0)
        for (let i = asteroids.length; i < MAX_ASTEROIDS; i++) {
            _mat.compose(_pos, _rot, _scaleOff)
            mesh.setMatrixAt(i, _mat)
        }

        mesh.instanceMatrix.needsUpdate = true
        mesh.count = MAX_ASTEROIDS

        // --- Background bars ---
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

        // --- Foreground (fill) bars ---
        for (let i = 0; i < asteroids.length; i++) {
            const eid = asteroids[i]
            const pct = Math.max(0, Health.current[eid] / Health.max[eid])

            // Anchor fill bar to the left edge of the background bar
            const fillWidth = BAR_WIDTH * pct
            const offsetX = (BAR_WIDTH - fillWidth) / 2  // shift left to stay left-anchored

            _barPos.set(
                Position.x[eid] - offsetX,
                Position.y[eid] + BAR_OFFSET,
                0.01  // just in front of bg bar
            )
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
            {/* Enemy bodies */}
            <instancedMesh ref={meshRef} args={[null, null, MAX_ASTEROIDS]} frustumCulled={false}>
                <octahedronGeometry args={[0.5]} />
                <meshStandardMaterial color="#ff4466" emissive="#330011" />
            </instancedMesh>

            {/* Health bar background */}
            <instancedMesh ref={bgBarRef} args={[null, null, MAX_ASTEROIDS]} frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#333333" />
            </instancedMesh>

            {/* Health bar fill */}
            <instancedMesh ref={fgBarRef} args={[null, null, MAX_ASTEROIDS]} frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#44ff88" />
            </instancedMesh>
        </>
    )
}