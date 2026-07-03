// src/renderers/SparkRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sparkQuery } from '../ecs/constants/queries.js'
import { Position } from '../ecs/constants/components.js'

const MAX_SPARKS = 400

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _rotationIdentity = new THREE.Quaternion()
const _scale = new THREE.Vector3(0.4, 0.4, 0.4)   // fixed, chunky, impossible to miss
const _scaleZero = new THREE.Vector3(0, 0, 0)

export function SparkRenderer() {

    const emberRef = useRef()
    const geometry = useMemo(() => new THREE.SphereGeometry(0.5, 5, 5), [])

    useFrame(() => {

        const ember = emberRef.current
        if (!ember) return

        const sparks = sparkQuery()

        // TEMP: confirm entities actually exist
        if (sparks.length > 0) console.log('sparks:', sparks.length)

        const count = Math.min(sparks.length, MAX_SPARKS)

        for (let i = 0; i < count; i++) {
            const id = sparks[i]
            _position.set(Position.x[id], Position.y[id], 0.5)   // pushed toward camera, can't be occluded
            _matrix.compose(_position, _rotationIdentity, _scale)
            ember.setMatrixAt(i, _matrix)
        }

        for (let i = count; i < MAX_SPARKS; i++) {
            _matrix.compose(_position.set(0, 0, 0), _rotationIdentity, _scaleZero)
            ember.setMatrixAt(i, _matrix)
        }

        ember.instanceMatrix.needsUpdate = true
        ember.count = MAX_SPARKS
    })

    return (
        <instancedMesh ref={emberRef} args={[null, null, MAX_SPARKS]} frustumCulled={false}>
            <primitive object={geometry} attach="geometry" />
            <meshBasicMaterial color="magenta" />
        </instancedMesh>
    )
}