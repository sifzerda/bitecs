// src/renderers/UfoRenderer.jsx

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ufoQuery } from '../ecs/constants/queries'
import { Position, UfoHealth } from '../ecs/components'

const MAX_UFOS = 4

const _barMat = new THREE.Matrix4()
const _barPos = new THREE.Vector3()
const _barRot = new THREE.Quaternion()
const _barScale = new THREE.Vector3()

const BAR_WIDTH = 1.8
const BAR_HEIGHT = 0.16
const BAR_OFFSET = 1.3 // higher than asteroid bars since UFO is bigger

export function UfoRenderer() {
    const domeRef = useRef()
    const saucerRef = useRef()
    const ringRef = useRef()
    const bgBarRef = useRef()
    const fgBarRef = useRef()
    const dummy = useRef(new THREE.Object3D()).current

    const phases = useMemo(() => Array.from({ length: MAX_UFOS }, () => Math.random() * Math.PI * 2), [])

    useFrame((state) => {
        const ufos = ufoQuery()
        const dome = domeRef.current
        const saucer = saucerRef.current
        const ring = ringRef.current
        const bgBar = bgBarRef.current
        const fgBar = fgBarRef.current
        if (!dome || !saucer || !ring || !bgBar || !fgBar) return

        const t = state.clock.elapsedTime

        for (let i = 0; i < ufos.length; i++) {
            const id = ufos[i]
            const phase = phases[i % MAX_UFOS]

            const baseX = Position.x[id]
            const baseY = Position.y[id]

            const bob = Math.sin(t * 1.6 + phase) * 0.15
            const x = baseX
            const y = baseY + bob

            const spin = t * 0.6 + phase

            dummy.position.set(x, y, 0.05)
            dummy.rotation.set(0, 0, 0)
            dummy.scale.setScalar(1.4)
            dummy.updateMatrix()
            dome.setMatrixAt(i, dummy.matrix)

            dummy.position.set(x, y, 0)
            dummy.rotation.set(0, 0, spin)
            dummy.scale.setScalar(1.4)
            dummy.updateMatrix()
            saucer.setMatrixAt(i, dummy.matrix)

            dummy.position.set(x, y, -0.02)
            dummy.rotation.set(0, 0, -spin * 1.4)
            dummy.scale.setScalar(1.55)
            dummy.updateMatrix()
            ring.setMatrixAt(i, dummy.matrix)
        }

        dome.count = ufos.length
        saucer.count = ufos.length
        ring.count = ufos.length

        dome.instanceMatrix.needsUpdate = true
        saucer.instanceMatrix.needsUpdate = true
        ring.instanceMatrix.needsUpdate = true

        // Health Bar Background

        for (let i = 0; i < ufos.length; i++) {
            const id = ufos[i]

            _barPos.set(Position.x[id], Position.y[id] + BAR_OFFSET, 0)
            _barScale.set(BAR_WIDTH, BAR_HEIGHT, 1)
            _barMat.compose(_barPos, _barRot, _barScale)
            bgBar.setMatrixAt(i, _barMat)
        }

        _barPos.set(0, 0, 0)
        _barScale.set(0, 0, 0)

        bgBar.instanceMatrix.needsUpdate = true
        bgBar.count = ufos.length

        // Health Bar Fill

        for (let i = 0; i < ufos.length; i++) {
            const id = ufos[i]

            const pct = Math.max(0, UfoHealth.current[id] / UfoHealth.max[id])
            const fillWidth = BAR_WIDTH * pct
            const offsetX = (BAR_WIDTH - fillWidth) * 0.5

            _barPos.set(Position.x[id] - offsetX, Position.y[id] + BAR_OFFSET, 0.01)
            _barScale.set(fillWidth, BAR_HEIGHT, 1)
            _barMat.compose(_barPos, _barRot, _barScale)
            fgBar.setMatrixAt(i, _barMat)
        }

        _barPos.set(0, 0, 0)
        _barScale.set(0, 0, 0)

        fgBar.instanceMatrix.needsUpdate = true
        fgBar.count = ufos.length
    })

    return (
        <>
            <instancedMesh ref={saucerRef} args={[null, null, MAX_UFOS]} frustumCulled={false}>
                <cylinderGeometry args={[0.7, 0.45, 0.18, 16]} />
                <meshStandardMaterial
                    color="#1a3a2e"
                    emissive="#39FF14"
                    emissiveIntensity={0.25}
                    metalness={0.7}
                    roughness={0.25}
                />
            </instancedMesh>

            <instancedMesh ref={domeRef} args={[null, null, MAX_UFOS]} frustumCulled={false}>
                <sphereGeometry args={[0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial
                    color="#7CFC00"
                    emissive="#39FF14"
                    emissiveIntensity={0.9}
                    metalness={0.2}
                    roughness={0.1}
                    transparent
                    opacity={0.85}
                />
            </instancedMesh>

            <instancedMesh ref={ringRef} args={[null, null, MAX_UFOS]} frustumCulled={false}>
                <torusGeometry args={[0.72, 0.035, 8, 24]} />
                <meshStandardMaterial
                    color="#39FF14"
                    emissive="#39FF14"
                    emissiveIntensity={1.6}
                    toneMapped={false}
                />
            </instancedMesh>

            {/* Health Bar Background */}
            <instancedMesh ref={bgBarRef} args={[null, null, MAX_UFOS]} frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="red" transparent opacity={0.9} />
            </instancedMesh>

            {/* Health Bar Fill */}
            <instancedMesh ref={fgBarRef} args={[null, null, MAX_UFOS]} frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#44ff88" />
            </instancedMesh>
        </>
    )
}